import type { CardTemplate, CardData, PageRenderData } from "../base"

// FC / NES 8-bit 像素风格模板
// 色板严格参照 NES 2C02 PPU 标准色彩（简化版）
const PAL = {
  black: "#0A0A0A",
  darkGray: "#1C1C1C",
  midGray: "#3C3C3C",
  gray: "#747474",
  lightGray: "#ABABAB",
  silver: "#C8C8C8",
  white: "#F8F8F8",
  // 点缀色 — NES 经典绿/红/黄
  green: "#4CAF50",     // NES green  
  red: "#D73030",       // NES red
  yellow: "#F8C800",    // NES yellow
  cyan: "#3CBCFC",      // NES cyan
  darkGreen: "#007800", // NES dark green
}

// 像素字体 stack（优先系统内置等宽字体，降级到 monospace）
const PIXEL_FONT = '"Courier New", "Lucida Console", "Consolas", monospace'

// ▓░ 像素块装饰：生成一排 NES 风格方块
function PixelRow({
  y,
  pattern,
  colors,
}: {
  y: number
  pattern: number[]
  colors: string[]
}) {
  const BLOCK = 8
  return (
    <>
      {pattern.map((ci, x) =>
        ci > 0 ? (
          <rect
            key={x}
            x={x * BLOCK}
            y={y * BLOCK}
            width={BLOCK}
            height={BLOCK}
            fill={colors[ci - 1] ?? PAL.gray}
          />
        ) : null
      )}
    </>
  )
}

// 顶部装饰像素图案（仿 FC 角色 sprite）
function TopDecoration() {
  // 简化版蘑菇 sprite 6×8
  const rows = [
    [0, 0, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1],
    [0, 2, 1, 2, 1, 2],
    [0, 1, 1, 1, 1, 1],
    [0, 0, 1, 1, 1, 0],
    [0, 0, 2, 0, 2, 0],
    [0, 2, 2, 0, 2, 2],
    [0, 2, 2, 0, 2, 2],
  ]
  const colors = [PAL.red, PAL.white]
  const BLOCK = 8
  return (
    <svg
      width={6 * BLOCK}
      height={8 * BLOCK}
      viewBox={`0 0 ${6 * BLOCK} ${8 * BLOCK}`}
      style={{ imageRendering: "pixelated" }}
    >
      {rows.map((row, yi) => (
        <PixelRow key={yi} y={yi} pattern={row} colors={colors} />
      ))}
    </svg>
  )
}

// 星星 sprite
function StarSprite({ size = 16 }: { size?: number }) {
  // 3×3 像素星
  const rows = [
    [0, 1, 0],
    [1, 2, 1],
    [0, 1, 0],
  ]
  const colors = [PAL.yellow, PAL.white]
  const BLOCK = size / 3
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${3 * BLOCK} ${3 * BLOCK}`}
      style={{ imageRendering: "pixelated" }}
    >
      {rows.map((row, yi) => (
        <PixelRow key={yi} y={yi} pattern={row} colors={colors} />
      ))}
    </svg>
  )
}

// 像素心形
function HeartSprite({ size = 16 }: { size?: number }) {
  const rows = [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ]
  const colors = [PAL.red]
  const BLOCK = size / 5
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${5 * BLOCK} ${5 * BLOCK}`}
      style={{ imageRendering: "pixelated" }}
    >
      {rows.map((row, yi) => (
        <PixelRow key={yi} y={yi} pattern={row} colors={colors} />
      ))}
    </svg>
  )
}

// 顶部像素分割线（方块串）
function PixelDivider({ color = PAL.green }: { color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 3,
        alignItems: "center",
        margin: "10px 0",
      }}
    >
      {Array.from({ length: 46 }, (_, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            background: i % 3 === 0 ? color : PAL.midGray,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  )
}

// 底部血条装饰
function HpBar({ hp = 85 }: { hp?: number }) {
  const total = 10
  const filled = Math.round((hp / 100) * total)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          fontSize: 10,
          color: PAL.yellow,
          fontFamily: PIXEL_FONT,
          letterSpacing: 1,
        }}
      >
        HP
      </span>
      <div style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: 8,
              background: i < filled ? PAL.green : PAL.midGray,
              border: `1px solid ${i < filled ? PAL.darkGreen : PAL.darkGray}`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

const defaultData: CardData = {
  title: "FC红白机经典游戏TOP 5",
  pages: [
    "<ol><li>超级马里奥兄弟 — 跳跃平台的永恒经典</li><li>魂斗罗 — 双人合作射击鼻祖</li><li>忍者神龟 — 四人联机闯关名作</li><li>赤色要塞 — 国内童年记忆 No.1</li><li>洛克人 — 动作关卡设计的巅峰</li></ol>",
  ],
  tags: ["FC游戏", "红白机", "8bit"],
}

