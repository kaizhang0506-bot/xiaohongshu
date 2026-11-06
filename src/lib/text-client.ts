import { LLMClient } from 'coze-coding-dev-sdk';
import { streamDeepseek, type DeepseekMessage, type DeepseekContentPart } from './deepseek';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Deployment requires an explicit provider; retain the historical flag name for compatibility. */
export class RoutedTextClient {
  constructor(private config: ConstructorParameters<typeof LLMClient>[0], private headers?: ConstructorParameters<typeof LLMClient>[1]) {}
  async *stream(...args: Parameters<LLMClient['stream']>) {
    if (process.env.AI_TEST_PROVIDER !== 'relay') {
      yield* new LLMClient(this.config, this.headers).stream(...args);
      return;
    }
    const [messages, options] = args;
    const normalized: DeepseekMessage[] = messages.map(message => ({
      role: message.role === 'system' || message.role === 'assistant' ? message.role : 'user',
      content: typeof message.content === 'string' ? message.content : (message.content ?? []).flatMap(part => {
        if (part.type === 'text') return [{ type: 'text', text: part.text } as DeepseekContentPart];
        if (part.type === 'image_url' && part.image_url) return [{ type: 'image_url', image_url: { url: part.image_url.url } } as DeepseekContentPart];
        return [];
      }),
    }));
    let output = '', failure = '';
    await streamDeepseek({ apiKey: process.env.CONFLUX_API_KEY || '', apiUrl: `${(process.env.CONFLUX_BASE_URL || 'https://oapi.kaitools.cn/v1').replace(/\/$/,'')}/chat/completions`, modelId: options?.model || process.env.CONFLUX_REWRITE_MODEL || 'deepseek-v4.1-flash-1017', messages: normalized, temperature: options?.temperature ?? .2, safeEnqueue: event => { if(event.type==='delta') output += event.text; else if(event.type==='error') failure=event.message; } });
    if(failure) throw new Error(failure);
    if(!output) throw new Error('模型返回了空内容，请重试');
    if(process.env.AI_DEBUG_SAVE_RESULTS === '1') {
      const folder=path.join(process.cwd(),'test-artifacts','model-results');
      await mkdir(folder,{recursive:true});
      const task=String(messages[0]?.content).includes('卡片编辑')?'smart-edit':String(messages[0]?.content).includes('提取助手')?'extract':'rewrite';
      await writeFile(path.join(folder,`${task}-${Date.now()}.txt`),output,'utf8');
    }
    yield { content: output };
  }
}
