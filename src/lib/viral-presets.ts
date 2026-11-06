/** Workflow presets adapted from JimLiu/baoyu-skills baoyu-xhs-images (MIT).
 * These control content planning and select our existing renderers, not the upstream raster backend.
 */
export const VIRAL_PRESETS = [
  { id: 'knowledge-card', label: '知识卡片', layout: 'rednote-checklist', structure: 'knowledge', brief: '结论先行，逐段讲清概念、原因和适用条件；每页一个核心信息点。' },
  { id: 'checklist', label: '清单笔记', layout: 'rednote-checklist', structure: 'checklist', brief: '用有先后顺序的清单组织内容，每项包含具体要点及简短解释，避免重复。' },
  { id: 'tutorial', label: '步骤教程', layout: 'terminal', structure: 'how-to', brief: '按目标、准备、步骤、检查结果展开；解释关键步骤为什么必要。' },
  { id: 'versus', label: '对比分析', layout: 'newspaper', structure: 'comparison', brief: '统一比较维度，分别说明优点、限制和适用人群；不强行分出绝对胜负。' },
  { id: 'pro-summary', label: '专业总结', layout: 'minimal', structure: 'good-share', brief: '克制简洁，用少量关键结论组织正文，保留事实依据与边界。' },
  { id: 'cozy-story', label: '案例叙事', layout: 'journal', structure: 'review-log', brief: '通过场景、问题、变化、理解组织内容。只用原文已有经历；假设案例明确标注为假设。' },
] as const;

export function viralPrompt(id: string): string {
  const preset = VIRAL_PRESETS.find(item => item.id === id);
  return preset ? `图文策划：${preset.label}。${preset.brief}封面标题具体、有信息，不制造焦虑或承诺效果。内页围绕同一主题递进，末页收束要点；不要为凑页数重复文案。按所选字数限制写作，深度来自解释而非扩写。` : '';
}