function Fc8bitCard({ data }: { data: PageRenderData }) {
  const contentText = data.content.replace(/<[^>]*>/g, "").trim()
  const isTitleOnly = !!data.title && !contentText

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: PAL.black,
        display: "flex",
        flexDirection: "column",
        padding: "20px 22px 18px",
        fontFamily: PIXEL_FONT,
        position: "relative",
        overflow: "hidden",
        // 扫描线效果
        backgroundImage:
          `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(255,255,255,0.015) 3px,
            rgba(255,255,255,0.015) 4px
          )`,
      }}
    >
      {/* ========== 外框：像素边框 ========== */}
      {/* 四角像素块 */}
      {[
        { top: 0, left: 0 },
        { top: 0, right: 0 },
        { bottom: 0, left: 0 },
        { bottom: 0, right: 0 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 12,
            height: 12,
            background: PAL.gray,
            ...pos,
          }}
        />
      ))}
      {/* 上边框线 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 12,
          right: 12,
          height: 4,
          background: PAL.midGray,
        }}
      />
      {/* 下边框线 */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 12,
          right: 12,
          height: 4,
          background: PAL.midGray,
        }}
      />
      {/* 左边框线 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 12,
          bottom: 12,
          width: 4,
          background: PAL.midGray,
        }}
      />
      {/* 右边框线 */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 12,
          bottom: 12,
          width: 4,
          background: PAL.midGray,
        }}
      />

      {/* ========== 顶部 LOGO 区 ========== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        {/* 左：蘑菇 sprite */}
        <TopDecoration />

        {/* 中：GAME 字样 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: PAL.yellow,
              letterSpacing: 4,
              fontFamily: PIXEL_FONT,
              fontWeight: 700,
              textShadow: `1px 1px 0 ${PAL.black}`,
            }}
          >
            ★ GAME CARD ★
          </div>
          <div
            style={{
              fontSize: 9,
              color: PAL.gray,
              letterSpacing: 3,
              fontFamily: PIXEL_FONT,
            }}
          >
            1985 FAMICOM
          </div>
        </div>

        {/* 右：星星 + 心形 */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <StarSprite size={18} />
          <HeartSprite size={18} />
          <StarSprite size={14} />
        </div>
      </div>

      {/* 像素分割线 */}
      <PixelDivider color={PAL.green} />

      {/* ========== 主内容区 ========== */}
      {isTitleOnly ? (
        // 纯标题：垂直居中
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          {/* 上方闪烁提示文字 */}
          <div
            style={{
              fontSize: 10,
              color: PAL.gray,
              letterSpacing: 3,
              fontFamily: PIXEL_FONT,
            }}
          >
            ▶ PRESS START ◀
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1.5,
              color: PAL.white,
              textAlign: "center",
              fontFamily: PIXEL_FONT,
              letterSpacing: 1,
              textShadow: `2px 2px 0 ${PAL.darkGray}, -1px -1px 0 rgba(0,0,0,0.5)`,
              margin: 0,
            }}
          >
            {data.title}
          </h1>
          {/* 底部像素装饰 */}
          <div style={{ display: "flex", gap: 8 }}>
            {[PAL.red, PAL.yellow, PAL.green, PAL.cyan].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, background: c }} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* 标题 */}
          {data.title && (
            <div style={{ marginBottom: 12 }}>
              {/* 标题行：方块 + 文字 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    background: PAL.yellow,
                    flexShrink: 0,
                    marginTop: 5,
                  }}
                />
                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    lineHeight: 1.45,
                    color: PAL.white,
                    fontFamily: PIXEL_FONT,
                    letterSpacing: 0.5,
                    textShadow: `2px 2px 0 ${PAL.darkGray}`,
                    margin: 0,
                  }}
                >
                  {data.title}
                </h1>
              </div>
            </div>
          )}

          {/* 内容 */}
          <div
            className="tpl-fc8bit-body"
            style={{
              flex: 1,
              overflow: "hidden",
              counterReset: `fc8bit-counter ${data.listStartIndex - 1}`,
            }}
            dangerouslySetInnerHTML={{ __html: data.content }}
          />
        </>
      )}

      {/* ========== 底部区域 ========== */}
      <PixelDivider color={PAL.midGray} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* HP 血条 */}
        <HpBar hp={80} />

        {/* 右边：标签 + 页码 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {/* 标签 */}
          {data.tags.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {data.tags.map((tag, i) => {
                const tagColors = [PAL.cyan, PAL.yellow, PAL.green]
                const c = tagColors[i % tagColors.length]
                return (
                  <span
                    key={tag}
                    style={{
                      fontSize: 9,
                      color: PAL.black,
                      background: c,
                      padding: "2px 6px",
                      fontFamily: PIXEL_FONT,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                    }}
                  >
                    #{tag}
                  </span>
                )
              })}
            </div>
          )}

          {/* 页码 */}
          {data.pageInfo && (
            <div
              style={{
                fontSize: 10,
                color: PAL.gray,
                fontFamily: PIXEL_FONT,
                letterSpacing: 2,
              }}
            >
              {String(data.pageInfo.current).padStart(2, "0")}/{String(data.pageInfo.total).padStart(2, "0")}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const fc8bitTemplate: CardTemplate = {
  id: "fc8bit",
  name: "FC红白机",
  description: "8-bit 像素风格，方块字体 + 黑灰色调，复古游戏卡带感",
  render: (data) => <Fc8bitCard data={data} />,
  defaultData,
}
