const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { app } = require('electron');

const MANIFEST_URL = 'https://github.com/Noystequee/chevre-launcher/releases/download/mods/mods.json';
const LOCAL_MANIFEST_PATH = () => path.join(app.getPath('userData'), 'installed-mods-manifest.json');

async function fetchRemoteManifest() {
  const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Impossible de récupérer le manifest des mods (${res.status})`);
  return res.json();
}

function loadLocalManifest() {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_MANIFEST_PATH(), 'utf-8'));
  } catch {
    return null;
  }
}

function saveLocalManifest(manifest) {
  fs.mkdirSync(path.dirname(LOCAL_MANIFEST_PATH()), { recursive: true });
  fs.writeFileSync(LOCAL_MANIFEST_PATH(), JSON.stringify(manifest, null, 2), 'utf-8');
}

function diffManifests(remote, local) {
  const localByFile = new Map((local?.mods || []).map((m) => [m.file, m]));
  const remoteByFile = new Map(remote.mods.map((m) => [m.file, m]));

  const added = [];
  const changed = [];
  for (const mod of remote.mods) {
    const prev = localByFile.get(mod.file);
    if (!prev) added.push(mod);
    else if (prev.sha256 !== mod.sha256) changed.push(mod);
  }
  const removed = [...localByFile.keys()].filter((file) => !remoteByFile.has(file));

  return { added, changed, removed, hasUpdate: added.length + changed.length + removed.length > 0 };
}

async function checkForModUpdates() {
  const remote = await fetchRemoteManifest();
  const local = loadLocalManifest();
  return { remote, local, diff: diffManifests(remote, local) };
}

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function downloadMod(mod, destDir) {
  const res = await fetch(mod.url);
  if (!res.ok) throw new Error(`Échec du téléchargement de ${mod.file} (${res.status})`);
  const dest = path.join(destDir, mod.file);
  const tmp = `${dest}.download`;
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
  const hash = await hashFile(tmp);
  if (hash !== mod.sha256) {
    fs.unlinkSync(tmp);
    throw new Error(`Somme de contrôle invalide pour ${mod.file} (fichier corrompu ou téléchargement incomplet)`);
  }
  fs.renameSync(tmp, dest);
}

// Downloads new/changed mods from the manifest and deletes ones no longer listed.
// Unchanged mods (same sha256 already on disk) are left untouched — this is what
// makes both the first install and later "new mods available" updates fast: only
// the actual diff is ever transferred.
async function syncMods(gamePath, onProgress) {
  const remote = await fetchRemoteManifest();
  const local = loadLocalManifest();
  const diff = diffManifests(remote, local);

  const modsDir = path.join(gamePath, 'mods');
  fs.mkdirSync(modsDir, { recursive: true });

  const toDownload = [...diff.added, ...diff.changed];
  let done = 0;
  for (const mod of toDownload) {
    await downloadMod(mod, modsDir);
    done += 1;
    onProgress?.({ done, total: toDownload.length, file: mod.file });
  }
  for (const file of diff.removed) {
    const p = path.join(modsDir, file);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  saveLocalManifest(remote);
  return diff;
}

module.exports = { fetchRemoteManifest, checkForModUpdates, syncMods };
