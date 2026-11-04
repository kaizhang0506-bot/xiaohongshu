import type { CardTemplate, CardData, PageRenderData } from "../base"

const defaultData: CardData = {
  title: "独居第三年，我学会了和自己相处",
  pages: [
    "<p>搬到这座城市的第三年，我终于不再害怕一个人吃饭、一个人看电影、一个人逛超市。</p><p>以前觉得孤独是一种缺失，后来发现那只是因为还没学会享受。周末的早晨，不用迁就任何人，煮一杯咖啡，听喜欢的播客，窗外的阳光刚好落在书页上。</p><p>学会了给自己做饭，不是外卖吃腻了，而是发现认真切菜、调味、摆盘的过程本身就很治愈。一个人的晚餐，也值得被认真对待。</p><p><strong>独居不是将就，是选择把生活过成自己喜欢的样子。</strong></p>",
  ],
  tags: ["独居生活", "自我成长", "生活感悟"],
}

function EssayCard({ data }: { data: PageRenderData }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(170deg, #FFFCF5 0%, #FFF8ED 35%, #FEF3E2 65%, #FDF0DD 100%)",
        display: "flex",
        flexDirection: "column",
        padding: "52px 44px 36px",
        fontFamily:
          '"PingFang SC", "Hiragino Sans GB", "Noto Serif SC", "Source Han Serif CN", serif',
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* === 装饰层 === */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -50,
          right: -50,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(234, 179, 108, 0.15) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -40,
          left: -30,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(210, 140, 80, 0.08) 0%, transparent 70%)",
          filter: "blur(14px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 30,
          fontSize: 120,
          fontFamily: "Georgia, serif",
          lineHeight: 1,
          color: "rgba(200, 149, 108, 0.1)",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {"\u201C"}
      </div>
      <svg
        width="90"
        height="130"
        viewBox="0 0 90 130"
        fill="none"
        style={{ position: "absolute", top: 12, right: 20, opacity: 0.09 }}
      >
        <path d="M45 128 C45 128 45 70 45 50 C45 30 20 15 10 25 C0 35 20 45 45 50" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M45 80 C45 80 65 55 75 45 C85 35 80 15 65 20 C50 25 55 50 45 80" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M45 95 C45 95 25 75 18 60 C11 45 25 40 35 50 C45 60 45 95 45 95" stroke="#B8860B" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 22,
          top: 56,
          bottom: 56,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(200, 149, 108, 0.35)" }} />
        <div style={{ flex: 1, width: 2, background: "linear-gradient(180deg, rgba(200, 149, 108, 0.3) 0%, rgba(200, 149, 108, 0.06) 100%)", borderRadius: 2 }} />
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(200, 149, 108, 0.2)" }} />
      </div>

      {/* === 内容区 === */}
      <div style={{ position: "relative", marginBottom: 6 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.4, color: "#2C2417", letterSpacing: 1 }}>
          {data.title}
        </h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
        <div style={{ width: 32, height: 2, background: "linear-gradient(90deg, #C8956C, rgba(200, 149, 108, 0.15))", borderRadius: 2 }} />
        <div style={{ width: 6, height: 6, background: "#C8956C", transform: "rotate(45deg)", opacity: 0.4 }} />
        <div style={{ width: 16, height: 2, background: "linear-gradient(90deg, rgba(200, 149, 108, 0.3), rgba(200, 149, 108, 0.05))", borderRadius: 2 }} />
      </div>

      {/* 富文本内容 */}
      <div
        className="tpl-essay-body"
        style={{ flex: 1, position: "relative", overflow: "hidden" }}
        dangerouslySetInnerHTML={{ __html: data.content }}
      />

      {/* 底部装饰 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 20, marginBottom: 8 }}>
        <div style={{ width: 20, height: 1, background: "rgba(200, 149, 108, 0.2)", borderRadius: 1 }} />
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(200, 149, 108, 0.2)" }} />
        <div style={{ width: 40, height: 1, background: "rgba(200, 149, 108, 0.15)", borderRadius: 1 }} />
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(200, 149, 108, 0.2)" }} />
        <div style={{ width: 20, height: 1, background: "rgba(200, 149, 108, 0.2)", borderRadius: 1 }} />
      </div>

      {data.tags.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {data.tags.map((tag) => (
            <span key={tag} style={{ fontSize: 12, color: "#A0784C", background: "rgba(200, 149, 108, 0.08)", padding: "4px 12px", borderRadius: 14, fontWeight: 500, border: "1px solid rgba(200, 149, 108, 0.12)", letterSpacing: 0.5 }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div style={{ position: "absolute", bottom: 10, right: 30, fontSize: 80, fontFamily: "Georgia, serif", lineHeight: 1, color: "rgba(200, 149, 108, 0.08)", userSelect: "none", pointerEvents: "none" }}>
        {"\u201D"}
      </div>

      {data.pageInfo && (
        <div style={{ position: "absolute", bottom: 14, right: 20, fontSize: 11, color: "rgba(180, 140, 90, 0.4)", fontWeight: 600, letterSpacing: 1 }}>
          {data.pageInfo.current} / {data.pageInfo.total}
        </div>
      )}
    </div>
  )
}

export const essayTemplate: CardTemplate = {
  id: "essay",
  name: "笔记段落",
  description: "书卷纸质感 + 引号装饰，适合感悟、故事、日记类内容",
  render: (data) => <EssayCard data={data} />,
  defaultData,
}