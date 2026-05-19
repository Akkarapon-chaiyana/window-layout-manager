const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getWindows: () => ipcRenderer.invoke('get-windows'),
  getLayouts: () => ipcRenderer.invoke('get-layouts'),
  saveLayout: (name) => ipcRenderer.invoke('save-layout', name),
  restoreLayout: (name) => ipcRenderer.invoke('restore-layout', name),
  deleteLayout: (name) => ipcRenderer.invoke('delete-layout', name),
  lockWindow: (id, win) => ipcRenderer.invoke('lock-window', { id, win }),
  unlockWindow: (id) => ipcRenderer.invoke('unlock-window', id),
  unlockAll: () => ipcRenderer.invoke('unlock-all'),
});
