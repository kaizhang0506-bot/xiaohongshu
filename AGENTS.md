# 小红书项目：扣子编程交接规则

这是已经完成并验收的现有网站。接手的任务是按原代码部署、配置和修复实际问题，不是重新设计或重建。先阅读《扣子部署与模型接入说明.md》《给扣子编程的交接指令.txt》和 deployment-contract.json。当前规则替代旧版本中关于模型、模板数量、生图前置步骤的过时描述。

## 模型和静态内容的分工

- 当前交接方案是中转站：AI_TEST_PROVIDER=relay 与 NEXT_PUBLIC_AI_TEST_PROVIDER=relay。仿写、图片提字、AI 起草参考文案、智能换字识别走 src/lib/text-client.ts → src/lib/deepseek.ts → https://oapi.kaitools.cn/v1/chat/completions。
- 中转密钥用服务端 CONFLUX_API_KEY。公开仓库和源码 ZIP 不包含真实密钥；在目标服务器的密钥配置中填写原密钥。不要改成 NEXT_PUBLIC_*，不要写到浏览器代码、提示词或提交记录。
- 扣子文字 SDK 分支已存在，只能在用户明确要求切换后启用。扣子编程助手的模型不等于网站运行模型；不要仅因为项目放在扣子服务器，就把中转站替换成豆包。
- 正常流程没有必须使用扣子生图的功能。新增 100 套本地小红书模板为 20 个风格 × 5 种构图，内置注册表合计 322 个。字体、纸张、装饰和图片合成由代码完成。
- /api/illustrate 是遗留可选扣子生图接口，ENABLE_LEGACY_AI_IMAGES 默认关闭；正常前端不调用。不得把它接回套模板前置步骤。
- public/finished-six 中的历史 AI 封面现在是已保存的静态图片。部署时直接提供这些文件，不重新生图，不依赖 Codex 图片工具。

## 不得因部署而改变的行为

1. 一套原文/图片 → 用户选 1–100 条 → 每条独立仿写且意思一致、表达不同 → 用户核对 → 各配不同模板。不能复制一篇文案反复套模板。
2. 仿写有参考正文时以正文为准，不重复发原图；没有正文才可发图片。提字和换字识别使用真实支持图片的模型。
3. 封面只有上半大标题与下半完整大图；不放摘要、品牌栏、标签、页码和底部提示。正文从第二页开始。
4. 内容首句不自动截成页标题。普通正文同页同字号；明确的小标题是正文 1.12 倍，次级小标题 1.08 倍；重点只加粗，不额外放大。封面保留独立大标题。
5. 标题方案可修改，回车或失焦保存；同步对应文案、封面、历史和下载。多套之间不能串改。
6. 图表、照片保留完整原图，不重绘、不拉伸；只有外部文案和空白边框可以按规则提取。纯文字截图不再作为小图片嵌入。
7. 100 套模板和 319 份本地字体必须一起部署，不替换为网络字体或生图结果；旧模板 ID 保留。自定义模板沿用用户设置的文字区域。
8. 卡片固定 1080×1440，预览和 PNG/长图/ZIP 使用同一内容、字体、图片及排版。卡片内部颜色使用内联 hex/rgb，避免 html2canvas 不支持的 oklch。
9. ZIP 一个总文件夹，内部按各套文案/模板分文件夹。每批仅预览 10 条，导出包含全部对应结果；长图复用已导出的 PNG，不重复截图。
10. 选择工作台模板不要自动滚动或切换流程；不能合并原图换字和模板排版两个步骤。历史/设置/自定义模板保存在当前浏览器，不擅自换成云端数据库或账号系统。

## 部署步骤

- Node.js 24，pnpm 9。保留 .coze、scripts、src、public、references、pnpm-lock.yaml 和各配置文件。
- 服务端按 .env.relay.example 配置两项 provider、CONFLUX_API_KEY、API 地址、模型 ID、AI_DEBUG_SAVE_RESULTS=0、ENABLE_LEGACY_AI_IMAGES=0。
- pnpm install --frozen-lockfile → pnpm build → pnpm start；Linux 和 Windows 脚本均已接入部署检查。
- 构建和启动会核对受保护源码/静态素材、前后端 provider 一致性与构建记录。缺配置时修正配置，不要切换模型、重写模板或删除检查器。
- release-integrity.json 是本次验收版本的 SHA-256 基线。部署中禁止调用 create-release-manifest.mjs 重建基线来掩盖改动。只有用户授权功能变更并完成验证，才可建立新发布基线。
- 启动是完整 Next.js + Node.js API 服务，不是静态导出。平台设置 DEPLOY_RUN_PORT；公开访问使用平台分配的域名，不依赖开发机 localhost 或 D/E 盘。

## 验证和报告

- 先 node scripts/check-deployment.mjs source，再 TypeScript、相关 ESLint、现有 check-card-typography / check-rewrite-100 / check-rewrite-facts / check-relay-empty 检查。
- 先验不消耗模型的模板、原图、字号、放大预览、PNG/ZIP；再用配置好的通道测试提字、1 条/2 条独立仿写和智能换字，重启后复测。
- 本地生产构建通过不等于扣子服务器验收完成。报告实际通道、模型 ID、构建/启动和各项结果；不得输出密钥，不得把未验证项目写成通过。
- scripts/package-private.cjs 属于历史私人交付工具，不用于公开发布或部署；开发原始截图、模型调试结果和 .env.local 不进入公开包。
- 未实现后台队列/断点续跑、云端账号和小红书自动发布。不得在部署时增加这些能力或改变现有流程。

## 代码入口

- src/lib/model.ts：实际模型白名单和 UI 名称；不自动等于中转后台全部权限。
- src/lib/prompt.ts、rewrite-quality.ts、stream-client.ts：仿写要求、数值覆盖及 SSE reset/重试。
- src/lib/card-content.ts、card-rich-text.ts：正文完整分页与真实标题层级。
- src/components/workbench/TitleImageCover.tsx、XhsNativeCard.tsx、CardRichText.tsx、useCardTextFit.ts：封面、正文、原比例图片和字号适配。
- src/components/workbench/CardDeck.tsx、src/app/page.tsx：原图提取、独立版本、模板、导出。
- src/components/workbench/OriginalImageEditor.tsx：安全换字和手动修正；不覆盖图表。
