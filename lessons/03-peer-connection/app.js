const startMediaButton = document.querySelector('#startMediaButton');
const connectButton = document.querySelector('#connectButton');
const stopButton = document.querySelector('#stopButton');
const localVideo = document.querySelector('#localVideo');
const remoteVideo = document.querySelector('#remoteVideo');
const logOutput = document.querySelector('#logOutput');

let localStream;
let callerPeer;
let calleePeer;

function log(message) {
  const time = new Date().toLocaleTimeString();
  logOutput.textContent += `\n[${time}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function setButtons({ mediaReady = false, connected = false } = {}) {
  startMediaButton.disabled = Boolean(localStream);
  connectButton.disabled = !mediaReady || connected;
  stopButton.disabled = !mediaReady && !connected;
}

async function startLocalMedia() {
  try {
    // 中文注释：先拿到本地媒体流，后续再把轨道加入 RTCPeerConnection。
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    logOutput.textContent = '本地媒体已启动。';
    setButtons({ mediaReady: true });
  } catch (error) {
    log(`无法启动摄像头/麦克风：${error.message}`);
  }
}

function createPeerPair() {
  callerPeer = new RTCPeerConnection();
  calleePeer = new RTCPeerConnection();

  // 中文注释：本地 demo 直接把 ICE 候选交给另一端，模拟“信令传输候选”。
  callerPeer.addEventListener('icecandidate', async ({ candidate }) => {
    if (!candidate) return log('呼叫端 ICE 候选收集完成。');
    await calleePeer.addIceCandidate(candidate);
    log('呼叫端候选已交给接听端。');
  });

  calleePeer.addEventListener('icecandidate', async ({ candidate }) => {
    if (!candidate) return log('接听端 ICE 候选收集完成。');
    await callerPeer.addIceCandidate(candidate);
    log('接听端候选已交给呼叫端。');
  });

  // 中文注释：远端收到媒体轨道后，把第一条远端流挂到 video 元素上播放。
  calleePeer.addEventListener('track', ({ streams }) => {
    remoteVideo.srcObject = streams[0];
    log('接听端收到远端媒体轨道。');
  });

  for (const peer of [callerPeer, calleePeer]) {
    peer.addEventListener('connectionstatechange', () => {
      log(`连接状态变为：${peer.connectionState}`);
    });
    peer.addEventListener('signalingstatechange', () => {
      log(`信令状态变为：${peer.signalingState}`);
    });
  }
}

async function connectPeers() {
  if (!localStream) return;
  createPeerPair();

  // 中文注释：每条本地媒体轨道都要显式加入连接，浏览器才会在 SDP 中声明它。
  for (const track of localStream.getTracks()) {
    callerPeer.addTrack(track, localStream);
  }

  const offer = await callerPeer.createOffer();
  await callerPeer.setLocalDescription(offer);
  log('呼叫端创建并设置本地 offer。');

  await calleePeer.setRemoteDescription(callerPeer.localDescription);
  log('接听端设置远端 offer。');

  const answer = await calleePeer.createAnswer();
  await calleePeer.setLocalDescription(answer);
  log('接听端创建并设置本地 answer。');

  await callerPeer.setRemoteDescription(calleePeer.localDescription);
  log('呼叫端设置远端 answer，协商完成。');
  setButtons({ mediaReady: true, connected: true });
}

function stopExperiment() {
  // 中文注释：关闭连接和媒体轨道，避免摄像头继续占用或旧连接影响下一次实验。
  callerPeer?.close();
  calleePeer?.close();
  callerPeer = undefined;
  calleePeer = undefined;
  localStream?.getTracks().forEach((track) => track.stop());
  localStream = undefined;
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  log('实验已停止并清理资源。');
  setButtons();
}

startMediaButton.addEventListener('click', startLocalMedia);
connectButton.addEventListener('click', connectPeers);
stopButton.addEventListener('click', stopExperiment);
