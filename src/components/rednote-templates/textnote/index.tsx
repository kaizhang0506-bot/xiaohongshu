import type { CardTemplate, CardData, PageRenderData } from "../base"

// TextNote 便签风格模板
// 参考截图：白色圆角卡片 + 绿色粗边框 + 超大加粗标题 + 底部分割线 + 星期 / "Text Note" 标签

const defaultData: CardData = {
  title: "🌿 用散步代替刷手机的第 14 天",
  pages: [
    "<p>刚开始觉得无聊，不知道手放哪，脑子里一直想着要不要掏出手机。</p><p>第三天之后慢慢习惯了，开始注意到路边的猫、邻居新种的花、傍晚天空的颜色。</p><p>两周了，每天三十分钟，感觉大脑终于有了一点点属于自己的空间。</p>",
  ],
  tags: ["习惯", "生活", "数字排毒"],
}

// 获取星期（英文）
function getDayOfWeek(): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  return days[new Date().getDay()]
}

function TextNoteCard({ data }: { data: PageRenderData }) {
  const contentText = data.content.replace(/<[^>]*>/g, "").trim()
  const isTitleOnly = !!data.title && !contentText
  const dayStr = getDayOfWeek()

  return (
    // 最外层：绿色厚边框 + 圆角
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#3FC45A",
        borderRadius: 28,
        padding: 10,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 内层白色卡片 */}
      <div
        style={{
          flex: 1,
          background: "#FFFFFF",
          borderRadius: 20,
          display: "flex",
          flexDirection: "column",
          padding: "32px 28px 20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 主内容区 */}
        {isTitleOnly ? (
          // 仅标题：大字占满中上区域
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            paddingTop: "8%",
          }}>
            <h1 style={{
              fontSize: 44,
              fontWeight: 900,
              color: "#111111",
              lineHeight: 1.35,
              margin: 0,
              fontFamily: '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif',
              letterSpacing: -0.5,
              wordBreak: "break-all",
            }}>
              {data.title}
            </h1>
          </div>
        ) : (
          // 标题 + 正文
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {data.title && (
              <h1 style={{
                fontSize: 30,
                fontWeight: 900,
                color: "#111111",
                lineHeight: 1.45,
                margin: "0 0 20px",
                fontFamily: '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif',
                letterSpacing: -0.3,
                wordBreak: "break-all",
                flexShrink: 0,
              }}>
                {data.title}
              </h1>
            )}

            <div
              className="tpl-textnote-body"
              style={{ flex: 1, overflow: "hidden" }}
              dangerouslySetInnerHTML={{ __html: data.content }}
            />

            {/* 标签 */}
            {data.tags.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, flexShrink: 0 }}>
                {data.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 11,
                    color: "#3FC45A",
                    fontFamily: '"PingFang SC", sans-serif',
                    fontWeight: 600,
                    letterSpacing: 0.2,
                  }}># {tag}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 底部分割线 + 星期 / Text Note */}
        <div style={{ flexShrink: 0, marginTop: 16 }}>
          <div style={{
            height: 1,
            background: "rgba(0,0,0,0.10)",
            marginBottom: 12,
          }} />
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{
              fontSize: 13,
              color: "#3FC45A",
              fontFamily: '"PingFang SC", "Helvetica Neue", sans-serif',
              fontWeight: 600,
              letterSpacing: 0.2,
            }}>
              {dayStr}
            </span>
            <span style={{
              fontSize: 13,
              color: "#3FC45A",
              fontFamily: '"PingFang SC", "Helvetica Neue", sans-serif',
              fontWeight: 600,
              letterSpacing: 0.2,
            }}>
              Text Note
            </span>
          </div>
        </div>

        {/* 页码（多页时右下角显示） */}
        {data.pageInfo && (
          <div style={{
            position: "absolute",
            bottom: 20,
            right: 28,
            fontSize: 11,
            color: "rgba(63,196,90,0.6)",
            fontFamily: '"PingFang SC", sans-serif',
            letterSpacing: 1,
          }}>
            {data.pageInfo.current} / {data.pageInfo.total}
          </div>
        )}
      </div>
    </div>
  )
}

export const textnoteTemplate: CardTemplate = {
  id: "textnote",
  name: "Text Note",
  description: "绿色粗边框便签，超大加粗标题，极简底栏，清新通透",
  render: (data) => <TextNoteCard data={data} />,
  defaultData,
}
