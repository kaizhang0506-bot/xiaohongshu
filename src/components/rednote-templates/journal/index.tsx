import type { CardTemplate, CardData, PageRenderData } from "../base"

// Journal 手写便签风格模板
// 参考截图：浅绿灰纸张背景，左上角日期，墨绿大标题居中偏左，极简留白

const defaultData: CardData = {
  title: "今天的咖啡馆坐了三个小时",
  pages: [
    "<p>点了一杯手冲，坐在靠窗的角落。窗外是下午三点的斜阳，把整条街道镀成了琥珀色。</p><p>没有打开电脑，没有刷手机，就看着街上的人来来往往，脑子里什么都没想，又好像想了很多。</p><p>很久没有这样纯粹地发呆了。原来停下来，也是一种需要练习的能力。</p>",
  ],
  tags: ["生活", "慢下来", "咖啡"],
}

// 固定显示的日期（模拟截图中的 May 11, 2026）
function getDateStr(): string {
  const now = new Date()
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${months[now.getMonth()]} ${now.getDate()},\n${now.getFullYear()}`
}

function JournalCard({ data }: { data: PageRenderData }) {
  const contentText = data.content.replace(/<[^>]*>/g, "").trim()
  const isTitleOnly = !!data.title && !contentText
  const dateStr = getDateStr()
  const [dateLine1, dateLine2] = dateStr.split("\n")

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        // 浅绿灰纸张背景色
        background: "#E8EDE6",
        // 细腻纸张纹理（用多层 radial-gradient 模拟）
        backgroundImage: `
          radial-gradient(ellipse at 20% 30%, rgba(180,200,175,0.35) 0%, transparent 55%),
          radial-gradient(ellipse at 80% 70%, rgba(160,185,155,0.28) 0%, transparent 50%),
          radial-gradient(ellipse at 55% 10%, rgba(200,215,195,0.20) 0%, transparent 40%),
          radial-gradient(ellipse at 10% 85%, rgba(170,190,165,0.22) 0%, transparent 45%)
        `,
        display: "flex",
        flexDirection: "column",
        padding: "36px 36px 32px",
        fontFamily: '"Georgia", "Noto Serif SC", serif',
      }}
    >
      {/* ── 纸张边缘轻微阴影（营造翻卷感） ── */}
      <div style={{
        position: "absolute",
        inset: 0,
        boxShadow: "inset 2px 2px 8px rgba(100,120,95,0.12), inset -1px -1px 4px rgba(100,120,95,0.08)",
        pointerEvents: "none",
        borderRadius: 2,
      }}/>

      {/* ── 左上角日期 ── */}
      <div
        style={{
          position: "absolute",
          top: 28,
          left: 32,
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        <span style={{
          fontSize: 13,
          color: "#4A7A50",
          fontFamily: '"Courier New", "Courier", monospace',
          fontWeight: 600,
          lineHeight: 1.4,
          letterSpacing: 0.3,
        }}>{dateLine1}</span>
        <span style={{
          fontSize: 13,
          color: "#4A7A50",
          fontFamily: '"Courier New", "Courier", monospace',
          fontWeight: 600,
          lineHeight: 1.4,
          letterSpacing: 0.3,
        }}>{dateLine2}</span>
      </div>

      {/* ── 主内容区 ── */}
      {isTitleOnly ? (
        // 仅标题：垂直居中偏下（对应截图中标题在中下位置）
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingTop: "18%",   // 向下偏移，让标题不要居中太靠上
        }}>
          <h1 style={{
            fontSize: 38,
            fontWeight: 700,
            color: "#2D5A35",
            lineHeight: 1.55,
            margin: 0,
            fontFamily: '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif',
            letterSpacing: 0.5,
            // 轻微手写感：文字不要太均匀
            wordBreak: "break-all",
          }}>
            {data.title}
          </h1>
        </div>
      ) : (
        // 标题 + 正文
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          paddingTop: "12%",
        }}>
          {data.title && (
            <h1 style={{
              fontSize: 30,
              fontWeight: 700,
              color: "#2D5A35",
              lineHeight: 1.55,
              margin: "0 0 24px",
              fontFamily: '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif',
              letterSpacing: 0.5,
              wordBreak: "break-all",
            }}>
              {data.title}
            </h1>
          )}

          <div
            className="tpl-journal-body"
            style={{ flex: 1, overflow: "hidden" }}
            dangerouslySetInnerHTML={{ __html: data.content }}
          />

          {/* 标签 */}
          {data.tags.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
              {data.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: 12,
                  color: "#4A7A50",
                  fontFamily: '"Courier New", monospace',
                  opacity: 0.75,
                  letterSpacing: 0.3,
                }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 页码（多页时显示，右下角，和截图保持极简） ── */}
      {data.pageInfo && (
        <div style={{
          position: "absolute",
          bottom: 22,
          right: 32,
          fontSize: 11,
          color: "#4A7A50",
          fontFamily: '"Courier New", monospace',
          opacity: 0.55,
          letterSpacing: 1,
        }}>
          {data.pageInfo.current} / {data.pageInfo.total}
        </div>
      )}

      {/* ── 右下角装饰线（仿便签撕痕感） ── */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        background: "linear-gradient(90deg, rgba(160,185,155,0.3) 0%, rgba(140,170,135,0.5) 30%, rgba(160,185,155,0.2) 70%, rgba(140,170,135,0.4) 100%)",
      }}/>
    </div>
  )
}

export const journalTemplate: CardTemplate = {
  id: "journal",
  name: "日记便签",
  description: "浅绿纸张质感，极简留白，墨绿大标题，手写日记风格",
  render: (data) => <JournalCard data={data} />,
  defaultData,
}
