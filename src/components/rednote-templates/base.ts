import type { ReactNode } from "react"

/** 卡片内容数据（用户编辑用） */
export interface CardData {
  title: string
  pages: string[]  // 每页的 HTML 富文本内容
  tags: string[]
}

/** 页码信息 */
export interface PageInfo {
  current: number
  total: number
}

/** 单页渲染数据（传给模板渲染） */
export interface PageRenderData {
  title: string
  content: string  // 该页的 HTML 内容
  tags: string[]
  pageInfo?: PageInfo
  /** 有序列表起始编号（前面页累计的 <li> 数量） */
  listStartIndex: number
  /** 全文总字数（所有页标题+正文去标签后的字符数，供模板显示用） */
  totalCharCount: number
}

/** 模板接口 — 每个模板必须实现 */
export interface CardTemplate {
  /** 模板唯一标识 */
  id: string
  /** 模板显示名称 */
  name: string
  /** 模板简介 */
  description: string
  /** 接收单页数据，返回卡片 UI */
  render: (data: PageRenderData) => ReactNode
  /** 该模板的示例数据 */
  defaultData: CardData
}

/** 统计 HTML 中 <li> 的数量 */
function countListItems(html: string): number {
  const matches = html.match(/<li[\s>]/gi)
  return matches ? matches.length : 0
}

/** 将 CardData 转为逐页渲染数据 */
export function buildPages(data: CardData): PageRenderData[] {
  const { title, pages, tags } = data
  const total = pages.length

  // 全文总字数：标题 + 所有页内容，去 HTML 标签和空白
  const allText = title + pages.join("")
  const totalCharCount = allText.replace(/<[^>]*>/g, "").replace(/\s/g, "").length

  let accumulated = 0
  return pages.map((content, i) => {
    const page: PageRenderData = {
      title: i === 0 ? title : "",
      content,
      tags: i === total - 1 ? tags : [],
      pageInfo: total > 1 ? { current: i + 1, total } : undefined,
      listStartIndex: accumulated + 1,
      totalCharCount,
    }
    accumulated += countListItems(content)
    return page
  })
}