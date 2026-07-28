// Publishes the mod jars in resources/modpack/mods/ to a dedicated GitHub Release
// ("mods") that acts as a CDN, and writes manifest/mods.json describing them
// (filename, sha256, size, download url). Only new/changed jars are re-uploaded
// (diffed against the previously committed manifest) and assets removed from the
// pack are deleted from the release, so this stays fast after the first run.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MODS_DIR = path.join(ROOT, 'resources', 'modpack', 'mods');
const MANIFEST_PATH = path.join(ROOT, 'manifest', 'mods.json');
const REPO = 'Noystequee/chevre-launcher';
const TAG = 'mods';
const BASE_URL = `https://github.com/${REPO}/releases/download/${TAG}`;

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function run(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
}

// GitHub rewrites release asset filenames on upload — whitespace runs become a
// single '.' (e.g. "Falling Leaves-1.0.jar" -> "Falling.Leaves-1.0.jar"). The
// manifest's `url` must point at that rewritten name, even though `file` (used
// for the local mods/ folder) stays the real, original filename.
function githubAssetName(file) {
  return file.replace(/\s+/g, '.');
}

function buildManifest() {
  const files = fs.readdirSync(MODS_DIR).filter((f) => f.endsWith('.jar'));
  const mods = files.map((file) => {
    const full = path.join(MODS_DIR, file);
    const stat = fs.statSync(full);
    return {
      file,
      sha256: sha256(full),
      size: stat.size,
      url: `${BASE_URL}/${encodeURIComponent(githubAssetName(file))}`,
    };
  });
  return { version: Date.now(), mods };
}

function fetchRealAssetNames() {
  const out = execSync(`gh release view ${TAG} --repo ${REPO} --json assets --jq ".assets[].name"`, { cwd: ROOT })
    .toString()
    .trim();
  return new Set(out ? out.split('\n') : []);
}

function loadPreviousManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function releaseExists() {
  try {
    execSync(`gh release view ${TAG} --repo ${REPO}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

(async () => {
  const previous = loadPreviousManifest();
  const manifest = buildManifest();

  const prevByFile = new Map((previous?.mods || []).map((m) => [m.file, m]));
  const currByFile = new Map(manifest.mods.map((m) => [m.file, m]));

  const added = manifest.mods.filter((m) => !prevByFile.has(m.file));
  const changed = manifest.mods.filter((m) => prevByFile.has(m.file) && prevByFile.get(m.file).sha256 !== m.sha256);
  const removed = [...prevByFile.keys()].filter((file) => !currByFile.has(file));

  console.log(`Ajoutés: ${added.length}, modifiés: ${changed.length}, supprimés: ${removed.length}, inchangés: ${manifest.mods.length - added.length - changed.length}`);

  if (added.length === 0 && changed.length === 0 && removed.length === 0 && previous) {
    console.log('Aucun changement de mod détecté, rien à publier.');
    return;
  }

  if (!releaseExists()) {
    run(`gh release create ${TAG} --repo ${REPO} --title "Mods CDN" --notes "Hébergement des mods du modpack — ne pas supprimer." --prerelease`);
  }

  for (const mod of [...added, ...changed]) {
    run(`gh release upload ${TAG} "resources/modpack/mods/${mod.file}" --repo ${REPO} --clobber`);
  }
  for (const file of removed) {
    try {
      run(`gh release delete-asset ${TAG} "${file}" --repo ${REPO} --yes`);
    } catch {
      console.log(`(asset ${file} déjà absent côté GitHub)`);
    }
  }

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  run(`gh release upload ${TAG} "manifest/mods.json" --repo ${REPO} --clobber`);

  // Verify every manifest URL actually resolves to a real asset on GitHub — catches
  // any other filename-rewriting surprise beyond the known whitespace-to-dot one.
  const realNames = fetchRealAssetNames();
  const broken = manifest.mods.filter((m) => !realNames.has(githubAssetName(m.file)));
  if (broken.length > 0) {
    console.error(`\n❌ ${broken.length} mod(s) ont une URL qui ne correspond à aucun asset réel sur GitHub :`);
    for (const m of broken) console.error(`   - ${m.file} (attendu: ${githubAssetName(m.file)})`);
    process.exitCode = 1;
  } else {
    console.log(`\n✅ Manifest publié (${manifest.mods.length} mods), toutes les URLs vérifiées. Pense à commit + push manifest/mods.json.`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
