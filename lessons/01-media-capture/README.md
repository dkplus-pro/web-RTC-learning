# Lesson 01 — Media capture and the browser permission model

This lesson starts the course at the WebRTC boundary that every production system touches first: the browser's local media pipeline. Before signaling, ICE, or peer connections exist, a WebRTC app must request access to camera and microphone hardware, explain the permission trade-off, attach a `MediaStream` to the UI, and cleanly stop tracks when the session ends.

## Learning goals

By the end of this lesson you should be able to:

- Explain why `getUserMedia()` requires a secure context and a user-mediated permission prompt.
- Request audio and video without assuming that devices, labels, or permissions are already available.
- Inspect `MediaStreamTrack` state, kind, id, label, muted/enabled flags, and settings.
- Release hardware resources by stopping tracks instead of only hiding the preview element.
- Design a media-capture boundary that can later feed `RTCPeerConnection`, recording, screen share, or local analysis flows.

## Architectural framing for senior frontend engineers

Treat local media capture as an infrastructure boundary, not as a button handler:

1. **Capability detection** — confirm `navigator.mediaDevices.getUserMedia` exists before rendering a capture flow.
2. **Permission intent** — ask for the smallest useful constraint set and explain why the app needs it.
3. **Stream ownership** — centralize stream lifecycle so every track is stopped on teardown, navigation, or retry.
4. **Observable state** — surface track settings and errors for debugging; do not collapse everything into "camera failed".
5. **Privacy by design** — never keep a camera/microphone active after the user has stopped the lesson demo.

This pattern maps cleanly to larger systems: a media service owns capture, a UI layer owns preview, and downstream WebRTC components consume streams through explicit handoff points.

## Run the demo

From this lesson directory:

```bash
python3 -m http.server 5101
```

Then open <http://localhost:5101>. `localhost` is considered a secure context by modern browsers, so camera/microphone APIs are available without HTTPS during local development.

## Demo walkthrough

1. Click **Start camera + microphone** and approve the browser prompt.
2. Observe the local preview and the generated track inventory.
3. Try video-only or audio-only capture to see how track shape changes.
4. Click **Stop all tracks** and confirm the browser camera indicator turns off.
5. Read the error panel if permissions are denied or no device is available.

## Production notes

- Permission prompts are user-agent UI; the app can request but cannot force access.
- Device labels are often blank until the user grants media permission.
- A `MediaStream` can hold multiple tracks. Stopping one track does not automatically stop all tracks.
- `track.enabled = false` pauses contribution to a stream but does not release the hardware. Use `track.stop()` for teardown.
- Capture should be retriable. Browsers, OS privacy settings, and device hot-plugging can change availability during a session.

## Checkpoint questions

- Where would you put stream lifecycle ownership in a complex React/Vue application?
- How would you prevent a route transition from leaking active camera access?
- Which errors should be shown to users, and which should be logged for support diagnostics?
