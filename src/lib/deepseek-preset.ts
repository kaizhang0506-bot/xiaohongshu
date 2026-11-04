/**
 * DeepSeek 通道服务端预配置的「前端可见标记」。
 * 只暴露布尔位（是否存在预配置 / 预配置是否默认可读图），
 * 密钥、地址、模型 ID 等敏感值仅存服务端环境变量，不进前端包。
 */

/** 服务端是否已预配置 DeepSeek 通道（用户无需再在设置页填写即可使用） */
export const DEEPSEEK_PRESET =
  process.env.NEXT_PUBLIC_DEEPSEEK_PRESET === '1';

/** 预配置通道是否默认支持读图（用户本地开关可覆盖） */
export const DEEPSEEK_PRESET_VISION =
  process.env.NEXT_PUBLIC_DEEPSEEK_VISION === '1';
