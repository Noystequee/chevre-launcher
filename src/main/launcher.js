const { Version, launch, createMinecraftProcessWatcher, createQuickPlayMultiplayer } = require('@xmcl/core');
const store = require('./store');
const installer = require('./installer');
const auth = require('./auth');

async function launchGame(onEvent) {
  const account = await auth.ensureFreshAccount();
  const { resourcePath, gamePath, runtimePath } = installer.locations();
  const { minMemoryMb, maxMemoryMb, serverIp, serverPort, clientId } = store.getConfig();

  const resolved = await Version.parse(resourcePath, installer.NEOFORGE_VERSION_ID);
  const javaComponent = (resolved.javaVersion && resolved.javaVersion.component) || 'java-runtime-delta';
  const javaPath = installer.javaExecutableFor(runtimePath, javaComponent);

  const child = await launch({
    gamePath,
    resourcePath,
    javaPath,
    version: resolved,
    gameProfile: { name: account.profile.name, id: account.profile.id },
    accessToken: account.accessToken,
    userType: 'mojang',
    minMemory: minMemoryMb,
    maxMemory: maxMemoryMb,
    quickPlayMultiplayer: serverIp ? createQuickPlayMultiplayer(serverIp, Number(serverPort) || 25565) : undefined,
    launcherName: 'ChevreLauncher9000',
    launcherBrand: 'ChevreLauncher9000',
    // @xmcl/core doesn't fill the ${clientid}/${auth_xuid} template variables modern
    // Minecraft needs to register its chat-signing certificate with Mojang — without
    // these, the client shows "Chat disabled due to missing profile public key".
    extraMCArgs: [
      '--clientId', clientId,
      ...(account.xuid ? ['--xuid', account.xuid] : []),
    ],
    // Detach from the launcher's process tree so closing/restarting the launcher
    // (or Windows job-object cleanup) never takes down an in-progress game session.
    extraExecOption: { detached: true },
  });
  child.unref();

  const watcher = createMinecraftProcessWatcher(child);
  watcher.on('minecraft-window-ready', () => onEvent?.({ type: 'window-ready' }));
  watcher.on('minecraft-exit', (e) => onEvent?.({ type: 'exit', code: e.code, crashReport: e.crashReport }));
  watcher.on('error', (err) => onEvent?.({ type: 'error', message: String(err) }));

  return child;
}

module.exports = { launchGame };
