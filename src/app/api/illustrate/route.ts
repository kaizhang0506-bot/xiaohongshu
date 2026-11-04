import { NextRequest, NextResponse } from 'next/server';
import {
  ImageGenerationClient,
  LLMClient,
  Config,
  HeaderUtils,
  type ContentPart,
  type Message,
} from 'coze-coding-dev-sdk';
import {
  DEFAULT_IMAGE_RELAY_BASE_URL,
  RELAY_IMAGE_SIZE,
  getImageModel,
  isRelayImageModel,
  sanitizeDeepseekBaseUrl,
} from '@/lib/model';

export const maxDuration = 150;

/** 3:4 比例的自定义尺寸需在 [2560x1440, 4096x4096] 范围内 */
const PORTRAIT_SIZE = '2560x3413';
const FALLBACK_SIZE = '2K';

/** 第一阶段：用轻量文本模型把笔记内容转写为「具体的绘画画面描述」 */
const PROMPT_MODEL_ID = 'doubao-seed-2-0-mini-260215';

interface IllustrateBody {
  relayKey?: string;
  relayBaseUrl?: string;
  title?: string;
  summary?: string;
  /** 笔记正文（用于理解主题，画面的相关性由它决定） */
  body?: string;
  /** 笔记话题标签 */
  tags?: string[];
  layout?: string;
  /** 选用的配图模型 ID（lib/model.ts 清单内），缺省用默认模型 */
  modelId?: string;
  /** 工作台上传的参考图（dataURL，最多 3 张），用于锁定封面主体 */
  refImages?: string[];
  /** 卡片角色：封面需底部留白叠标题；内容页/结尾页主体居中（画面会被居中裁为横幅） */
  pageRole?: 'cover' | 'content' | 'end';
  /** 该卡片自身的标题（内容页小标题/结尾页致谢语），缺省回退笔记标题 */
  pageTitle?: string;
  /** 该卡片自身的正文段落（内容页句子），让画面与单页内容强相关 */
  pageText?: string;
}

type PageRole = 'cover' | 'content' | 'end';

/** 不同角色卡片的构图指引（覆盖画面描述与最终提示词两处） */
const ROLE_COMPOSITION: Record<PageRole, string> = {
  cover:
    '主体位于画面上半部分约占一半面积，画面底部约三分之一为虚化背景或干净留白（后期会叠加标题文字）',
  content:
    '主体位于画面正中央并占约一半面积，四周保留均匀边距（后期会被居中裁切为横向横幅），关键元素不得贴边',
  end: '主体位于画面正中央，四周保留均匀边距（后期会被居中裁切为横向横幅），氛围温暖收尾感，关键元素不得贴边',
};

/** 真实摄影感总纲：所有配图必须像实拍照片，杜绝插画/手绘/CG感 */
const PHOTO_REALISM =
  '真实摄影质感：像用高端相机实拍的高清照片，物体材质纹理真实细腻（果蔬的水珠、食物的油光、织物的纤维、金属的光泽），光线自然，有真实的浅景深背景虚化；绝对不要插画、手绘、卡通、动漫、3D渲染、CG、绘画笔触感';

