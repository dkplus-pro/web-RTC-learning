const stages = {
  prototype: {
    title: '单房间原型',
    summary: '最小系统只需要浏览器、信令通道和 STUN。目标是验证 offer/answer、ICE 和媒体权限，而不是一次性做成会议平台。',
    nodes: ['浏览器 A', '信令服务', '浏览器 B', '公共 STUN'],
    decisions: ['信令只传 SDP 与 candidate，不承载媒体。', '房间状态先保持内存化，便于快速迭代。', '只支持两人通话，避免 Mesh 复杂度提前出现。'],
    risks: ['刷新页面导致房间状态丢失。', '企业网络或对称 NAT 下可能需要 TURN。', '缺少鉴权会让房间号变成安全边界。'],
  },
  mesh: {
    title: '多人 Mesh',
    summary: 'Mesh 让每个浏览器都和其他浏览器直连。它适合小房间，但上行带宽和 PeerConnection 数量会随人数快速增长。',
    nodes: ['用户 1', '用户 2', '用户 3', '用户 4', '信令服务'],
    decisions: ['限制房间人数，避免上行带宽爆炸。', '对每个 peer 独立维护连接状态和重连策略。', '通过 UI 暴露网络质量，降低黑盒体验。'],
    risks: ['4 人以上 CPU、带宽、调试复杂度明显上升。', '任意一端弱网都会影响多条连接。', '录制和审核缺少服务端媒体入口。'],
  },
  sfu: {
    title: 'SFU 生产化',
    summary: 'SFU 接收每个用户的一路或多路上行，再按订阅关系转发给其他用户。它是多人会议、录制和质量控制的核心组件。',
    nodes: ['浏览器客户端', '信令/房间服务', 'SFU 集群', 'TURN 服务', '录制/转码流水线'],
    decisions: ['将房间控制面和媒体转发面拆开部署。', '使用 simulcast/SVC 支持不同下行能力。', '按地域部署 SFU，缩短媒体路径。'],
    risks: ['SFU 运维、扩缩容和容量预估复杂。', 'TURN 与 SFU 流量成本需要持续监控。', '服务端媒体入口引入新的隐私与合规责任。'],
  },
  ops: {
    title: '质量与安全运营',
    summary: '生产 WebRTC 的长期价值来自可观测性、安全和运营闭环。没有指标和审计，问题只能靠用户截图复现。',
    nodes: ['客户端 SDK', '指标采集', '告警平台', '审计日志', '安全策略'],
    decisions: ['定义稳定的质量事件 schema。', '日志脱敏，避免上传 SDP 中的敏感网络信息。', 'TURN 凭证短期签发，服务端校验房间权限。'],
    risks: ['过度采集会触碰隐私和合规红线。', '没有按设备/网络维度聚合会误判根因。', '安全策略只在前端实现会被绕过。'],
  },
};

const els = {
  buttons: [...document.querySelectorAll('[data-stage]')],
  diagram: document.querySelector('#diagram'),
  stageTitle: document.querySelector('#stageTitle'),
  stageSummary: document.querySelector('#stageSummary'),
  decisions: document.querySelector('#decisions'),
  risks: document.querySelector('#risks'),
};

function renderList(target, items) {
  target.replaceChildren(...items.map((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    return li;
  }));
}

function renderDiagram(nodes) {
  const fragments = [];
  nodes.forEach((name, index) => {
    const node = document.createElement('div');
    node.className = 'node';
    node.innerHTML = `<strong>${index + 1}. ${name}</strong><span>${describeNode(name)}</span>`;
    fragments.push(node);
    if (index < nodes.length - 1) {
      const edge = document.createElement('div');
      edge.className = 'edge';
      fragments.push(edge);
    }
  });
  els.diagram.replaceChildren(...fragments);
}

function describeNode(name) {
  // 这里保持纯前端静态逻辑，方便用任何 localhost 静态服务器独立运行。
  if (name.includes('信令')) return '控制面：交换 SDP、candidate、房间事件。';
  if (name.includes('TURN')) return '网络兜底：当直连失败时中继 UDP/TCP/TLS。';
  if (name.includes('SFU')) return '媒体面：接收 RTP，再按订阅关系转发。';
  if (name.includes('指标') || name.includes('告警')) return '观测面：把 getStats 与业务事件关联。';
  return '客户端或业务组件：承载用户体验与权限边界。';
}

function selectStage(name) {
  const stage = stages[name];
  els.buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.stage === name)));
  els.stageTitle.textContent = stage.title;
  els.stageSummary.textContent = stage.summary;
  renderDiagram(stage.nodes);
  renderList(els.decisions, stage.decisions);
  renderList(els.risks, stage.risks);
}

els.buttons.forEach((button) => {
  button.addEventListener('click', () => selectStage(button.dataset.stage));
});
selectStage('prototype');
