const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chevre', {
  getServerStatus: () => ipcRenderer.invoke('server:status'),

  getConfig: () => ipcRenderer.invoke('config:get'),
  updateConfig: (partial) => ipcRenderer.invoke('config:update', partial),
  pickJavaPath: () => ipcRenderer.invoke('config:pick-java'),

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

  checkModUpdates: () => ipcRenderer.invoke('mods:check'),
  syncMods: () => ipcRenderer.invoke('mods:sync'),
  onModsUpdateAvailable: (cb) => {
    const listener = (_e, diff) => cb(diff);
    ipcRenderer.on('mods:update-available', listener);
    return () => ipcRenderer.removeListener('mods:update-available', listener);
  },
  onModsSyncProgress: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('mods:sync-progress', listener);
    return () => ipcRenderer.removeListener('mods:sync-progress', listener);
  },
});