/** 各排版模板对应的摄影风格基调（与 lib/options.ts 的排版模板对应） */
const LAYOUT_IMAGE_STYLE: Record<string, string> = {
  minimal:
    '极简主义实拍风格，浅色干净背景，柔和均匀的自然光，主体清爽突出，大量高级留白',
  magazine:
    '高级杂志实拍风格，柔和侧逆光，低饱和暖调，讲究的构图与景深，精致的生活气息',
  journal:
    '明亮温馨的生活实拍，奶油色调，自然窗光，柔和暖色氛围，真实亲切的日常感',
  pop: '时尚大片实拍风格，高饱和明快色彩，鲜明撞色背景，紧凑利落的构图，视觉冲击力强',
  dark: '深色背景高级实拍风格，低调布光，暗金光泽点缀，电影感光影，神秘奢华氛围',
  polaroid: '复古宝丽来相片质感，柔和自然光，轻微暖色偏移，真实胶片颗粒感，生活化随拍视角',
  terminal: '冷色调科技感实拍，深色背景中主体被局部光打亮，屏幕微光或霓虹点缀，干净锐利的现代感',
  newspaper: '黑白纪实摄影风格，高对比明暗，硬朗光影，新闻现场感，银盐颗粒质感',
  sakura: '樱花粉色调实拍，柔和散射光，梦幻粉嫩氛围，甜美干净的小清新画面',
  mint: '薄荷绿清爽色调实拍，明亮的自然光，清透干净的画面，夏日般的清新氛围',
  blueprint: '蓝色调工程蓝图氛围，结构感强的俯拍构图，整齐的几何线条，严谨冷静的画面',
  sticky: '温暖的生活角落实拍，黄色暖光氛围，桌面小物随拍视角，亲切随性的日常感',
  ink: '极简东方美学实拍，宣纸色调的浅色背景，大面积留白，一枝一物的禅意构图，柔和顶光',
  sunset: '落日暖调实拍，橙红渐变天空氛围，逆光剪影感，温暖浓郁的电影色调',
  taro: '香芋紫柔色调实拍，柔和均匀的浅色环境，奶油般细腻的质感，安静优雅的氛围',
  pixel: '霓虹复古街机氛围实拍，深色背景配合霓虹灯色彩，像素游戏厅的怀旧光影',
};

const DEFAULT_IMAGE_STYLE = LAYOUT_IMAGE_STYLE.minimal;

const NO_TEXT_RULE =
  '画面中绝对不能出现任何文字、汉字、字母、数字、水印、Logo、签名、对话框、UI元素和边框装饰';

const PROMPT_SYSTEM = [
  '你是小红书财经科普图文卡片的摄影提示词专家。根据用户提供的卡片内容（可能附有参考图），写一段 80-140 字的「摄影画面描述」，用于生成一张竖版 3:4 的财经笔记配图照片。',
  '要求：',
  '1. 画面主体必须与「本页内容」强相关且具象：优先使用财经元素表达主题（硬币、纸币、钱包、存钱罐、计算器、天平、上升的曲线图、城市金融天际线、超市货架价签、账单发票等），也可用内容中提到的具体生活场景；避免真人面部特写。',
  '2. 若提供了参考图：参考图中的主体/产品就是这篇笔记的主角，必须先识别它是什么（品类、形态、颜色、质感、包装细节），配图照片必须呈现与参考图一致的同类主体，不得替换成无关事物。',
  `3. ${PHOTO_REALISM}。`,
  '4. 严格遵守用户给定的「构图指引」。',
  '5. 描述光线、色彩、质感与氛围，符合小红书热门封面的实拍审美：干净、明亮、有氛围感、让人物/食物/场景本身说话。',
  '6. 必须遵守用户给定的「风格基调」。',
  `7. ${NO_TEXT_RULE}。`,
  '只输出画面描述本身，不要任何前缀、解释、引号或分点符号。',
].join('\n');

