const { getWindowBounds, setWindowBounds } = require('./windowManager');

const MAX_LOCKS = 4;
const lockedWindows = new Map(); // id -> { win, bounds }
let interval = null;
let paused = false;

function startInterval() {
  if (interval) return;
  interval = setInterval(async () => {
    if (paused) return;
    for (const [id, { win, bounds }] of lockedWindows) {
      const current = await getWindowBounds(win.app, win.title);
      if (!current) continue;
      const moved =
        current.x !== bounds.x ||
        current.y !== bounds.y ||
        current.width !== bounds.width ||
        current.height !== bounds.height;
      if (moved) {
        await setWindowBounds(win.app, win.title, bounds.x, bounds.y, bounds.width, bounds.height);
      }
    }
  }, 500);
}

function stopInterval() {
  if (interval) clearInterval(interval);
  interval = null;
}

function lock(id, win, bounds) {
  if (lockedWindows.size >= MAX_LOCKS && !lockedWindows.has(id)) return false;
  lockedWindows.set(id, { win, bounds: { ...bounds } });
  startInterval();
  return true;
}

function unlock(id) {
  lockedWindows.delete(id);
  if (lockedWindows.size === 0) stopInterval();
}

function unlockAll() {
  lockedWindows.clear();
  stopInterval();
}

// Called when displays change (laptop closed / external screen added or removed).
// Pauses snapping, waits for macOS to finish moving windows, then re-captures
// each locked window's new position so locking continues on the external screen.
async function handleDisplayChange() {
  if (lockedWindows.size === 0) return;
  paused = true;

  // Give macOS 3 seconds to finish rearranging windows
  await new Promise(r => setTimeout(r, 3000));

  for (const [id, entry] of lockedWindows) {
    const newBounds = await getWindowBounds(entry.win.app, entry.win.title);
    if (newBounds) {
      entry.bounds = newBounds; // re-anchor to new position
    }
  }

  paused = false;
}

function getLockedWindows() {
  const result = {};
  for (const [id, val] of lockedWindows) result[id] = val;
  return result;
}

function isLocked(id) {
  return lockedWindows.has(id);
}

module.exports = { lock, unlock, unlockAll, getLockedWindows, isLocked, MAX_LOCKS, handleDisplayChange };
