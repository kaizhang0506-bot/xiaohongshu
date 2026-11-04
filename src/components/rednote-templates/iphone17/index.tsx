import type { CardTemplate, CardData, PageRenderData } from "../base"

const defaultData: CardData = {
  title: "今天是个好日子",
  pages: [
    "<p>清晨推开窗，阳光刚好铺在桌面上，空气里还带着一点点湿润的草木气息。</p><p>泡了杯咖啡，坐在窗边发了一会儿呆。远处有鸟叫声，楼下的小孩在跑步，生活好像和往常没什么不同，但又莫名地觉得今天会是个好日子。</p><p>也许好日子不一定要有什么大事发生，不过是心情刚好，阳光刚好，咖啡刚好不烫。</p><p><strong>就这样，也挺好的。</strong></p>",
  ],
  tags: ["日常", "生活记录", "心情"],
}

// Mist Blue 配色
const FRAME_COLOR = "#E8EDF2"        // 铝合金机身框架 — 雾霾蓝银
const FRAME_INNER = "#DDE3E9"
const FRAME_SHADOW = "rgba(120,140,160,0.18)"
const SCREEN_BG = "#F9FAFB"          // 屏幕底色（浅灰白）
const STATUS_TEXT = "rgba(0,0,0,0.55)"
const BODY_TEXT = "#1C1C1E"

