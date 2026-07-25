const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chevre', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  updateConfig: (partial) => ipcRenderer.invoke('config:update', partial),

  tryAutoLogin: () => ipcRenderer.invoke('auth:auto-login'),
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),

  isInstalled: () => ipcRenderer.invoke('install:check'),
  install: () => ipcRenderer.invoke('install:run'),
  onInstallProgress: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('install:progress', listener);
    return () => ipcRenderer.removeListener('install:progress', listener);
  },

  play: () => ipcRenderer.invoke('game:play'),
  onGameEvent: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('game:event', listener);
    return () => ipcRenderer.removeListener('game:event', listener);
  },

  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateEvent: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('update:event', listener);
    return () => ipcRenderer.removeListener('update:event', listener);
  },
});
