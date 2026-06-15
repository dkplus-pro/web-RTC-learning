# 第 03 课：单页 RTCPeerConnection 与 Offer/Answer

本课把两个端点放在同一个页面中，用最少的浏览器 API 串起一次完整的 WebRTC 媒体协商。你会看到本地端如何创建 `offer`，远端如何生成 `answer`，以及双方如何把同一个摄像头流连接成一次可观察的点对点会话。

## 学习目标

- 理解 `RTCPeerConnection` 是媒体轨道、SDP 协商和 ICE 连接状态的聚合点。
- 掌握 `createOffer`、`setLocalDescription`、`setRemoteDescription`、`createAnswer` 的调用顺序。
- 观察本地视频轨道如何通过 `addTrack` 进入连接，并在远端通过 `track` 事件播放。
- 建立调试习惯：先看信令状态，再看 ICE 状态，最后检查媒体轨道。

## 关键概念

### Offer/Answer 是会话合同

SDP 不只是字符串，它描述了媒体方向、编码能力、传输指纹和 ICE 参数。浏览器会根据本地描述与远端描述计算双方都能接受的媒体会话。

### 单页实验仍然保留真实流程

虽然本课没有网络信令服务器，但左右两个 `RTCPeerConnection` 对象仍然执行真实的协商流程。唯一被简化的是“把 SDP 从一端传到另一端”的方式：我们直接在 JavaScript 内存中传递对象。

## 运行方式

```bash
npm run lesson:03
# 浏览器打开 http://localhost:5103
```

建议使用 Chrome、Edge 或 Firefox，并允许摄像头/麦克风权限。若没有摄像头，也可以阅读日志观察协商状态。

## 实验步骤

1. 点击“启动本地媒体”，确认本地预览出现。
2. 点击“建立连接”，观察 offer、answer 和连接状态日志。
3. 在远端视频出现后，停止连接并重新建立，理解一次会话的生命周期。

## 架构提醒

生产系统不会把 offer/answer 放在同一个页面里直接传递，而是通过 WebSocket、HTTP 长轮询或其他信令通道传输。本课先把信令网络拿掉，聚焦浏览器侧状态机。
