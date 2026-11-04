import type { CardTemplate } from "./base"
import { checklistTemplate } from "./checklist"
import { essayTemplate } from "./essay"
import { techTemplate } from "./tech"
import { artTemplate } from "./art"
import { kindleTemplate } from "./kindle"
import { iphone17Template } from "./iphone17"
import { macbookTemplate } from "./macbook"
import { fc8bitTemplate } from "./fc8bit"
import { journalTemplate } from "./journal"
import { articleTemplate } from "./article"
import { textnoteTemplate } from "./textnote"

/**
 * 模板注册表
 * 新增模板：1) 创建模板文件夹  2) 在此 import 并加入数组
 * 删除模板：移除 import 和数组项即可
 */
export const templates: CardTemplate[] = [
  checklistTemplate,
  essayTemplate,
  techTemplate,
  artTemplate,
  kindleTemplate,
  iphone17Template,
  macbookTemplate,
  fc8bitTemplate,
  journalTemplate,
  articleTemplate,
  textnoteTemplate,
]

export function getTemplateById(id: string): CardTemplate | undefined {
  return templates.find((t) => t.id === id)
}