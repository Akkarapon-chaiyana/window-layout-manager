const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { getWindows, setWindowBounds } = require('./src/windowManager');
const { lock, unlock, unlockAll, getLockedWindows } = require('./src/lockDaemon');
const store = require('./src/layoutStore');

let tray = null;
let popupWin = null;

app.dock.hide();

app.whenReady().then(() => {
  // Use a blank tray icon (16x16 transparent PNG encoded inline)
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAADklEQVQ4jWNgGAWDGwAAAZAAAR88aMoAAAAASUVORK5CYII='
  );
  tray = new Tray(icon);
  tray.setTitle('⬛ Layouts');
  tray.setToolTip('Window Layout Manager');

  tray.on('click', togglePopup);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open', click: togglePopup },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.on('right-click', () => tray.popUpContextMenu(contextMenu));
});

function createPopup() {
  popupWin = new BrowserWindow({
    width: 340,
    height: 490,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    vibrancy: 'under-window',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  popupWin.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  popupWin.on('blur', () => {
    if (popupWin) popupWin.hide();
  });

  popupWin.on('closed', () => {
    popupWin = null;
  });
}

function togglePopup() {
  if (!popupWin) {
    createPopup();
    positionPopup();
    popupWin.show();
    return;
  }
  if (popupWin.isVisible()) {
    popupWin.hide();
  } else {
    positionPopup();
    popupWin.show();
  }
}

function positionPopup() {
  if (!popupWin) return;
  const { screen } = require('electron');
  const trayBounds = tray.getBounds();
  const winBounds = popupWin.getBounds();
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
  const workArea = display.workArea;

  // Position near tray icon, clamped to screen
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2);
  let y = trayBounds.y > workArea.height / 2
    ? trayBounds.y - winBounds.height - 4
    : trayBounds.y + trayBounds.height + 4;

  x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - winBounds.width));
  popupWin.setPosition(x, y);
}

// --- IPC Handlers ---

ipcMain.handle('get-windows', async () => {
  return await getWindows();
});

ipcMain.handle('get-layouts', () => {
  return store.load();
});

ipcMain.handle('save-layout', async (_, name) => {
  const wins = await getWindows();
  const layouts = store.load();
  layouts[name] = wins;
  store.save(layouts);
  return { ok: true, count: wins.length };
});

ipcMain.handle('restore-layout', async (_, name) => {
  const layouts = store.load();
  const saved = layouts[name];
  if (!saved) return { ok: false };
  for (const win of saved) {
    await setWindowBounds(win.app, win.title, win.x, win.y, win.width, win.height);
  }
  return { ok: true };
});

ipcMain.handle('delete-layout', (_, name) => {
  const layouts = store.load();
  delete layouts[name];
  store.save(layouts);
  return { ok: true };
});

ipcMain.handle('lock-window', async (_, { id, win }) => {
  const ok = lock(id, win, { x: win.x, y: win.y, width: win.width, height: win.height });
  if (ok) {
    const count = Object.keys(getLockedWindows()).length;
    tray.setTitle(`🔒 ${count}`);
  }
  return { ok };
});

ipcMain.handle('unlock-window', (_, id) => {
  unlock(id);
  const count = Object.keys(getLockedWindows()).length;
  tray.setTitle(count > 0 ? `🔒 ${count}` : '⬛ Layouts');
  return { ok: true };
});

ipcMain.handle('unlock-all', () => {
  unlockAll();
  tray.setTitle('⬛ Layouts');
  return { ok: true };
});

app.on('window-all-closed', (e) => e.preventDefault());