/** 第一阶段：文本模型依据单页卡片内容（可含参考图）产出具体画面描述 */
async function describeScene(
  headers: Headers,
  body: string,
  tags: string[],
  style: string,
  refImages: string[],
  role: PageRole,
  pageTitle: string,
  pageText: string,
): Promise<string | null> {
  try {
    const config = new Config();
    const client = new LLMClient(config, HeaderUtils.extractForwardHeaders(headers));
    const roleLabel =
      role === 'cover' ? '封面' : role === 'end' ? '结尾致谢页' : '内容页';
    const textContent = [
      `本次为「${roleLabel}」卡片配图。`,
      pageTitle ? `本页标题：${pageTitle}` : '',
      pageText ? `本页内容：${pageText.slice(0, 260)}` : '',
      refImages.length > 0
        ? `参考图共 ${refImages.length} 张，为主体识别与画面描述的依据。`
        : '',
      body ? `笔记全文（供理解上下文）：${body.slice(0, 400)}` : '',
      tags.length > 0 ? `话题标签：${tags.slice(0, 10).join('、')}` : '',
      `风格基调：${style}`,
      `构图指引：${ROLE_COMPOSITION[role]}。`,
    ]
      .filter(Boolean)
      .join('\n');
    // 有参考图时走多模态消息（图片在前，文本在后）
    const parts: ContentPart[] = [
      ...refImages.map((url) => ({
        type: 'image_url' as const,
        image_url: { url },
      })),
      { type: 'text' as const, text: textContent },
    ];
    const messages: Message[] = [
      { role: 'system', content: PROMPT_SYSTEM },
      { role: 'user', content: parts },
    ];
    const response = await client.invoke(messages, {
      model: PROMPT_MODEL_ID,
      thinking: 'disabled',
      temperature: 0.7,
    });
    const content = (response.content ?? '').trim();
    // 简单清洗：去掉模型可能加的引号包裹
    const cleaned = content.replace(/^["'「」]+|["'「」]+$/g, '');
    return cleaned.length >= 20 ? cleaned : null;
  } catch (error) {
    console.warn('[api/illustrate] describeScene fallback:', error);
    return null;
  }
}

/** 第二阶段：拼装最终绘画提示词（描述 + 摄影质感 + 风格基调 + 构图 + 禁止文字） */
function buildPrompt(
  title: string,
  summary: string,
  body: string,
  tags: string[],
  layout: string,
  role: PageRole,
  pageText: string,
): string {
  const style = LAYOUT_IMAGE_STYLE[layout] ?? DEFAULT_IMAGE_STYLE;
  const context = pageText || body || summary;
  return [
    `为小红书图文卡片生成一张竖版 3:4 配图照片，笔记主题：「${title}」`,
    `，本页内容要点：${(context || title).slice(0, 80)}。`,
    `画面风格：${style}。`,
    `要求：${PHOTO_REALISM}。`,
    `构图：${ROLE_COMPOSITION[role]}，色彩真实自然，画面干净。`,
    `${NO_TEXT_RULE}。`,
  ].join('');
}

/** 依据二进制魔数判断真实图片 MIME（中转站 CDN 可能返回 octet-stream） */
function sniffMime(buffer: Buffer, fallback: string): string {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return fallback.startsWith('image/') ? fallback : 'image/png';
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') ?? 'image/png';
    const mime = sniffMime(buffer, contentType);
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * 中转站生图通道（OpenAI 兼容 /images/generations）
 * 服务端预配置密钥：IMAGE_API_KEY 优先，缺省复用 DEEPSEEK_API_KEY
 */
async function generateViaRelay(
  prompt: string,
  modelId: string,
  relayKey?: string,
  relayBaseUrl?: string,
): Promise<string | null> {
  const apiKey = (relayKey || process.env.IMAGE_API_KEY || process.env.DEEPSEEK_API_KEY || '').trim();
  if (!apiKey) {
    console.warn('[api/illustrate] relay 图像通道缺少密钥配置');
    return null;
  }
  const baseUrl = sanitizeDeepseekBaseUrl(
    relayBaseUrl || process.env.IMAGE_BASE_URL ||
      process.env.DEEPSEEK_BASE_URL ||
      DEFAULT_IMAGE_RELAY_BASE_URL,
  );
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        prompt,
        n: 1,
        size: RELAY_IMAGE_SIZE,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.warn(
        '[api/illustrate] relay 生图失败:',
        res.status,
        detail.slice(0, 300),
      );
      return null;
    }
    const payload = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const item = payload.data?.[0];
    if (item?.b64_json) {
      const mime = item.b64_json.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
      return `data:${mime};base64,${item.b64_json}`;
    }
    if (item?.url) {
      return await fetchAsDataUrl(item.url);
    }
    console.warn('[api/illustrate] relay 生图返回为空');
    return null;
  } catch (error) {
    console.warn('[api/illustrate] relay 生图异常:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as IllustrateBody;
    const title = (body.title ?? '').trim();
    const summary = (body.summary ?? '').trim().slice(0, 120);
    const noteBody = (body.body ?? '').trim();
    const tags = Array.isArray(body.tags) ? body.tags : [];
    const layout = (body.layout ?? '').trim();
    // 参考图消毒：仅接受 dataURL 形式的图片，最多 3 张
    const refImages = Array.isArray(body.refImages)
      ? body.refImages
          .filter(
            (item): item is string =>
              typeof item === 'string' && item.startsWith('data:image/'),
          )
          .slice(0, 3)
      : [];

    if (!title) {
      return NextResponse.json(
        { error: '缺少标题，无法生成配图' },
        { status: 400 },
      );
    }

    const style = LAYOUT_IMAGE_STYLE[layout] ?? DEFAULT_IMAGE_STYLE;
    const role: PageRole =
      body.pageRole === 'content' || body.pageRole === 'end'
        ? body.pageRole
        : 'cover';
    const pageTitle = (body.pageTitle ?? '').trim() || title;
    const pageText = (body.pageText ?? '').trim();
    // 第一阶段：让文本模型读懂单页内容与参考图，写出与主题强相关的摄影画面描述
    const scene = await describeScene(
      request.headers,
      noteBody,
      tags,
      style,
      refImages,
      role,
      pageTitle,
      pageText,
    );
    // 描述不可用时回退到模板提示词（保证功能可用性）
    const prompt =
      scene
        ? `${scene}。${style}。${PHOTO_REALISM}。${ROLE_COMPOSITION[role]}。${NO_TEXT_RULE}。`
        : buildPrompt(pageTitle, summary, noteBody, tags, layout, role, pageText);

    // 解析所选配图模型（白名单校验，未命中回退默认）
    const model = getImageModel(body.modelId);

    // 中转站通道（如 gpt-image-2.5-sunburst）：OpenAI 兼容 /images/generations
    if (isRelayImageModel(model)) {
      const relayImage = await generateViaRelay(prompt, model.id, body.relayKey, body.relayBaseUrl);
      if (relayImage) {
        return NextResponse.json({ image: relayImage, scene });
      }
      return NextResponse.json(
        { error: '配图生成失败，请稍后重试或切换其他配图模型' },
        { status: 502 },
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    const base = {
      prompt,
      model: model.id,
      watermark: false,
      responseFormat: 'b64_json' as const,
    };

    let response;
    try {
      response = await client.generate({ ...base, size: PORTRAIT_SIZE });
    } catch {
      // 非法尺寸等场景降级为标准 2K
      response = await client.generate({ ...base, size: FALLBACK_SIZE });
    }

    const helper = client.getResponseHelper(response);
    if (helper.success) {
      // 优先取 b64；若返回的是 URL 则下载转为 dataURL（html2canvas 截图需要）
      const b64 = helper.imageB64List?.[0];
      if (b64) {
        // /9j/ 为 JPEG 魔数前缀，按实际格式声明 MIME
        const mime = b64.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
        return NextResponse.json({
          image: `data:${mime};base64,${b64}`,
          /** 本次绘画所用的画面描述来源，便于前端提示与排查 */
          scene,
        });
      }
      const url = helper.imageUrls?.[0];
      if (url) {
        const dataUrl = await fetchAsDataUrl(url);
        if (dataUrl) {
          return NextResponse.json({ image: dataUrl, scene });
        }
      }
    }

    const message = helper.errorMessages?.[0] ?? '配图生成失败，请稍后重试';
    return NextResponse.json({ error: message }, { status: 502 });
  } catch (error) {
    console.error('[api/illustrate] error:', error);
    return NextResponse.json(
      { error: '配图生成失败，请稍后重试' },
      { status: 500 },
    );
  }
}

