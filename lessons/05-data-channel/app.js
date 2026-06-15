const connectButton = document.querySelector('#connectButton');
const closeButton = document.querySelector('#closeButton');
const leftForm = document.querySelector('#leftForm');
const rightForm = document.querySelector('#rightForm');
const leftInput = document.querySelector('#leftInput');
const rightInput = document.querySelector('#rightInput');
const leftSendButton = document.querySelector('#leftSendButton');
const rightSendButton = document.querySelector('#rightSendButton');
const leftMessages = document.querySelector('#leftMessages');
const rightMessages = document.querySelector('#rightMessages');
const logOutput = document.querySelector('#logOutput');

let leftPeer;
let rightPeer;
let leftChannel;
let rightChannel;

function log(message) {
  const time = new Date().toLocaleTimeString();
  logOutput.textContent += `\n[${time}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function addMessage(container, text, sent) {
  const bubble = document.createElement('p');
  bubble.className = `message${sent ? ' sent' : ''}`;
  bubble.textContent = text;
  container.append(bubble);
  container.scrollTop = container.scrollHeight;
}

function setChatEnabled(enabled) {
  leftInput.disabled = !enabled;
  rightInput.disabled = !enabled;
  leftSendButton.disabled = !enabled;
  rightSendButton.disabled = !enabled;
  closeButton.disabled = !enabled;
  connectButton.disabled = enabled;
}

function wirePeerCandidates() {
  // 中文注释：本地页面直接互换 ICE 候选；真实产品应通过信令服务转发。
  leftPeer.addEventListener('icecandidate', async ({ candidate }) => {
    if (candidate) await rightPeer.addIceCandidate(candidate);
  });
  rightPeer.addEventListener('icecandidate', async ({ candidate }) => {
    if (candidate) await leftPeer.addIceCandidate(candidate);
  });
}

function wireChannel(channel, side) {
  channel.addEventListener('open', () => {
    log(`${side} 数据通道已打开。`);
    setChatEnabled(leftChannel?.readyState === 'open' && rightChannel?.readyState === 'open');
  });

  channel.addEventListener('close', () => {
    log(`${side} 数据通道已关闭。`);
    setChatEnabled(false);
  });

  channel.addEventListener('message', ({ data }) => {
    // 中文注释：收到消息时只更新接收端视图，发送端视图在 sendMessage 中立即更新。
    if (side === '左侧') addMessage(leftMessages, data, false);
    if (side === '右侧') addMessage(rightMessages, data, false);
    log(`${side} 收到消息：${data}`);
  });
}

async function connectDataChannel() {
  leftPeer = new RTCPeerConnection();
  rightPeer = new RTCPeerConnection();
  wirePeerCandidates();

  // 中文注释：通常由 offer 端主动创建数据通道，answer 端通过 datachannel 事件接收。
  leftChannel = leftPeer.createDataChannel('architect-chat', { ordered: true });
  wireChannel(leftChannel, '左侧');

  rightPeer.addEventListener('datachannel', ({ channel }) => {
    rightChannel = channel;
    wireChannel(rightChannel, '右侧');
    log('右侧端点接收到数据通道。');
  });

  for (const [name, peer] of [['左侧', leftPeer], ['右侧', rightPeer]]) {
    peer.addEventListener('connectionstatechange', () => log(`${name} 连接状态：${peer.connectionState}`));
  }

  const offer = await leftPeer.createOffer();
  await leftPeer.setLocalDescription(offer);
  await rightPeer.setRemoteDescription(leftPeer.localDescription);

  const answer = await rightPeer.createAnswer();
  await rightPeer.setLocalDescription(answer);
  await leftPeer.setRemoteDescription(rightPeer.localDescription);

  logOutput.textContent = '数据通道协商已完成，等待通道打开……';
}

function sendMessage(channel, input, ownContainer, remoteName) {
  const text = input.value.trim();
  if (!text || channel?.readyState !== 'open') return;

  // 中文注释：DataChannel 的 send 是点对点发送；需要先确认通道处于 open 状态。
  channel.send(text);
  addMessage(ownContainer, text, true);
  log(`已向${remoteName}发送：${text}`);
  input.value = '';
}

function closeConnection() {
  // 中文注释：关闭顺序从通道到连接，便于 UI 及时收到 close 事件。
  leftChannel?.close();
  rightChannel?.close();
  leftPeer?.close();
  rightPeer?.close();
  leftChannel = undefined;
  rightChannel = undefined;
  leftPeer = undefined;
  rightPeer = undefined;
  setChatEnabled(false);
  log('连接已关闭。');
}

connectButton.addEventListener('click', connectDataChannel);
closeButton.addEventListener('click', closeConnection);
leftForm.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage(leftChannel, leftInput, leftMessages, '右侧');
});
rightForm.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage(rightChannel, rightInput, rightMessages, '左侧');
});
