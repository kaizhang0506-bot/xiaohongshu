# 小红书

小红书图文创作工作台，基于 Next.js 16、React 19 和 TypeScript。

## 功能

- 参考文案仿写，支持深度拆解风格与跟随原文字数。
- 多模态识别图片文字，分区换字并保留原图表。
- 多套图文排版与自定义模板图片上传，可设置文字区域、字体、颜色。
- 逐页 PNG、整组长图与多模板 ZIP 下载；每套模板独立存放在总文件夹下。
- 本地历史记录与模型配置。

## 本地运行

需要 Node.js 20.9+ 和 pnpm。

```sh
pnpm install
pnpm exec next dev --webpack -p 5000
```

打开 http://localhost:5000 。在设置页填写自己的 OpenAI 兼容 API 地址、API Key、模型名称与读图能力。模型是否可用取决于服务商与账号权限；智能换字当前使用 deepseek-v4.1-flash-1017，要求服务商支持其图片输入。

生产运行：

```sh
pnpm exec next build
pnpm exec next start -p 5000
```

## 数据与部署

API Key 和历史配置保存在当前浏览器 localStorage。调用模型时 Key 会经过本应用服务端转发；请仅在可信环境中使用。图片合成在浏览器进行，识别时图片发送给配置的模型服务商。仓库不包含个人密钥、上传素材和本地缓存。

部分旧功能仍依赖 Coze SDK 与对应环境授权；独立部署建议使用设置中的 OpenAI 兼容通道。应用没有用户鉴权，公开部署前应自行增加访问控制和请求限制。

## 第三方模板

第三方模板许可见 THIRD_PARTY_NOTICES.md 与 REDNOTE-LICENSE.txt，使用与再分发时请保留对应声明。
