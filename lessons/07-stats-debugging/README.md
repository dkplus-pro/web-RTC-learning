# 第 07 课：getStats 诊断与连接状态

本课面向已经能建立连接的前端架构师：你不再只关心「能不能连上」，而要能够解释码率、丢包、候选对、往返时延和连接状态如何共同影响体验。生产排障时，`RTCPeerConnection.getStats()` 是浏览器暴露给你的最重要观测面。

## 你将学到

- 如何在本地 loopback 连接上周期性调用 `getStats()`。
- 如何读取 outbound RTP、candidate-pair、track 等关键报告。
- 为什么连接状态、ICE 状态和媒体质量指标需要一起观察。
- 如何把底层统计数据转成适合控制台和用户界面的摘要。

## 运行方式

```bash
cd lessons/07-stats-debugging
python3 -m http.server 5107
# 打开 http://localhost:5107
```

点击「启动诊断连接」后，页面会采集摄像头，建立本地 loopback，并每秒刷新一次诊断面板。没有安装步骤，也不依赖第三方服务。

## 生产化建议

线上系统不要把所有 `getStats()` 原始对象直接上传。更好的方式是按固定 schema 采样关键字段，例如可用码率、发送帧率、RTT、丢包、当前 candidate pair 类型，再和业务事件、设备信息、网络切换事件关联分析。
