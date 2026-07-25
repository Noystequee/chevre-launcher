const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app, safeStorage } = require('electron');

const CONFIG_FILE = () => path.join(app.getPath('userData'), 'config.json');

const DEFAULTS = {
  serverIp: '195.154.239.81',
  serverPort: 25565,
  installDir: '',
  minMemoryMb: 3072,
  maxMemoryMb: 6144,
  account: null,
  encryptedSessionToken: null,
  // Empty means "use the Java runtime the launcher installs automatically".
  javaPath: '',
  // Stable per-install identifier Minecraft expects as --clientId (not a secret,
  // just a device/session identifier — unrelated to the Azure app client_id).
  clientId: null,
};

function readRaw() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE(), 'utf-8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeRaw(data) {
  fs.mkdirSync(path.dirname(CONFIG_FILE()), { recursive: true });
  fs.writeFileSync(CONFIG_FILE(), JSON.stringify(data, null, 2), 'utf-8');
}

function getConfig() {
  const data = readRaw();
  if (!data.clientId) {
    data.clientId = crypto.randomUUID();
    writeRaw(data);
  }
  return {
    serverIp: data.serverIp,
    serverPort: data.serverPort,
    installDir: data.installDir || path.join(app.getPath('userData'), 'instance'),
    minMemoryMb: data.minMemoryMb,
    maxMemoryMb: data.maxMemoryMb,
    account: data.account,
    clientId: data.clientId,
    javaPath: data.javaPath,
  };
}

function updateConfig(partial) {
  const data = readRaw();
  const next = { ...data, ...partial };
  writeRaw(next);
  return getConfig();
}

function saveSessionToken(sessionToken) {
  const data = readRaw();
  if (sessionToken && safeStorage.isEncryptionAvailable()) {
    data.encryptedSessionToken = safeStorage.encryptString(sessionToken).toString('base64');
  } else {
    data.encryptedSessionToken = null;
  }
  writeRaw(data);
}

function loadSessionToken() {
  const data = readRaw();
  if (!data.encryptedSessionToken || !safeStorage.isEncryptionAvailable()) return null;
  try {
    return safeStorage.decryptString(Buffer.from(data.encryptedSessionToken, 'base64'));
  } catch {
    return null;
  }
}

function saveAccount(account) {
  return updateConfig({ account });
}

function clearAccount() {
  saveSessionToken(null);
  return updateConfig({ account: null });
}

module.exports = {
  getConfig,
  updateConfig,
  saveSessionToken,
  loadSessionToken,
  saveAccount,
  clearAccount,
};
