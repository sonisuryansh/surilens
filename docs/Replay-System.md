# 🎬 Visual Execution Replay System

The SuriLens Replay Engine enables developers to analyze recorded requests frame-by-frame.

---

## Modes: Live vs Replay

- **LIVE MODE**: Telemetry streams live from the WebSocket connection. The graph highlights active nodes and packet orb movements in real time.
- **REPLAY MODE**: Selecting any completed trace in the Request Explorer or Timeline switches SuriLens into Replay Mode.

---

## Replay Controls & Shortcuts

| Control | Action | Keyboard Shortcut |
| :--- | :--- | :--- |
| **Play / Pause** (`⏯`) | Toggles animated step playback | `Space` |
| **Step Backward** (`⏪`) | Rewinds one execution step | `←` |
| **Step Forward** (`⏩`) | Advances one execution step | `→` |
| **Jump to Start** (`⏮`) | Resets playback to initial `Client` node | `Home` |
| **Jump to End** (`⏭`) | Fast-forwards to complete response | `End` |
| **Exit Replay Mode** | Returns to Live Mode | `Escape` |

---

## Playback Speeds

Playback speed can be adjusted via the speed selector:
- `0.25×` (Slow motion inspection)
- `0.5×`
- `1×` (Normal speed)
- `2×`
- `4×` (Fast forward)
