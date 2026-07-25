const fs = require('fs');
const { spawn } = require('child_process');
const {
  Version,
  generateArguments,
  LaunchPrecheck,
  MinecraftFolder,
  createMinecraftProcessWatcher,
  createQuickPlayMultiplayer,
} = require('@xmcl/core');
const store = require('./store');
const installer = require('./installer');
const auth = require('./auth');

// @xmcl/core's generateArguments() doesn't know how to fill the ${clientid}/${auth_xuid}
// template variables Minecraft's own version.json declares, so they come out as these
// literal (unsubstituted) strings. We patch them in place after generation instead of
// appending our own --clientId/--xuid via extraMCArgs: Minecraft's arg parser (jopt-simple)
// throws "MultipleArgumentsForOptionException" if an option like --xuid appears twice,
// which is exactly what appending a second pair caused.
const XUID_PLACEHOLDER = '${auth_xuid}';
const CLIENT_ID_PLACEHOLDER = '${clientid}';

async function launchGame(onEvent) {
  const account = await auth.ensureFreshAccount();
  const { resourcePath, gamePath, runtimePath } = installer.locations();
  const { minMemoryMb, maxMemoryMb, serverIp, serverPort, clientId, javaPath: customJavaPath } = store.getConfig();

  const resolved = await Version.parse(resourcePath, installer.NEOFORGE_VERSION_ID);

  let javaPath;
  if (customJavaPath) {
    if (!fs.existsSync(customJavaPath)) {
      throw new Error(`Le chemin Java personnalisé est introuvable : ${customJavaPath}`);
    }
    javaPath = customJavaPath;
  } else {
    const javaComponent = (resolved.javaVersion && resolved.javaVersion.component) || 'java-runtime-delta';
    javaPath = installer.javaExecutableFor(runtimePath, javaComponent);
  }

  const launchOptions = {
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
  };

  const rawArgs = await generateArguments(launchOptions);
  const args = rawArgs.map((arg) => {
    if (arg === XUID_PLACEHOLDER) return account.xuid || '';
    if (arg === CLIENT_ID_PLACEHOLDER) return clientId;
    return arg;
  });

  const minecraftFolder = MinecraftFolder.from(resourcePath);
  await Promise.all(LaunchPrecheck.DEFAULT_PRECHECKS.map((f) => f(minecraftFolder, resolved, launchOptions)));

  if (!fs.existsSync(gamePath)) fs.mkdirSync(gamePath, { recursive: true });

  const child = spawn(args[0], args.slice(1), {
    cwd: gamePath,
    // Detach from the launcher's process tree so closing/restarting the launcher
    // (or Windows job-object cleanup) never takes down an in-progress game session.
    detached: true,
  });

  const watcher = createMinecraftProcessWatcher(child);
  watcher.on('minecraft-window-ready', () => onEvent?.({ type: 'window-ready' }));
  watcher.on('minecraft-exit', (e) => onEvent?.({ type: 'exit', code: e.code, crashReport: e.crashReport }));
  watcher.on('error', (err) => onEvent?.({ type: 'error', message: String(err) }));

  return child;
}

module.exports = { launchGame };
