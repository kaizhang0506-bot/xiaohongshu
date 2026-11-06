import type { RewriteResult } from './types';

export const MAX_REWRITE_COUNT = 100;
export const REWRITE_COUNTS = Array.from({ length: MAX_REWRITE_COUNT }, (_, index) => index + 1);
export const BATCH_PREVIEW_SIZE = 10;

export function normalizeRewriteCount(value: number): number {
  return Number.isFinite(value) ? Math.min(MAX_REWRITE_COUNT, Math.max(1, Math.round(value))) : 5;
}

const ANGLES = ['观点切入', '疑问切入', '误区切入', '原因分析', '阅读笔记', '要点清单', '对比讲解', '问题拆解', '复盘总结', '步骤梳理'];
const EXPRESSIONS = ['短句直述', '先结论后解释', '先现象后原理', '以条件为主线', '以关键问题串联', '分层解释', '先讲边界再展开', '以观察顺序展开', '用归纳句串联段落', '先概括再逐项说明'];

/** All 100 positions have a defined direction; recent examples stay within the API's 2000-character limit. */
export function buildRewriteBatchContext(index: number, count: number, generated: RewriteResult[], preset = ''): string {
  const direction = `${ANGLES[index % ANGLES.length]}，表达节奏采用${EXPRESSIONS[Math.floor(index / ANGLES.length) % EXPRESSIONS.length]}`;
  const recent = generated.slice(-8).map((version, offset) => `文案${generated.length - Math.min(generated.length, 8) + offset + 1}：${version.body.slice(0, 100)}`).join('；');
  return [
    `第${index + 1}/${normalizeRewriteCount(count)}条完整仿写，采用${direction}。保留原意、数字和条件，不编造、不为求异扩成长文；标题、句式和措辞须不同。`,
    preset.trim().slice(0, 600),
    recent ? `最近文案的开头（避免重复）：${recent}` : '',
  ].filter(Boolean).join('\n');
}
