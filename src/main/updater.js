const { app } = require('electron');
const { autoUpdater } = require('electron-updater');

function setupAutoUpdater(getMainWindow) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const send = (payload) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.webContents.send('update:event', payload);
  };

  autoUpdater.on('update-available', (info) => send({ type: 'available', version: info.version }));
  autoUpdater.on('download-progress', (progress) => send({ type: 'progress', percent: progress.percent }));
  autoUpdater.on('update-downloaded', (info) => send({ type: 'downloaded', version: info.version }));
  autoUpdater.on('error', (err) => send({ type: 'error', message: String((err && err.message) || err) }));

  function checkForUpdates() {
    if (!app.isPackaged) return;
    autoUpdater.checkForUpdates().catch(() => {});
  }

  function quitAndInstall() {
    autoUpdater.quitAndInstall();
  }

  return { checkForUpdates, quitAndInstall };
}

module.exports = { setupAutoUpdater };
