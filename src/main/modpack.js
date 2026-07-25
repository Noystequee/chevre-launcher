const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const store = require('./store');
const { buildServersDat } = require('./serversdat');

function getBundledModpackPath() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'modpack');
  return path.join(__dirname, '..', '..', 'resources', 'modpack');
}

function deployModpack(gamePath, onProgress) {
  const bundled = getBundledModpackPath();
  const parts = ['mods', 'config'];
  for (const part of parts) {
    const src = path.join(bundled, part);
    if (!fs.existsSync(src)) continue;
    onProgress?.({ part });
    const dest = path.join(gamePath, part);
    fs.cpSync(src, dest, { recursive: true, force: true });
  }

  // Only seed servers.dat on first install: never clobber servers the player
  // may have added themselves afterwards.
  const serversDatPath = path.join(gamePath, 'servers.dat');
  if (!fs.existsSync(serversDatPath)) {
    const { serverIp, serverPort } = store.getConfig();
    if (serverIp) {
      onProgress?.({ part: 'servers.dat' });
      const address = `${serverIp}:${Number(serverPort) || 25565}`;
      fs.writeFileSync(serversDatPath, buildServersDat(address, 'chevrejesuis — Live 24h'));
    }
  }
}

module.exports = { deployModpack, getBundledModpackPath };
