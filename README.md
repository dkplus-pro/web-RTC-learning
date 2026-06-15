# WebRTC Learning Course

面向有 7 年经验的前端架构师，从零开始学习 WebRTC：每节课都有文档、注释代码和独立可运行 demo。

## 运行方式

本仓库不依赖第三方 npm 包。WebRTC 的媒体采集 API 需要安全上下文；`localhost` 属于浏览器认可的安全上下文。

```bash
npm run validate
npm run lesson:01
# 浏览器打开 http://localhost:5101
```

也可以在仓库根目录启动总览页：

```bash
npm run serve
# 浏览器打开 http://localhost:5173
```

## 课程目录

| 课次 | 主题 | Demo |
| --- | --- | --- |
| 01 | 媒体采集与权限模型 | `npm run lesson:01` |
| 02 | 设备枚举与媒体约束 | `npm run lesson:02` |
| 03 | 单页 RTCPeerConnection 与 Offer/Answer | `npm run lesson:03` |
| 04 | ICE 候选与本地信令模拟 | `npm run lesson:04` |
| 05 | RTCDataChannel 文本聊天 | `npm run lesson:05` |
| 06 | 屏幕共享与 Track 替换 | `npm run lesson:06` |
| 07 | getStats 诊断与连接状态 | `npm run lesson:07` |
| 08 | 生产架构：信令、STUN/TURN、安全与演进 | `npm run lesson:08` |

## 官方资料

- MDN WebRTC API: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- MDN MediaDevices.getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- MDN RTCPeerConnection: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
- MDN WebRTC Data Channels: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
