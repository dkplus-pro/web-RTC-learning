const els = {
  start: document.querySelector('#start'),
  stop: document.querySelector('#stop'),
  local: document.querySelector('#local'),
  remote: document.querySelector('#remote'),
  connectionState: document.querySelector('#connectionState'),
  iceState: document.querySelector('#iceState'),
  bitrate: document.querySelector('#bitrate'),
  frames: document.querySelector('#frames'),
  rtt: document.querySelector('#rtt'),
  candidatePair: document.querySelector('#candidatePair'),
  rawStats: document.querySelector('#rawStats'),
};

let stream;
let localPeer;
let remotePeer;
let timer;
let lastBytes = 0;
let lastTimestamp = 0;

function assertSupport() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('需要在 localhost 或 HTTPS 安全上下文中运行，并使用支持 WebRTC 的浏览器。');
  }
}

function updateLifecycle() {
  els.connectionState.textContent = localPeer?.connectionState ?? 'idle';
  els.iceState.textContent = localPeer?.iceConnectionState ?? 'idle';
}

async function connectLoopback() {
  localPeer = new RTCPeerConnection();
  remotePeer = new RTCPeerConnection();

  localPeer.onconnectionstatechange = updateLifecycle;
  localPeer.oniceconnectionstatechange = updateLifecycle;
  localPeer.onicecandidate = ({ candidate }) => candidate && remotePeer.addIceCandidate(candidate);
  remotePeer.onicecandidate = ({ candidate }) => candidate && localPeer.addIceCandidate(candidate);
  remotePeer.ontrack = ({ streams }) => {
    els.remote.srcObject = streams[0];
  };

  for (const track of stream.getTracks()) localPeer.addTrack(track, stream);

  const offer = await localPeer.createOffer();
  await localPeer.setLocalDescription(offer);
  await remotePeer.setRemoteDescription(offer);
  const answer = await remotePeer.createAnswer();
  await remotePeer.setLocalDescription(answer);
  await localPeer.setRemoteDescription(answer);
  updateLifecycle();
}

function toKbps(report) {
  const bytes = report.bytesSent ?? 0;
  const timestamp = report.timestamp ?? 0;
  if (!lastTimestamp) {
    lastBytes = bytes;
    lastTimestamp = timestamp;
    return '采样中';
  }
  const bits = (bytes - lastBytes) * 8;
  const seconds = (timestamp - lastTimestamp) / 1000;
  lastBytes = bytes;
  lastTimestamp = timestamp;
  return seconds > 0 ? `${Math.round(bits / seconds / 1000)} kbps` : '0 kbps';
}

async function refreshStats() {
  if (!localPeer) return;
  const stats = await localPeer.getStats();
  const summary = [];

  for (const report of stats.values()) {
    // outbound-rtp 展示本端实际发出的媒体数据，是排查发送端质量的入口。
    if (report.type === 'outbound-rtp' && report.kind === 'video') {
      els.bitrate.textContent = toKbps(report);
      els.frames.textContent = `${Math.round(report.framesPerSecond ?? 0)} fps`;
      summary.push({ type: report.type, kind: report.kind, bytesSent: report.bytesSent, framesPerSecond: report.framesPerSecond });
    }

    // succeeded candidate-pair 通常代表当前选中的网络路径，可用于解释 RTT 和 NAT 类型。
    if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated) {
      els.rtt.textContent = report.currentRoundTripTime ? `${Math.round(report.currentRoundTripTime * 1000)} ms` : '未知';
      els.candidatePair.textContent = `${report.localCandidateId} → ${report.remoteCandidateId}`;
      summary.push({ type: report.type, rtt: report.currentRoundTripTime, availableOutgoingBitrate: report.availableOutgoingBitrate });
    }
  }

  els.rawStats.textContent = JSON.stringify(summary, null, 2);
}

async function start() {
  try {
    assertSupport();
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    els.local.srcObject = stream;
    await connectLoopback();
    timer = window.setInterval(refreshStats, 1000);
    await refreshStats();
    els.start.disabled = true;
    els.stop.disabled = false;
  } catch (error) {
    els.rawStats.textContent = `启动失败：${error.message}`;
  }
}

function stop() {
  window.clearInterval(timer);
  stream?.getTracks().forEach((track) => track.stop());
  localPeer?.close();
  remotePeer?.close();
  stream = undefined;
  localPeer = undefined;
  remotePeer = undefined;
  timer = undefined;
  lastBytes = 0;
  lastTimestamp = 0;
  els.local.srcObject = null;
  els.remote.srcObject = null;
  updateLifecycle();
  els.bitrate.textContent = '0 kbps';
  els.frames.textContent = '0 fps';
  els.rtt.textContent = '未知';
  els.candidatePair.textContent = '未选择';
  els.rawStats.textContent = '诊断已停止。';
  els.start.disabled = false;
  els.stop.disabled = true;
}

els.start.addEventListener('click', start);
els.stop.addEventListener('click', stop);
updateLifecycle();
