import type { CardTemplate, CardData, PageRenderData } from "../base"

const defaultData: CardData = {
  title: "在日常里发现美，是一种了不起的能力",
  pages: [
    "<p>清晨路过花店，看见老板正在修剪枝叶，地上散落一圈花瓣，像是不经意画下的一幅静物。</p><p>下午三点的光线从窗帘缝隙漏进来，在木桌上画出一道金色的痕迹。猫跳上桌面，刚好踩在光影的边缘。</p><p>雨后的城市有一种清洗过的干净，积水倒映着天空和行人，世界忽然多了一个倒置的维度。</p><p><strong>生活不缺美，缺的是停下来看一眼的心情。</strong></p>",
  ],
  tags: ["生活美学", "日常记录", "慢生活"],
}

function ArtCard({ data }: { data: PageRenderData }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(155deg, #FDF8F4 0%, #F9F1EC 25%, #F5EDE6 50%, #F0E8E0 75%, #F6F0EA 100%)",
        display: "flex",
        flexDirection: "column",
        padding: "56px 44px 36px",
        fontFamily:
          '"PingFang SC", "Hiragino Sans GB", "Noto Serif SC", Georgia, serif',
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* === 水彩色块装饰 === */}
      {/* 右上 - 柔粉 */}
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -20,
          width: 220,
          height: 200,
          borderRadius: "60% 40% 55% 45% / 50% 60% 40% 50%",
          background: "radial-gradient(ellipse, rgba(232, 160, 160, 0.18) 0%, rgba(232, 160, 160, 0.04) 60%, transparent 80%)",
          filter: "blur(12px)",
          transform: "rotate(-15deg)",
        }}
      />
      {/* 左下 - 雾蓝 */}
      <div
        style={{
          position: "absolute",
          bottom: -40,
          left: -30,
          width: 240,
          height: 220,
          borderRadius: "45% 55% 50% 50% / 55% 45% 55% 45%",
          background: "radial-gradient(ellipse, rgba(147, 180, 206, 0.16) 0%, rgba(147, 180, 206, 0.03) 60%, transparent 80%)",
          filter: "blur(14px)",
          transform: "rotate(10deg)",
        }}
      />
      {/* 中部 - 薄荷 */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          right: -10,
          width: 160,
          height: 150,
          borderRadius: "50% 50% 45% 55% / 45% 55% 50% 50%",
          background: "radial-gradient(ellipse, rgba(168, 208, 180, 0.12) 0%, transparent 65%)",
          filter: "blur(10px)",
          transform: "rotate(20deg)",
        }}
      />
      {/* 左上角 - 淡紫 */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: -20,
          width: 140,
          height: 130,
          borderRadius: "55% 45% 48% 52% / 50% 50% 50% 50%",
          background: "radial-gradient(ellipse, rgba(186, 166, 206, 0.1) 0%, transparent 65%)",
          filter: "blur(10px)",
        }}
      />

      {/* 纸张纹理 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 画框装饰线 */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 18,
          right: 18,
          bottom: 18,
          border: "1px solid rgba(180, 160, 140, 0.12)",
          borderRadius: 6,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 22,
          left: 22,
          right: 22,
          bottom: 22,
          border: "0.5px solid rgba(180, 160, 140, 0.07)",
          borderRadius: 4,
          pointerEvents: "none",
        }}
      />

      {/* 角落花纹装饰 */}
      <svg
        width="50"
        height="50"
        viewBox="0 0 50 50"
        fill="none"
        style={{ position: "absolute", top: 24, left: 24, opacity: 0.18 }}
      >
        <path d="M2 25 C2 12 12 2 25 2" stroke="#B4A08C" strokeWidth="1" fill="none" />
        <path d="M6 25 C6 15 15 6 25 6" stroke="#B4A08C" strokeWidth="0.6" fill="none" />
        <circle cx="4" cy="25" r="1.5" fill="#B4A08C" />
        <circle cx="25" cy="4" r="1.5" fill="#B4A08C" />
      </svg>
      <svg
        width="50"
        height="50"
        viewBox="0 0 50 50"
        fill="none"
        style={{ position: "absolute", top: 24, right: 24, opacity: 0.18, transform: "scaleX(-1)" }}
      >
        <path d="M2 25 C2 12 12 2 25 2" stroke="#B4A08C" strokeWidth="1" fill="none" />
        <path d="M6 25 C6 15 15 6 25 6" stroke="#B4A08C" strokeWidth="0.6" fill="none" />
        <circle cx="4" cy="25" r="1.5" fill="#B4A08C" />
        <circle cx="25" cy="4" r="1.5" fill="#B4A08C" />
      </svg>
      <svg
        width="50"
        height="50"
        viewBox="0 0 50 50"
        fill="none"
        style={{ position: "absolute", bottom: 24, left: 24, opacity: 0.18, transform: "scaleY(-1)" }}
      >
        <path d="M2 25 C2 12 12 2 25 2" stroke="#B4A08C" strokeWidth="1" fill="none" />
        <path d="M6 25 C6 15 15 6 25 6" stroke="#B4A08C" strokeWidth="0.6" fill="none" />
        <circle cx="4" cy="25" r="1.5" fill="#B4A08C" />
        <circle cx="25" cy="4" r="1.5" fill="#B4A08C" />
      </svg>
      <svg
        width="50"
        height="50"
        viewBox="0 0 50 50"
        fill="none"
        style={{ position: "absolute", bottom: 24, right: 24, opacity: 0.18, transform: "scale(-1, -1)" }}
      >
        <path d="M2 25 C2 12 12 2 25 2" stroke="#B4A08C" strokeWidth="1" fill="none" />
        <path d="M6 25 C6 15 15 6 25 6" stroke="#B4A08C" strokeWidth="0.6" fill="none" />
        <circle cx="4" cy="25" r="1.5" fill="#B4A08C" />
        <circle cx="25" cy="4" r="1.5" fill="#B4A08C" />
      </svg>

      {/* 右侧笔触装饰 */}
      <svg
        width="60"
        height="180"
        viewBox="0 0 60 180"
        fill="none"
        style={{ position: "absolute", right: 28, top: "30%", opacity: 0.06 }}
      >
        <path d="M30 0 C28 40 35 80 30 120 C25 140 32 160 30 180" stroke="#8B7355" strokeWidth="3" strokeLinecap="round" />
        <path d="M20 30 C22 50 18 70 20 90" stroke="#8B7355" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M40 60 C38 80 42 100 40 120" stroke="#8B7355" strokeWidth="1" strokeLinecap="round" />
      </svg>

      {/* === 内容区 === */}
      {data.title && (
        <div style={{ position: "relative", marginBottom: 8 }}>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 700,
              lineHeight: 1.45,
              color: "#3D3229",
              letterSpacing: 1.5,
            }}
          >
            {data.title}
          </h1>
        </div>
      )}

      {/* 标题下装饰 */}
      {data.title && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 28,
          }}
        >
          <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
            <path
              d="M2 6 C6 2 10 10 14 6 C18 2 22 8 22 6"
              stroke="#C4A882"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "rgba(196, 168, 130, 0.35)",
            }}
          />
          <div
            style={{
              width: 40,
              height: 0.5,
              background: "linear-gradient(90deg, rgba(196, 168, 130, 0.3), transparent)",
            }}
          />
        </div>
      )}

      {/* 富文本内容 */}
      <div
        className="tpl-art-body"
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
        }}
        dangerouslySetInnerHTML={{ __html: data.content }}
      />

      {/* 底部装饰 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginTop: 20,
          marginBottom: 8,
        }}
      >
        <svg width="40" height="8" viewBox="0 0 40 8" fill="none">
          <path d="M2 4 C8 1 14 7 20 4 C26 1 32 7 38 4" stroke="#C4A882" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1 L7.5 4.5 L11 5.5 L8 8 L8.5 11 L6 9.5 L3.5 11 L4 8 L1 5.5 L4.5 4.5 Z" fill="none" stroke="#C4A882" strokeWidth="0.6" />
        </svg>
        <svg width="40" height="8" viewBox="0 0 40 8" fill="none">
          <path d="M2 4 C8 7 14 1 20 4 C26 7 32 1 38 4" stroke="#C4A882" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      </div>

      {/* 标签 */}
      {data.tags.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {data.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 12,
                color: "#8B7355",
                background: "rgba(196, 168, 130, 0.08)",
                padding: "4px 14px",
                borderRadius: 20,
                fontWeight: 500,
                border: "1px solid rgba(196, 168, 130, 0.15)",
                letterSpacing: 1,
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 页码 */}
      {data.pageInfo && (
        <div
          style={{
            position: "absolute",
            bottom: 28,
            right: 32,
            fontSize: 11,
            color: "rgba(139, 115, 85, 0.3)",
            fontWeight: 600,
            letterSpacing: 1,
            fontStyle: "italic",
          }}
        >
          {data.pageInfo.current} / {data.pageInfo.total}
        </div>
      )}
    </div>
  )
}

export const artTemplate: CardTemplate = {
  id: "art",
  name: "艺术画框",
  description: "水彩色块 + 画框边线 + 优雅衬线体，适合美学、感悟、摄影类内容",
  render: (data) => <ArtCard data={data} />,
  defaultData,
}
