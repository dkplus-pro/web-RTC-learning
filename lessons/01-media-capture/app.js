const preview = document.querySelector('#preview');
const emptyState = document.querySelector('#emptyState');
const statusOutput = document.querySelector('#status');
const trackList = document.querySelector('#trackList');
const stopButton = document.querySelector('#stop');
const secureContextBadge = document.querySelector('#secureContextBadge');

let activeStream = null;

const captureModes = {
  startAv: { audio: true, video: true },
  startVideo: { audio: false, video: true },
  startAudio: { audio: true, video: false },
};

function setStatus(message, tone = 'info') {
  statusOutput.textContent = message;
  statusOutput.classList.toggle('error', tone === 'error');
}

function setSecureContextBadge() {
  const hasMediaDevices = Boolean(navigator.mediaDevices?.getUserMedia);
  if (window.isSecureContext && hasMediaDevices) {
    secureContextBadge.textContent = 'Secure context ready';
    secureContextBadge.className = 'badge ok';
    return;
  }

  secureContextBadge.textContent = hasMediaDevices ? 'HTTPS/localhost required' : 'MediaDevices unavailable';
  secureContextBadge.className = 'badge warn';
}

function stopActiveStream() {
  if (!activeStream) return;

  // Stopping every track is the important privacy/resource step. Clearing srcObject alone
  // only detaches the preview and can leave camera hardware active.
  for (const track of activeStream.getTracks()) {
    track.stop();
  }

  activeStream = null;
  preview.srcObject = null;
  stopButton.disabled = true;
  emptyState.hidden = false;
  renderTrackList();
  setStatus('All local media tracks stopped.');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&#039;');
}

function describeValue(value) {
  if (value === undefined || value === '') return 'not reported';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function renderTrackList() {
  if (!activeStream) {
    trackList.innerHTML = '<p class="track-empty">No active stream. Start capture to inspect track metadata.</p>';
    return;
  }

  const cards = activeStream.getTracks().map((track) => {
    const settings = track.getSettings();
    return `
      <article class="track-card">
        <h3>${track.kind.toUpperCase()} track</h3>
        <dl>
          <dt>Label</dt><dd>${escapeHtml(describeValue(track.label))}</dd>
          <dt>ID</dt><dd>${escapeHtml(track.id)}</dd>
          <dt>Ready state</dt><dd>${escapeHtml(track.readyState)}</dd>
          <dt>Enabled</dt><dd>${escapeHtml(track.enabled)}</dd>
          <dt>Muted</dt><dd>${escapeHtml(track.muted)}</dd>
          <dt>Settings</dt><dd><code>${escapeHtml(describeValue(settings))}</code></dd>
        </dl>
      </article>`;
  });

  trackList.innerHTML = cards.join('');
}

async function startCapture(constraints) {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus('This browser does not expose navigator.mediaDevices.getUserMedia().', 'error');
    return;
  }

  setStatus('Requesting media permission…');
  stopActiveStream();

  try {
    activeStream = await navigator.mediaDevices.getUserMedia(constraints);
    preview.srcObject = activeStream;
    stopButton.disabled = false;
    emptyState.hidden = true;

    for (const track of activeStream.getTracks()) {
      // Re-render when a user revokes permission or hardware disappears mid-session.
      track.addEventListener('ended', renderTrackList);
      track.addEventListener('mute', renderTrackList);
      track.addEventListener('unmute', renderTrackList);
    }

    renderTrackList();
    setStatus(`Captured ${activeStream.getTracks().length} track(s). Inspect the inventory below.`);
  } catch (error) {
    activeStream = null;
    preview.srcObject = null;
    stopButton.disabled = true;
    emptyState.hidden = false;
    renderTrackList();
    setStatus(`${error.name}: ${error.message || 'Media capture failed.'}`, 'error');
  }
}

for (const [buttonId, constraints] of Object.entries(captureModes)) {
  document.querySelector(`#${buttonId}`).addEventListener('click', () => startCapture(constraints));
}

stopButton.addEventListener('click', stopActiveStream);
window.addEventListener('pagehide', stopActiveStream);

setSecureContextBadge();
renderTrackList();