function IPhone17Card({ data }: { data: PageRenderData }) {
  const contentText = data.content.replace(/<[^>]*>/g, "").trim()
  const isTitleOnly = !!data.title && !contentText

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(160deg, #EAF0F6 0%, #DDE5EE 50%, #D0DAE6 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px 28px",
        position: "relative",
        overflow: "hidden",
        fontFamily:
          '-apple-system, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", sans-serif',
      }}
    >
      {/* 背景光晕 */}
      <div style={{
        position: "absolute", top: -40, right: -40, width: 220, height: 220,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -30, left: -30, width: 160, height: 160,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(180,205,230,0.25) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ── iPhone 17 机身 ── */}
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 铝合金外框 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 52,
            background: `linear-gradient(160deg, ${FRAME_COLOR} 0%, ${FRAME_INNER} 100%)`,
            boxShadow: [
              `0 0 0 1.5px rgba(255,255,255,0.9)`,            // 外高光
              `0 0 0 3px rgba(180,200,220,0.55)`,             // 铝框
              `0 16px 48px ${FRAME_SHADOW}`,                  // 投影
              `0 2px 8px rgba(100,130,160,0.1)`,
              `inset 0 0 0 1px rgba(255,255,255,0.5)`,       // 内高光
            ].join(", "),
          }}
        />

        {/* 右侧音量键 */}
        {[34, 68, 100].map((top, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              right: -2,
              top,
              width: 3,
              height: i === 0 ? 22 : 36,
              borderRadius: "0 2px 2px 0",
              background: "linear-gradient(180deg, #D8E2EB 0%, #C8D4DE 100%)",
              boxShadow: "1px 0 2px rgba(0,0,0,0.08)",
            }}
          />
        ))}

        {/* 左侧电源键 */}
        <div
          style={{
            position: "absolute",
            left: -2,
            top: 80,
            width: 3,
            height: 56,
            borderRadius: "2px 0 0 2px",
            background: "linear-gradient(180deg, #D8E2EB 0%, #C8D4DE 100%)",
            boxShadow: "-1px 0 2px rgba(0,0,0,0.08)",
          }}
        />

        {/* 屏幕区域 */}
        <div
          style={{
            position: "absolute",
            inset: 10,
            borderRadius: 44,
            background: SCREEN_BG,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* 屏幕内圆角遮罩 */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 44,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
            pointerEvents: "none", zIndex: 10,
          }} />

          {/* ── 状态栏 ── */}
          <div
            style={{
              height: 44,
              flexShrink: 0,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              padding: "0 26px 6px",
              position: "relative",
            }}
          >
            {/* 时间 */}
            <span style={{
              fontSize: 12, fontWeight: 600, color: STATUS_TEXT,
              letterSpacing: -0.2,
              fontFamily: '-apple-system, "SF Pro Text", sans-serif',
            }}>
              9:41
            </span>

            {/* Dynamic Island */}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: "50%",
                transform: "translateX(-50%)",
                width: 110,
                height: 30,
                borderRadius: 20,
                background: "#0A0A0A",
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
              }}
            >
              {/* 前置摄像头小点 */}
              <div style={{
                position: "absolute", right: 14, top: "50%",
                transform: "translateY(-50%)",
                width: 10, height: 10, borderRadius: "50%",
                background: "#1A1A1A",
                boxShadow: "inset 0 0 3px rgba(0,0,0,0.5), 0 0 0 1.5px #111",
              }}>
                <div style={{
                  position: "absolute", top: 2, left: 2,
                  width: 3, height: 3, borderRadius: "50%",
                  background: "rgba(60,100,180,0.35)",
                }} />
              </div>
            </div>

            {/* 右侧状态图标 */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {/* 信号 */}
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                {[0,1,2,3].map((i) => (
                  <rect key={i} x={i * 4} y={12 - (i + 1) * 3} width="3" height={(i + 1) * 3}
                    rx="0.8" fill={STATUS_TEXT} opacity={i < 3 ? 1 : 0.3} />
                ))}
              </svg>
              {/* WiFi */}
              <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
                <path d="M7.5 11 a0.7 0.7 0 1 0 0-1.4 a0.7 0.7 0 1 0 0 1.4" fill={STATUS_TEXT} />
                <path d="M4.5 8.2 a4 4 0 0 1 6 0" stroke={STATUS_TEXT} strokeWidth="1" fill="none" strokeLinecap="round" />
                <path d="M2 5.5 a7.5 7.5 0 0 1 11 0" stroke={STATUS_TEXT} strokeWidth="1" fill="none" strokeLinecap="round" />
                <path d="M0 3 a10.5 10.5 0 0 1 15 0" stroke={STATUS_TEXT} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4" />
              </svg>
              {/* 电量 */}
              <div style={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <span style={{ fontSize: 10, color: STATUS_TEXT, fontWeight: 500 }}>82%</span>
                <div style={{
                  width: 22, height: 11, border: `1px solid ${STATUS_TEXT}`,
                  borderRadius: 3, padding: 1.5, position: "relative",
                }}>
                  <div style={{ width: "75%", height: "100%", background: "#34C759", borderRadius: 1 }} />
                  <div style={{
                    position: "absolute", right: -3, top: 3,
                    width: 2, height: 5, background: STATUS_TEXT,
                    borderRadius: "0 1px 1px 0", opacity: 0.5,
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── 主内容区 ── */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "0 28px 0",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {isTitleOnly ? (
              /* 纯标题：纵向居中 */
              <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                textAlign: "center",
              }}>
                <h1 style={{
                  fontSize: 28, fontWeight: 700, lineHeight: 1.4,
                  color: BODY_TEXT, letterSpacing: -0.5,
                }}>
                  {data.title}
                </h1>
              </div>
            ) : (
              <>
                {/* 标题 */}
                {data.title && (
                  <div style={{ marginBottom: 14, flexShrink: 0 }}>
                    <h1 style={{
                      fontSize: 22, fontWeight: 700, lineHeight: 1.4,
                      color: BODY_TEXT, letterSpacing: -0.3,
                    }}>
                      {data.title}
                    </h1>
                    {/* 细分割线 */}
                    <div style={{
                      marginTop: 10, height: 0.5,
                      background: "linear-gradient(90deg, rgba(0,0,0,0.1) 0%, transparent 80%)",
                    }} />
                  </div>
                )}

                {/* 正文 */}
                <div
                  className="tpl-iphone17-body"
                  style={{ flex: 1, overflow: "hidden", position: "relative" }}
                  dangerouslySetInnerHTML={{ __html: data.content }}
                />

                {/* 标签 */}
                {data.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, flexShrink: 0 }}>
                    {data.tags.map((tag) => (
                      <span key={tag} style={{
                        fontSize: 11, color: "#007AFF",
                        background: "rgba(0,122,255,0.08)",
                        padding: "3px 10px", borderRadius: 20,
                        fontWeight: 500, letterSpacing: 0.2,
                        border: "1px solid rgba(0,122,255,0.12)",
                      }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Home 指示条 ── */}
          <div style={{
            height: 32, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            paddingBottom: 4,
          }}>
            {/* 页码 */}
            {data.pageInfo && (
              <span style={{
                fontSize: 9, color: "rgba(0,0,0,0.2)",
                fontFamily: '-apple-system, "SF Pro Text", sans-serif',
                letterSpacing: 0.5, position: "absolute",
                left: 0, right: 0, textAlign: "center",
              }}>
                {data.pageInfo.current} / {data.pageInfo.total}
              </span>
            )}
            {/* Home bar */}
            <div style={{
              width: 120, height: 4, borderRadius: 2,
              background: "rgba(0,0,0,0.15)",
              marginTop: data.pageInfo ? 10 : 0,
            }} />
          </div>
        </div>

        {/* 背面摄像头模组 — 左上角 */}
        <div
          style={{
            position: "absolute",
            top: 18, left: 18,
            width: 80, height: 80,
            borderRadius: 22,
            background: "linear-gradient(135deg, #C8D4DE 0%, #B8C8D8 100%)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.4)",
            display: "flex", flexWrap: "wrap",
            gap: 6, padding: 14, zIndex: 20,
            opacity: 0,  // 屏幕遮住了背面，不显示
          }}
        />
      </div>
    </div>
  )
}

export const iphone17Template: CardTemplate = {
  id: "iphone17",
  name: "iPhone 17",
  description: "Apple iPhone 17 风格，Dynamic Island + 状态栏 + 铝合金机身，适合日常记录、心情类内容",
  render: (data) => <IPhone17Card data={data} />,
  defaultData,
}
