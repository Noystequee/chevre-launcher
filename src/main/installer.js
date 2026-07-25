const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const {
  getVersionList,
  installMinecraft,
  completeInstallation,
  installNeoForge,
  installJavaRuntime,
  fetchJavaRuntimeManifest,
} = require('@xmcl/installer');
const store = require('./store');

const MC_VERSION = '1.21.1';
const NEOFORGE_VERSION = '21.1.241';
const NEOFORGE_VERSION_ID = `neoforge-${NEOFORGE_VERSION}`;

function locations() {
  const { installDir } = store.getConfig();
  const userData = app.getPath('userData');
  return {
    resourcePath: path.join(userData, 'store'),
    gamePath: installDir,
    runtimePath: path.join(userData, 'runtime'),
  };
}

function javaExecutableFor(runtimePath, component) {
  const binName = process.platform === 'win32' ? 'javaw.exe' : 'java';
  return path.join(runtimePath, component, 'bin', binName);
}

async function ensureJavaRuntime(component, runtimePath, onEvent) {
  const javaPath = javaExecutableFor(runtimePath, component);
  if (fs.existsSync(javaPath)) return javaPath;
  const manifest = await fetchJavaRuntimeManifest({ target: component });
  await installJavaRuntime({
    destination: path.join(runtimePath, component),
    manifest,
    tracker: onEvent,
  });
  return javaPath;
}

function isInstalled() {
  const { resourcePath, gamePath } = locations();
  const versionDir = path.join(resourcePath, 'versions', NEOFORGE_VERSION_ID);
  return fs.existsSync(path.join(versionDir, `${NEOFORGE_VERSION_ID}.json`)) && fs.existsSync(gamePath);
}

async function installAll(onProgress) {
  const report = (phase, extra = {}) => onProgress?.({ phase, ...extra });
  const { resourcePath, gamePath, runtimePath } = locations();
  fs.mkdirSync(resourcePath, { recursive: true });
  fs.mkdirSync(gamePath, { recursive: true });

  report('resolving-version-manifest');
  const list = await getVersionList();
  const versionMeta = list.versions.find((v) => v.id === MC_VERSION);
  if (!versionMeta) {
    throw new Error(`Version Minecraft ${MC_VERSION} introuvable dans le manifest Mojang.`);
  }

  report('installing-vanilla');
  const vanillaTracker = (event) => {
    const download = event.payload && event.payload.download;
    report('vanilla', {
      subphase: event.phase,
      progress: download && download.progress,
      total: download && download.total,
    });
  };
  const resolved = await installMinecraft(versionMeta, resourcePath, { tracker: vanillaTracker });
  await completeInstallation(resolved, { tracker: vanillaTracker });

  report('installing-java');
  const javaComponent = (resolved.javaVersion && resolved.javaVersion.component) || 'java-runtime-delta';
  const javaPath = await ensureJavaRuntime(javaComponent, runtimePath, (event) => {
    report('java', { subphase: event.phase });
  });

  report('installing-neoforge');
  const neoforgeVersionId = await installNeoForge('neoforge', NEOFORGE_VERSION, resourcePath, {
    java: javaPath,
    tracker: (event) => report('neoforge', { subphase: event.phase }),
  });

  report('done', { javaPath, neoforgeVersionId, resourcePath, gamePath });
  return { javaPath, neoforgeVersionId: neoforgeVersionId || NEOFORGE_VERSION_ID, resourcePath, gamePath };
}

module.exports = {
  installAll,
  isInstalled,
  locations,
  javaExecutableFor,
  MC_VERSION,
  NEOFORGE_VERSION,
  NEOFORGE_VERSION_ID,
};
