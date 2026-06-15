# Lesson 02 — Device selection and media constraints

Lesson 01 captured the default camera and microphone. Real WebRTC products need more control: users may have multiple cameras, headsets, virtual devices, capture cards, and OS-level privacy controls. This lesson focuses on `enumerateDevices()`, device labels, `MediaTrackConstraints`, `getSettings()`, `getCapabilities()`, and constraint failure handling.

## Learning goals

By the end of this lesson you should be able to:

- Explain why device labels may be hidden before permission is granted.
- Populate camera and microphone pickers from `enumerateDevices()`.
- Build constraint objects from user intent without over-constraining the request.
- Inspect actual track settings after negotiation.
- Use `applyConstraints()` to update an existing video track when the browser supports it.
- Interpret `OverconstrainedError` as a negotiation signal rather than a generic crash.

## Constraint strategy

A senior frontend architecture decision is not just "which sliders do we show?" It is where policy lives:

- **Product intent:** default to a reasonable baseline such as 1280×720 at 30 fps.
- **User intent:** honor selected devices and quality preferences.
- **Browser negotiation:** use ideal constraints when flexibility is acceptable; reserve exact constraints for hard requirements.
- **Runtime observability:** compare requested constraints to `track.getSettings()` to learn what actually happened.
- **Fallbacks:** if a strict request fails, retry with softer constraints or let the user choose a lower profile.

## Run the demo

From this lesson directory:

```bash
python3 -m http.server 5102
```

Then open <http://localhost:5102>. Click **Unlock devices** first so browsers can reveal labels for cameras and microphones.

## Demo walkthrough

1. Click **Unlock devices** and allow media access. The temporary stream is stopped immediately after labels become available.
2. Choose a camera and microphone from the detected device lists.
3. Adjust width, height, and frame-rate preferences.
4. Start capture to request a stream with those constraints.
5. Change the quality controls and click **Apply to active video track** to update the existing track.
6. Compare the requested constraints with actual settings and capabilities.

## Production notes

- `deviceId: { exact }` is strict. Use it only when the user explicitly selected a device.
- `width`, `height`, and `frameRate` with `ideal` values let the browser choose the closest viable mode.
- `getCapabilities()` is not equally rich across every browser/device. Always guard optional fields.
- Device lists can change while the page is open. Listen for `devicechange` and refresh selectors.
- Persisting device ids can be privacy-sensitive and browser-specific; treat them as preferences, not durable identity.

## Checkpoint questions

- When should a product use exact constraints instead of ideal constraints?
- How would you design telemetry for camera constraint failures without recording private device labels?
- Where should media-quality policy live in a multi-page app: UI component, capture service, or backend-configured policy?
