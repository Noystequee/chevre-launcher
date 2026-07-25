const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');

const store = require('./store');
const auth = require('./auth');
const installer = require('./installer');
const modpack = require('./modpack');
const launcherModule = require('./launcher');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    title: 'CHÈVRE LAUNCHER 9000',
    backgroundColor: '#1a0b2e',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'renderer', 'assets', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('config:get', () => store.getConfig());
ipcMain.handle('config:update', (_e, partial) => store.updateConfig(partial));

ipcMain.handle('auth:auto-login', () => auth.tryAutoLogin());
ipcMain.handle('auth:login', () => auth.loginInteractive());
ipcMain.handle('auth:logout', () => auth.logout());

let gameRunning = false;
let installRunning = false;

ipcMain.handle('install:check', () => installer.isInstalled());
ipcMain.handle('install:run', async (event) => {
  if (gameRunning) throw new Error("Le jeu est en cours d'exécution : ferme Minecraft avant de réinstaller.");
  if (installRunning) throw new Error('Une installation est déjà en cours.');
  installRunning = true;
  try {
    const sender = event.sender;
    await installer.installAll((payload) => sender.send('install:progress', payload));
    modpack.deployModpack(installer.locations().gamePath, (payload) =>
      sender.send('install:progress', { phase: 'deploying-mods', ...payload })
    );
    sender.send('install:progress', { phase: 'complete' });
    return true;
  } finally {
    installRunning = false;
  }
});

ipcMain.handle('game:play', async (event) => {
  if (installRunning) throw new Error("Une installation est en cours : attends qu'elle se termine avant de jouer.");
  if (gameRunning) throw new Error('Le jeu est déjà en cours de lancement ou d\'exécution.');
  gameRunning = true;
  const sender = event.sender;
  try {
    await launcherModule.launchGame((payload) => {
      if (payload.type === 'exit' || payload.type === 'error') gameRunning = false;
      sender.send('game:event', payload);
    });
    return true;
  } catch (err) {
    gameRunning = false;
    throw err;
  }
});
