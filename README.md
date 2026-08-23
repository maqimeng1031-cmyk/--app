# 萌喵社 PWA

## 部署
把本文件夹内全部文件上传到任意 HTTPS 静态网站即可，例如：
- GitHub Pages
- Cloudflare Pages
- Vercel
- Netlify

部署后用 iPhone Safari 打开网址：
分享 → 添加到主屏幕。

## 数据
- 数据保存在当前浏览器 localStorage。
- 支持“备份”页面导出/导入 JSON。
- 清除 Safari 网站数据或更换设备前，请先导出备份。

## 文件
- index.html：App
- manifest.json：PWA 配置
- service-worker.js：离线缓存
- icons/：桌面图标
