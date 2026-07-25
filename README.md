# 🐐 CHÈVRE LAUNCHER 9000

Launcher officieux (Electron) pour le live 24h de **chevrejesuis**. Installe une instance complète Minecraft **1.21.1** + **NeoForge 21.1.241** + les 138 mods du modpack `Chevre2`, avec login Microsoft/Xbox officiel.

## Prérequis pour lancer en dev

```bash
npm install
```

`npm install` déclenche automatiquement `scripts/fix-xmcl-packages.js` (voir *Notes techniques* plus bas — **nécessaire**, ne pas retirer).

```bash
npm start
```

## Authentification Microsoft

Aucune configuration nécessaire. Le launcher utilise [`msmc`](https://www.npmjs.com/package/msmc), qui embarque le Client ID public de l'officiel Minecraft Launcher (`00000000402b5328`) — le même réutilisé depuis des années par des launchers tiers open source (MultiMC, PrismLauncher, etc.). Le login Microsoft/Xbox/Minecraft marche donc immédiatement pour toi et pour n'importe qui télécharge le launcher, sans inscription Azure.

**Compromis assumé** : ce Client ID est partagé par de nombreux projets tiers. En cas de pic massif de connexions simultanées (ex: des centaines de viewers qui se connectent au même instant pendant le live), Microsoft pourrait throttler ce quota partagé. Si ça devient un problème, la solution est de créer son propre Client ID Azure (portail Azure → inscriptions d'applications → scope `XboxLive.signin offline_access` → redirect `https://login.microsoftonline.com/common/oauth2/nativeclient`) et de le brancher dans `src/main/auth.js` via le constructeur avancé `new Auth({ client_id, redirect, prompt })` de msmc.

## Adresse du serveur

Préconfigurée sur `195.154.239.81:25565` (reprise du `servers.dat` de l'instance `Chevre2`). Modifiable dans ⚙️ Paramètres si l'IP change avant le live.

## Build de l'installeur Windows

```bash
npm run dist
```

Produit un installeur NSIS dans `dist/`. Les 138 mods (`resources/modpack/`, ~340 Mo) sont embarqués via `extraResources` — l'installeur est donc volumineux mais autonome : n'importe qui peut le télécharger et rejoindre le live sans manipulation.

## Mettre à jour les mods

Si la modlist change avant le live, recopie le dossier à jour :

```bash
robocopy "C:\chemin\vers\nouvelle\instance\mods" resources\modpack\mods /E
robocopy "C:\chemin\vers\nouvelle\instance\config" resources\modpack\config /E
```

Le launcher réécrase `mods/` et `config/` dans l'instance installée à chaque clic sur "Installer" (idempotent).

## Structure du projet

```
src/main/        processus principal Electron (auth, install, launch, IPC)
src/renderer/    UI (HTML/CSS/JS vanilla, thème violet chèvre)
resources/modpack/  mods + config embarqués dans le build
scripts/         script de correctifs post-install (voir ci-dessous)
```

## Notes techniques — bugs upstream corrigés automatiquement

`@xmcl/installer@6.3.1`, `@xmcl/core@2.16.0` et `@xmcl/user@4.4.1` ont été publiés sur npm le jour même de ce projet avec un pipeline de publication cassé (repo `Voxelum/minecraft-launcher-core-node`) :

1. Le champ `main` de leur `package.json` pointe encore vers `./index.ts` (jamais inclus dans le tarball) au lieu de la valeur `publishConfig.main` (`./dist/index.js`).
2. `@xmcl/installer` déclare certaines dépendances (`@xmcl/asm`, `@xmcl/unzip`, etc.) en `workspace:^*`, un protocole invalide hors du monorepo d'origine.
3. `@xmcl/core` ne publie plus de sous-module `utils.js` séparé alors que `@xmcl/installer@6.3.1` l'importe encore via `require("@xmcl/core/utils")`.

Corrections appliquées :
- `overrides` dans `package.json` force la résolution des dépendances `workspace:^*` vers de vraies versions publiées.
- `scripts/fix-xmcl-packages.js` (lancé en `postinstall`) répare le champ `main` de chaque paquet `@xmcl/*` et regénère un shim `utils.js` minimal (implémentation triviale : `exists`, `checksum`, `validateSha1`, `isNotNull`, conforme aux types documentés dans `utils.d.ts`).

Si une future version de ces paquets corrige ces bugs upstream, `fix-xmcl-packages.js` devient un no-op (il ne patche que ce qui diffère) — rien à faire de spécial pour mettre à jour, sauf retirer le shim `utils.js` si `@xmcl/core` republie ce sous-module.

## Limites connues

- Testé : démarrage de l'app, résolution des modules, absence d'erreur au boot.
- Non testé de bout en bout dans cette session : le flux complet login Microsoft → téléchargement (~1 Go+) → lancement du jeu, qui nécessite un vrai compte Minecraft premium.
- La liste des blagues chèvre tourne dans `src/renderer/app.js` (`const JOKES = [...]`) — libre à vous d'en ajouter.
