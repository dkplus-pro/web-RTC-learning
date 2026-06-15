const preview = document.querySelector('#preview');
const statusOutput = document.querySelector('#status');
const videoDeviceSelect = document.querySelector('#videoDevice');
const audioDeviceSelect = document.querySelector('#audioDevice');
const requestedConstraints = document.querySelector('#requestedConstraints');
const actualSettings = document.querySelector('#actualSettings');
const capabilitiesOutput = document.querySelector('#capabilities');
const startButton = document.querySelector('#start');
const applyButton = document.querySelector('#apply');
const stopButton = document.querySelector('#stop');

const controls = {
  width: document.querySelector('#width'),
  height: document.querySelector('#height'),
  frameRate: document.querySelector('#frameRate'),
};

let activeStream = null;

function setStatus(message, tone = 'info') {
  statusOutput.textContent = message;
  statusOutput.classList.toggle('error', tone === 'error');
}

function asNumber(control) {
  return Number.parseInt(control.value, 10);
}

function renderRangeValues() {
  document.querySelector('#widthValue').textContent = controls.width.value;
  document.querySelector('#heightValue').textContent = controls.height.value;
  document.querySelector('#frameRateValue').textContent = controls.frameRate.value;
}

function selectedDeviceConstraint(select) {
  // Use exact device constraints only after the user picks a concrete device.
  // Leaving it undefined lets the browser choose the best default.
  return select.value ? { exact: select.value } : undefined;
}

function buildConstraints() {
  const video = {
    width: { ideal: asNumber(controls.width) },
    height: { ideal: asNumber(controls.height) },
    frameRate: { ideal: asNumber(controls.frameRate), max: 60 },
  };

  const videoDeviceId = selectedDeviceConstraint(videoDeviceSelect);
  if (videoDeviceId) video.deviceId = videoDeviceId;

  const audio = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  const audioDeviceId = selectedDeviceConstraint(audioDeviceSelect);
  if (audioDeviceId) audio.deviceId = audioDeviceId;

  return { audio, video };
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function getVideoTrack() {
  return activeStream?.getVideoTracks()[0] ?? null;
}

function renderInspection() {
  const constraints = buildConstraints();
  requestedConstraints.textContent = pretty(constraints);

  if (!activeStream) {
    actualSettings.textContent = 'No active stream.';
    capabilitiesOutput.textContent = 'No active video track.';
    return;
  }

  const settings = activeStream.getTracks().reduce((acc, track) => {
    acc[track.kind] = track.getSettings();
    return acc;
  }, {});
  actualSettings.textContent = pretty(settings);

  const videoTrack = getVideoTrack();
  capabilitiesOutput.textContent = videoTrack?.getCapabilities
    ? pretty(videoTrack.getCapabilities())
    : 'This browser does not expose getCapabilities() for the active video track.';
}

function stopActiveStream() {
  if (!activeStream) return;
  for (const track of activeStream.getTracks()) track.stop();
  activeStream = null;
  preview.srcObject = null;
  applyButton.disabled = true;
  stopButton.disabled = true;
  renderInspection();
  setStatus('Stopped active media tracks.');
}

function fillSelect(select, devices, fallbackLabel) {
  const currentValue = select.value;
  select.innerHTML = '<option value="">Browser default</option>';

  for (const [index, device] of devices.entries()) {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = device.label || `${fallbackLabel} ${index + 1}`;
    select.append(option);
  }

  if ([...select.options].some((option) => option.value === currentValue)) {
    select.value = currentValue;
  }
}

async function refreshDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    setStatus('This browser does not support enumerateDevices().', 'error');
    return;
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  fillSelect(videoDeviceSelect, devices.filter((device) => device.kind === 'videoinput'), 'Camera');
  fillSelect(audioDeviceSelect, devices.filter((device) => device.kind === 'audioinput'), 'Microphone');
  renderInspection();
  setStatus(`Detected ${devices.length} media device entries. Labels may require permission.`);
}

async function unlockDeviceLabels() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus('This browser does not support getUserMedia().', 'error');
    return;
  }

  try {
    setStatus('Requesting temporary permission to unlock device labels…');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    // Stop immediately: the goal is label discovery, not a long-running preview.
    for (const track of stream.getTracks()) track.stop();
    await refreshDevices();
    setStatus('Device labels unlocked. Choose devices and start constrained capture.');
  } catch (error) {
    setStatus(`${error.name}: ${error.message || 'Unable to unlock media devices.'}`, 'error');
  }
}

async function startCapture() {
  stopActiveStream();
  const constraints = buildConstraints();
  requestedConstraints.textContent = pretty(constraints);

  try {
    setStatus('Requesting media with selected constraints…');
    activeStream = await navigator.mediaDevices.getUserMedia(constraints);
    preview.srcObject = activeStream;
    applyButton.disabled = !getVideoTrack()?.applyConstraints;
    stopButton.disabled = false;
    renderInspection();
    setStatus('Capture started. Compare requested constraints with actual settings.');
  } catch (error) {
    const hint = error.name === 'OverconstrainedError'
      ? ` Constraint '${error.constraint}' could not be satisfied; try lower quality or Browser default devices.`
      : '';
    setStatus(`${error.name}: ${error.message || 'Constrained capture failed.'}${hint}`, 'error');
    renderInspection();
  }
}

async function applyToActiveVideoTrack() {
  const videoTrack = getVideoTrack();
  if (!videoTrack?.applyConstraints) {
    setStatus('No active video track supports applyConstraints().', 'error');
    return;
  }

  const { video } = buildConstraints();
  requestedConstraints.textContent = pretty(video);

  try {
    await videoTrack.applyConstraints(video);
    renderInspection();
    setStatus('Applied constraints to the active video track.');
  } catch (error) {
    const hint = error.name === 'OverconstrainedError'
      ? ` Constraint '${error.constraint}' could not be satisfied by this active track.`
      : '';
    setStatus(`${error.name}: ${error.message || 'Unable to apply constraints.'}${hint}`, 'error');
  }
}

for (const control of Object.values(controls)) {
  control.addEventListener('input', () => {
    renderRangeValues();
    renderInspection();
  });
}

videoDeviceSelect.addEventListener('change', renderInspection);
audioDeviceSelect.addEventListener('change', renderInspection);
document.querySelector('#unlockDevices').addEventListener('click', unlockDeviceLabels);
document.querySelector('#refreshDevices').addEventListener('click', refreshDevices);
startButton.addEventListener('click', startCapture);
applyButton.addEventListener('click', applyToActiveVideoTrack);
stopButton.addEventListener('click', stopActiveStream);
window.addEventListener('pagehide', stopActiveStream);
navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);

renderRangeValues();
renderInspection();
refreshDevices().catch((error) => setStatus(`${error.name}: ${error.message}`, 'error'));
