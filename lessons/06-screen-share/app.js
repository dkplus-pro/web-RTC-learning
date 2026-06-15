const els = {
  startCamera: document.querySelector('#startCamera'),
  shareScreen: document.querySelector('#shareScreen'),
  backToCamera: document.querySelector('#backToCamera'),
  stopAll: document.querySelector('#stopAll'),
  localVideo: document.querySelector('#localVideo'),
  remoteVideo: document.querySelector('#remoteVideo'),
  localState: document.querySelector('#localState'),
  remoteState: document.querySelector('#remoteState'),
  activeTrack: document.querySelector('#activeTrack'),
  log: document.querySelector('#log'),
};

let cameraStream;
let screenStream;
let localPeer;
let remotePeer;
let videoSender;

function writeLog(message) {
  const time = new Date().toLocaleTimeString();
  els.log.textContent = `[${time}] ${message}\n${els.log.textContent}`;
}

function requireMediaDevices() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('当前浏览器不支持 MediaDevices API，或页面不是安全上下文。请使用 localhost/HTTPS。');
  }
}

function setButtons(connected) {
  els.startCamera.disabled = connected;
  els.shareScreen.disabled = !connected || !navigator.mediaDevices?.getDisplayMedia;
  els.backToCamera.disabled = !connected || !screenStream;
  els.stopAll.disabled = !connected;
}

async function buildLoopbackConnection(stream) {
  // 两个 PeerConnection 在同一个页面内互连，用来模拟“本地用户”和“远端用户”。
  localPeer = new RTCPeerConnection();
  remotePeer = new RTCPeerConnection();

  localPeer.onconnectionstatechange = () => {
    els.localState.textContent = localPeer.connectionState;
  };
  remotePeer.onconnectionstatechange = () => {
    els.remoteState.textContent = remotePeer.connectionState;
  };

  localPeer.onicecandidate = ({ candidate }) => candidate && remotePeer.addIceCandidate(candidate);
  remotePeer.onicecandidate = ({ candidate }) => candidate && localPeer.addIceCandidate(candidate);
  remotePeer.ontrack = ({ streams }) => {
    els.remoteVideo.srcObject = streams[0];
    writeLog('远端收到新的媒体轨。');
  };

  for (const track of stream.getTracks()) {
    const sender = localPeer.addTrack(track, stream);
    if (track.kind === 'video') videoSender = sender;
  }

  const offer = await localPeer.createOffer();
  await localPeer.setLocalDescription(offer);
  await remotePeer.setRemoteDescription(offer);
  const answer = await remotePeer.createAnswer();
  await remotePeer.setLocalDescription(answer);
  await localPeer.setRemoteDescription(answer);
}

async function startCamera() {
  try {
    requireMediaDevices();
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    els.localVideo.srcObject = cameraStream;
    await buildLoopbackConnection(cameraStream);
    els.activeTrack.textContent = cameraStream.getVideoTracks()[0]?.label || '摄像头视频轨';
    setButtons(true);
    writeLog('摄像头启动，loopback 连接已建立。');
  } catch (error) {
    writeLog(`启动失败：${error.message}`);
  }
}

async function shareScreen() {
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const [screenTrack] = screenStream.getVideoTracks();
    if (!screenTrack || !videoSender) return;

    // replaceTrack 是本课核心：替换发送源，但保持 PeerConnection、ICE 和远端订阅不变。
    await videoSender.replaceTrack(screenTrack);
    els.localVideo.srcObject = screenStream;
    els.activeTrack.textContent = screenTrack.label || '屏幕共享轨';
    els.backToCamera.disabled = false;
    writeLog('已把发送视频轨替换为屏幕共享。');

    // 用户从浏览器共享条停止屏幕时，要主动恢复或更新 UI。
    screenTrack.onended = () => {
      writeLog('浏览器通知屏幕共享已结束。');
      backToCamera();
    };
  } catch (error) {
    writeLog(`屏幕共享失败：${error.message}`);
  }
}

async function backToCamera() {
  const [cameraTrack] = cameraStream?.getVideoTracks() ?? [];
  if (!cameraTrack || !videoSender) return;
  await videoSender.replaceTrack(cameraTrack);
  els.localVideo.srcObject = cameraStream;
  els.activeTrack.textContent = cameraTrack.label || '摄像头视频轨';
  screenStream?.getTracks().forEach((track) => track.stop());
  screenStream = undefined;
  els.backToCamera.disabled = true;
  writeLog('已切回摄像头视频轨。');
}

function stopAll() {
  for (const stream of [cameraStream, screenStream]) stream?.getTracks().forEach((track) => track.stop());
  localPeer?.close();
  remotePeer?.close();
  cameraStream = undefined;
  screenStream = undefined;
  localPeer = undefined;
  remotePeer = undefined;
  videoSender = undefined;
  els.localVideo.srcObject = null;
  els.remoteVideo.srcObject = null;
  els.localState.textContent = 'closed';
  els.remoteState.textContent = 'closed';
  els.activeTrack.textContent = '无';
  setButtons(false);
  writeLog('已停止所有媒体轨并关闭连接。');
}

els.startCamera.addEventListener('click', startCamera);
els.shareScreen.addEventListener('click', shareScreen);
els.backToCamera.addEventListener('click', backToCamera);
els.stopAll.addEventListener('click', stopAll);
setButtons(false);
