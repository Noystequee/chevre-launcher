const { Auth } = require('msmc');
const store = require('./store');

class NoGameOwnershipError extends Error {
  constructor() {
    super("Ce compte Microsoft ne possède pas Minecraft. Achète le jeu sur minecraft.net puis reconnecte-toi.");
    this.name = 'NoGameOwnershipError';
  }
}

async function finalizeAccount(xbox) {
  const mc = await xbox.getMinecraft();
  const entitlements = await mc.entitlements();
  const ownsJava = entitlements.some((e) => e === 'game_minecraft' || e === 'product_minecraft');
  if (!ownsJava) throw new NoGameOwnershipError();

  store.saveSessionToken(xbox.save());
  const account = {
    accessToken: mc.mcToken,
    xuid: mc.xuid,
    profile: { id: mc.profile.id, name: mc.profile.name },
  };
  store.saveAccount(account);
  return account;
}

async function loginInteractive() {
  const authManager = new Auth('select_account');
  const xbox = await authManager.launch('electron');
  return finalizeAccount(xbox);
}

async function tryAutoLogin() {
  const sessionToken = store.loadSessionToken();
  if (!sessionToken) return null;
  try {
    const authManager = new Auth('select_account');
    const xbox = await authManager.refresh(sessionToken);
    return await finalizeAccount(xbox);
  } catch {
    store.clearAccount();
    return null;
  }
}

async function ensureFreshAccount() {
  const account = await tryAutoLogin();
  if (account) return account;
  throw new Error('Session expirée, reconnecte-toi avec ton compte Microsoft.');
}

function logout() {
  store.clearAccount();
}

module.exports = {
  loginInteractive,
  tryAutoLogin,
  ensureFreshAccount,
  logout,
  NoGameOwnershipError,
};
