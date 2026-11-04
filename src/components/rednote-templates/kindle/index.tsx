import type { CardTemplate, CardData, PageRenderData } from "../base"

const defaultData: CardData = {
  title: "人生的路，走走停停",
  pages: [
    "<p>有些路看起来很近，走去却很远的；缺少耐心的人永远走不到头。有些路看起来很远，走去却很近的；只要有决心，就一定能到达。</p><p>人生，就是一个修炼的过程。我们不能控制际遇，却可以掌握自己；我们无法预知未来，却可以把握现在。</p><p>当你觉得迷茫的时候，就把手头的事情做好。把每一件小事做好，把每一天过好，就是在靠近那个最好的自己。</p><p>所有的努力都不会白费，时光不会辜负每一个认真生活的人。</p>",
  ],
  tags: ["阅读摘录", "人生感悟", "好书推荐"],
}

function KindleCard({ data }: { data: PageRenderData }) {
  const contentText = data.content.replace(/<[^>]*>/g, "").trim()
  const isTitleOnly = !!data.title && !contentText

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 8px",
        position: "relative",
        overflow: "hidden",
        fontFamily:
          '"LXGW WenKai", "PingFang SC", "Hiragino Sans GB", serif',
      }}
    >
      {/* 环境柔光 */}
      <div
        style={{
          position: "absolute",
          top: -60,
          left: "30%",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Oasis 3 设备 — 全黑正面 */}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          borderRadius: 10,
          overflow: "hidden",
          background: "#0C0C0C",
          boxShadow:
            "0 12px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3), inset 0 0.5px 0 rgba(255,255,255,0.08)",
          position: "relative",
        }}
      >
        {/* 左侧屏幕区 — 薄边框 */}
        <div
          style={{
            flex: 1,
            padding: "7px 0 7px 7px",
            display: "flex",
          }}
        >
          {/* E-ink 屏幕 */}
          <div
            style={{
              flex: 1,
              background: "#F8F8F6",
              borderRadius: 2,
              padding: "20px 22px 16px",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* 电子墨水颗粒质感 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.03,
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              }}
            />

            {/* 顶部状态栏：kindle + wifi + 电量 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
                paddingBottom: 6,
                borderBottom: "0.5px solid rgba(0,0,0,0.05)",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(0,0,0,0.3)",
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                  letterSpacing: 0.5,
                }}
              >
                kindle
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* WiFi 图标 */}
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                  <path d="M5.5 8 a0.6 0.6 0 1 0 0-1.2 a0.6 0.6 0 1 0 0 1.2" fill="rgba(0,0,0,0.3)" />
                  <path d="M3.2 5.8 a3.2 3.2 0 0 1 4.6 0" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                  <path d="M1.5 3.8 a5.5 5.5 0 0 1 8 0" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                  <path d="M0 1.8 a7.8 7.8 0 0 1 11 0" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                </svg>
                {/* 电量图标 */}
                <div
                  style={{
                    width: 18,
                    height: 9,
                    border: "1px solid rgba(0,0,0,0.22)",
                    borderRadius: 2,
                    padding: 1.5,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: "70%",
                      height: "100%",
                      background: "rgba(0,0,0,0.22)",
                      borderRadius: 1,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      right: -3,
                      top: 2.5,
                      width: 2,
                      height: 4,
                      background: "rgba(0,0,0,0.18)",
                      borderRadius: "0 1px 1px 0",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 标题 */}
            {data.title && (
              <div
                style={{
                  marginBottom: isTitleOnly ? 0 : 14,
                  position: "relative",
                  flexShrink: isTitleOnly ? undefined : 0,
                  flex: isTitleOnly ? 1 : undefined,
                  display: isTitleOnly ? "flex" : undefined,
                  flexDirection: isTitleOnly ? "column" : undefined,
                  alignItems: isTitleOnly ? "center" : undefined,
                  justifyContent: isTitleOnly ? "center" : undefined,
                }}
              >
                <h1
                  style={{
                    fontSize: isTitleOnly ? 26 : 22,
                    fontWeight: 700,
                    lineHeight: 1.45,
                    color: "#1A1A1A",
                    letterSpacing: 0.5,
                    textAlign: isTitleOnly ? "center" : undefined,
                  }}
                >
                  {data.title}
                </h1>
                {!isTitleOnly && (
                  <div
                    style={{
                      width: 28,
                      height: 1,
                      background: "#1A1A1A",
                      marginTop: 10,
                      opacity: 0.12,
                    }}
                  />
                )}
              </div>
            )}

            {/* 正文 */}
            {!isTitleOnly && (
              <div
                className="tpl-kindle-body"
                style={{
                  flex: 1,
                  position: "relative",
                  overflow: "hidden",
                }}
                dangerouslySetInnerHTML={{ __html: data.content }}
              />
            )}

            {/* 标签 */}
            {data.tags.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 14,
                  flexWrap: "wrap",
                  flexShrink: 0,
                }}
              >
                {data.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 10,
                      color: "rgba(0,0,0,0.35)",
                      borderBottom: "1px dashed rgba(0,0,0,0.12)",
                      paddingBottom: 1,
                      letterSpacing: 0.3,
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* 底部页码 */}
            <div
              style={{
                marginTop: 12,
                paddingTop: 6,
                borderTop: "0.5px solid rgba(0,0,0,0.05)",
                display: "flex",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(0,0,0,0.25)",
                  fontFamily: '-apple-system, "Helvetica Neue", sans-serif',
                  letterSpacing: 0.5,
                }}
              >
                {data.pageInfo
                  ? `— ${data.pageInfo.current} / ${data.pageInfo.total} —`
                  : "— 1 / 1 —"}
              </span>
            </div>
          </div>
        </div>

        {/* 右侧握持区 — 宽，带细长翻页按钮 */}
        <div
          style={{
            width: 58,
            flexShrink: 0,
            background: "#0C0C0C",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            position: "relative",
          }}
        >
          {/* 右边缘微弧光 */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 3,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.02) 100%)",
              borderRadius: "0 10px 10px 0",
            }}
          />

          {/* 翻页按钮上 — 细长条形 */}
          <div
            style={{
              width: 10,
              height: 52,
              borderRadius: 5,
              background: "linear-gradient(180deg, #1E1E1E 0%, #141414 100%)",
              border: "0.5px solid rgba(255,255,255,0.07)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
                boxShadow: "inset 0 0.5px 1px rgba(0,0,0,0.3)",
              }}
            />
          </div>

          {/* 翻页按钮下 — 细长条形 */}
          <div
            style={{
              width: 10,
              height: 52,
              borderRadius: 5,
              background: "linear-gradient(180deg, #1E1E1E 0%, #141414 100%)",
              border: "0.5px solid rgba(255,255,255,0.07)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
                boxShadow: "inset 0 0.5px 1px rgba(0,0,0,0.3)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export const kindleTemplate: CardTemplate = {
  id: "kindle",
  name: "Kindle Oasis",
  description: "高度还原 Kindle Oasis 3 外观，不对称握持 + 齐平墨水屏，适合读书笔记、摘抄",
  render: (data) => <KindleCard data={data} />,
  defaultData,
}
