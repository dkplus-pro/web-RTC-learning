# 第 06 课：屏幕共享与 Track 替换

本课目标是让你理解「屏幕共享不是一种新的连接类型」，而是把新的 `MediaStreamTrack` 放进已有的 `RTCPeerConnection`。在真实产品中，会议、在线课堂、远程协作通常都需要在摄像头视频和屏幕视频之间切换，同时保持音频、DataChannel、ICE 连接和远端订阅关系不变。

## 你将学到

- `navigator.mediaDevices.getDisplayMedia()` 的权限模型与安全限制。
- `RTCRtpSender.replaceTrack()` 如何在不中断 PeerConnection 的情况下替换视频轨。
- 为什么生产系统需要监听 `track.onended` 来处理用户停止共享屏幕。
- 如何在本地 loopback 连接中验证屏幕共享，不依赖外部信令服务器。

## 运行方式

```bash
cd lessons/06-screen-share
python3 -m http.server 5106
# 打开 http://localhost:5106
```

`localhost` 是浏览器认可的安全上下文，可以调用媒体采集 API。首次点击按钮时，浏览器会请求摄像头、麦克风或屏幕共享权限。

## 架构提示

本 demo 使用两个同页面的 `RTCPeerConnection` 模拟本地端和远端端：左侧是本地采集流，右侧是远端收到的流。真正的线上应用会把 offer、answer、ICE candidate 通过 WebSocket 或其他信令通道发送给另一个用户，但媒体轨的替换方式保持一致。
