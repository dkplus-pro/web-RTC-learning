const startButton = document.querySelector('#startButton');
const sessionButton = document.querySelector('#sessionButton');
const iceButton = document.querySelector('#iceButton');
const resetButton = document.querySelector('#resetButton');
const localVideo = document.querySelector('#localVideo');
const remoteVideo = document.querySelector('#remoteVideo');
const signalList = document.querySelector('#signalList');
const logOutput = document.querySelector('#logOutput');

let localStream;
let leftPeer;
let rightPeer;
const pendingIceSignals = [];

function log(message) {
  const time = new Date().toLocaleTimeString();
  logOutput.textContent += `\n[${time}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function renderSignal(type, direction) {
  const item = document.createElement('li');
  item.textContent = `${direction}：${type}`;
  signalList.append(item);
}

function setButtons(state) {
  startButton.disabled = Boolean(localStream);
  sessionButton.disabled = !state.mediaReady || state.sessionReady;
  iceButton.disabled = !state.sessionReady || pendingIceSignals.length === 0;
  resetButton.disabled = !state.mediaReady && !state.sessionReady;
}

async function startMedia() {
  try {
    // 中文注释：本课仍然使用真实媒体轨道，便于观察 ICE 连通后远端画面出现。
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    logOutput.textContent = '本地媒体已启动。';
    setButtons({ mediaReady: true, sessionReady: false });
  } catch (error) {
    log(`媒体启动失败：${error.message}`);
  }
}

function createPeers() {
  // 中文注释：不配置外部 STUN/TURN，保证本地 demo 不依赖第三方服务。
  leftPeer = new RTCPeerConnection();
  rightPeer = new RTCPeerConnection();

  leftPeer.addEventListener('icecandidate', ({ candidate }) => {
    if (!candidate) return log('左侧端点 ICE 收集完成。');
    pendingIceSignals.push({ from: 'left', candidate });
    renderSignal('ICE candidate', '左侧 → 右侧');
    setButtons({ mediaReady: true, sessionReady: true });
  });

  rightPeer.addEventListener('icecandidate', ({ candidate }) => {
    if (!candidate) return log('右侧端点 ICE 收集完成。');
    pendingIceSignals.push({ from: 'right', candidate });
    renderSignal('ICE candidate', '右侧 → 左侧');
    setButtons({ mediaReady: true, sessionReady: true });
  });

  rightPeer.addEventListener('track', ({ streams }) => {
    remoteVideo.srcObject = streams[0];
    log('右侧端点收到媒体轨道。');
  });

  for (const [name, peer] of [['左侧', leftPeer], ['右侧', rightPeer]]) {
    peer.addEventListener('iceconnectionstatechange', () => log(`${name} ICE 状态：${peer.iceConnectionState}`));
    peer.addEventListener('connectionstatechange', () => log(`${name} 连接状态：${peer.connectionState}`));
  }
}

async function createSession() {
  createPeers();

  // 中文注释：把本地轨道加入左侧端点，随后 SDP offer 会携带媒体意图。
  for (const track of localStream.getTracks()) {
    leftPeer.addTrack(track, localStream);
  }

  const offer = await leftPeer.createOffer();
  await leftPeer.setLocalDescription(offer);
  renderSignal('SDP offer', '左侧 → 右侧');
  await rightPeer.setRemoteDescription(leftPeer.localDescription);
  log('右侧端点已接收 offer。');

  const answer = await rightPeer.createAnswer();
  await rightPeer.setLocalDescription(answer);
  renderSignal('SDP answer', '右侧 → 左侧');
  await leftPeer.setRemoteDescription(rightPeer.localDescription);
  log('左侧端点已接收 answer。');

  setButtons({ mediaReady: true, sessionReady: true });
}

async function exchangeIceCandidates() {
  // 中文注释：真实信令服务器会转发这些候选；这里用数组模拟待投递消息。
  const signals = pendingIceSignals.splice(0);
  for (const signal of signals) {
    if (signal.from === 'left') {
      await rightPeer.addIceCandidate(signal.candidate);
      log('右侧端点已添加左侧 ICE 候选。');
    } else {
      await leftPeer.addIceCandidate(signal.candidate);
      log('左侧端点已添加右侧 ICE 候选。');
    }
  }
  setButtons({ mediaReady: true, sessionReady: true });
}

function resetExperiment() {
  // 中文注释：重置时清理连接、媒体轨道和信令队列，避免旧候选污染下一轮实验。
  leftPeer?.close();
  rightPeer?.close();
  leftPeer = undefined;
  rightPeer = undefined;
  localStream?.getTracks().forEach((track) => track.stop());
  localStream = undefined;
  pendingIceSignals.length = 0;
  signalList.replaceChildren();
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  log('实验已重置。');
  setButtons({ mediaReady: false, sessionReady: false });
}

startButton.addEventListener('click', startMedia);
sessionButton.addEventListener('click', createSession);
iceButton.addEventListener('click', exchangeIceCandidates);
resetButton.addEventListener('click', resetExperiment);
