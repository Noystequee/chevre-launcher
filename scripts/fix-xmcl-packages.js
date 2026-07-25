// Several @xmcl/* packages (voxelum/minecraft-launcher-core-node) publish to npm
// with a broken "main" field still pointing at TypeScript source ("./index.ts"),
// which isn't even included in the tarball. Node needs the "publishConfig.main"
// value instead. This patches package.json for every @xmcl/* package after install.
const fs = require('fs');
const path = require('path');

const xmclDir = path.join(__dirname, '..', 'node_modules', '@xmcl');
if (!fs.existsSync(xmclDir)) process.exit(0);

const FIELDS = ['main', 'module', 'browser'];
let patched = 0;

for (const pkgName of fs.readdirSync(xmclDir)) {
  const pkgJsonPath = path.join(xmclDir, pkgName, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) continue;

  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  if (!pkg.publishConfig) continue;

  let changed = false;
  for (const field of FIELDS) {
    const wanted = pkg.publishConfig[field];
    if (wanted && pkg[field] !== wanted) {
      pkg[field] = wanted;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2));
    patched += 1;
  }
}

if (patched > 0) console.log(`[fix-xmcl-packages] Corrigé ${patched} package(s) @xmcl/* (main pointait vers du .ts).`);

// @xmcl/installer@6.3.1's bundle does require("@xmcl/core/utils"), but the published
// @xmcl/core@2.16.0 tarball never ships that submodule (only a bundled dist/index.js).
// Shim it with the trivial implementation documented in @xmcl/core's own utils.d.ts.
const coreUtilsPath = path.join(xmclDir, 'core', 'utils.js');
if (fs.existsSync(path.join(xmclDir, 'core')) && !fs.existsSync(coreUtilsPath)) {
  fs.writeFileSync(
    coreUtilsPath,
    `const fs = require('fs');
const crypto = require('crypto');

async function exists(file) {
  try {
    await fs.promises.access(file);
    return true;
  } catch {
    return false;
  }
}

function checksum(target, algorithm) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(target);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function validateSha1(target, hash, strict = false) {
  if (!hash) return !strict;
  if (!(await exists(target))) return false;
  const actual = await checksum(target, 'sha1');
  return actual === hash;
}

function isNotNull(v) {
  return v !== undefined && v !== null;
}

module.exports = { exists, checksum, validateSha1, isNotNull };
`
  );
  console.log('[fix-xmcl-packages] Ajout du shim @xmcl/core/utils (absent du paquet publié).');
}
