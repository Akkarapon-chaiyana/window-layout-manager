const { getWindowBounds, setWindowBounds } = require('./windowManager');

const MAX_LOCKS = 4;
const lockedWindows = new Map(); // id -> { win, bounds }
let interval = null;

function startInterval() {
  if (interval) return;
  interval = setInterval(async () => {
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

function getLockedWindows() {
  const result = {};
  for (const [id, val] of lockedWindows) result[id] = val;
  return result;
}

function isLocked(id) {
  return lockedWindows.has(id);
}

module.exports = { lock, unlock, unlockAll, getLockedWindows, isLocked, MAX_LOCKS };
