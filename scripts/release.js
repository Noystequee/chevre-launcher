// electron-builder's built-in `--publish always` races two parallel upload tasks
// (the .exe and its .blockmap) against the same "does this release exist yet?"
// check, which can create two duplicate GitHub releases for the same tag. This
// script avoids that entirely: build locally (no publish), then push the tag and
// upload all three artifacts through a single sequential `gh release` call.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
const version = pkg.version;
const tag = `v${version}`;
const distDir = path.join(__dirname, '..', 'dist');
const repo = 'Noystequee/chevre-launcher';

function run(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
}

console.log(`\n=== Building ${tag} ===`);
run('npx electron-builder --publish never');

const exeName = `chevre-launcher-setup-${version}.exe`;
const blockmapName = `${exeName}.blockmap`;
const latestYmlName = 'latest.yml';
for (const name of [exeName, blockmapName, latestYmlName]) {
  if (!fs.existsSync(path.join(distDir, name))) {
    throw new Error(`Fichier attendu manquant après le build : ${name}`);
  }
}

console.log(`\n=== Tag git ${tag} ===`);
try {
  run(`git tag ${tag}`);
} catch {
  console.log(`(tag ${tag} existe déjà localement, on continue)`);
}
run(`git push origin ${tag}`);

console.log(`\n=== Publication GitHub Release ${tag} ===`);
const releaseExists = (() => {
  try {
    execSync(`gh release view ${tag} --repo ${repo}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

const assetArgs = [exeName, blockmapName, latestYmlName].map((n) => `"dist/${n}"`).join(' ');
if (releaseExists) {
  run(`gh release upload ${tag} ${assetArgs} --repo ${repo} --clobber`);
} else {
  run(`gh release create ${tag} ${assetArgs} --repo ${repo} --title "${version}" --notes "Nouvelle version du launcher."`);
}

console.log(`\n✅ ${tag} publiée : https://github.com/${repo}/releases/tag/${tag}`);
