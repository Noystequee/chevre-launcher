const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const store = require('./store');
const { buildServersDat } = require('./serversdat');

function getBundledModpackPath() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'modpack');
  return path.join(__dirname, '..', '..', 'resources', 'modpack');
}

// Copies src into dest recursively, but only ever writes a file that doesn't
// already exist at the destination. Used for anything a player might have
// customized in-game (mod config screens, keybinds saved into a config file, etc.)
// so reinstalling/updating the launcher never wipes settings back to pack defaults.
function copyMissingOnly(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyMissingOnly(path.join(src, entry), path.join(dest, entry));
    }
  } else if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
  }
}

function deployModpack(gamePath, onProgress) {
  const bundled = getBundledModpackPath();

  // mods/ is pack content, not player data: always sync so mod updates/removals
  // from a newer launcher version actually apply.
  const modsSrc = path.join(bundled, 'mods');
  if (fs.existsSync(modsSrc)) {
    onProgress?.({ part: 'mods' });
    fs.cpSync(modsSrc, path.join(gamePath, 'mods'), { recursive: true, force: true });
  }

  // config/ can contain player-personalized settings (mod option screens, saved
  // keybinds, etc.) — only seed files that don't exist yet, never overwrite.
  const configSrc = path.join(bundled, 'config');
  if (fs.existsSync(configSrc)) {
    onProgress?.({ part: 'config' });
    copyMissingOnly(configSrc, path.join(gamePath, 'config'));
  }

  // Deliberately never touched by deploy: options.txt, saves/, screenshots/,
  // xaero/ (waypoints), journeymap/, resourcepacks/, shaderpacks/ — all pure
  // player data that must survive a reinstall or an auto-update untouched.

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
