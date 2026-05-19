# Window Layout Manager

A lightweight macOS menu bar app to lock browser windows in place.

## Features

- **Lock up to 4 windows** — pin any app window so it snaps back if moved or resized
- **Per-slot control** — lock/unlock each slot independently
- **Unlock All** — clear all locks at once
- **Tray indicator** — shows `🔒 2` when 2 windows are locked

## Install & Run

```bash
cd /Users/achaiyan/window_layout
npm install
npm start
```

The app appears as `⬛ Layouts` in your menu bar. Click it to open the popup.

## How to use

1. Click **↻ Refresh** to load all open windows
2. Pick a window from a slot dropdown
3. Click **Lock** — the window will snap back if moved
4. Click **Unlock** on a slot to free it, or **Unlock All** to clear everything

## First-time setup

macOS requires Accessibility permission to move windows.

Go to: **System Settings → Privacy & Security → Accessibility** → enable the app.

## Quit

Right-click the tray icon → **Quit**
