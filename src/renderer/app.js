const NEWS_VERSION = 'v1';

const NEWS = [
  {
    date: '25/07',
    accent: 'accent-pink',
    title: '🐐 Bienvenue dans le chaos',
    body: "Le launcher officieux du live 24h de chevrejesuis est en ligne. Une instance complète Minecraft 1.21.1 + NeoForge + 138 mods, prête en un clic.",
  },
  {
    date: 'PATCH',
    accent: 'accent-cyan',
    title: 'NeoForge 21.1.241',
    body: "Instance basée sur la modlist Chevre2 : 138 mods embarqués, config incluse. Le launcher installe Minecraft, le runtime Java adapté et NeoForge automatiquement.",
  },
  {
    date: 'RÈGLES',
    accent: '',
    title: 'Le troupeau a des règles',
    body: "Pas de grief, pas de duplication de bugs abusive, on respecte les autres chèvres. Le reste : amusez-vous, c'est un live, pas un exam.",
  },
  {
    date: 'INFO',
    accent: '',
    title: 'Rejoindre le serveur',
    body: "L'adresse du serveur est préconfigurée. Modifiable à tout moment dans ⚙ Paramètres si elle change avant le live.",
  },
];

const TAGLINES = [
  "Traduction des bêlements en bytecode...",
  "Compilation du fromage de chèvre en RAM...",
  "NeoForge approuvé par le troupeau officiel",
  "138 mods, zéro mouton toléré",
  "G.O.A.T. = Greatest Of All Time, et de toutes les chèvres",
  "24h de live, 0h de sommeil, 100% chèvre",
];

const els = {
  tickerText: document.getElementById('ticker-text'),

  newsNavBtn: document.getElementById('news-nav-btn'),
  newsDot: document.getElementById('news-dot'),
  newsModal: document.getElementById('news-modal'),
  newsList: document.getElementById('news-list'),
  newsClose: document.getElementById('news-close'),

  loginOverlay: document.getElementById('login-overlay'),
  loginBtn: document.getElementById('login-btn'),
  loginError: document.getElementById('login-error'),

  profileBlock: document.getElementById('profile-block'),
  profileName: document.getElementById('profile-name'),
  logoutBtn: document.getElementById('logout-btn'),

  progressLabel: document.getElementById('progress-label'),
  progressWrap: document.getElementById('progress-wrap'),
  progressBar: document.getElementById('progress-bar'),

  installBtn: document.getElementById('install-btn'),
  playBtn: document.getElementById('play-btn'),
  reinstallBtn: document.getElementById('reinstall-btn'),

  logDetails: document.getElementById('log-details'),
  logOutput: document.getElementById('log-output'),

  settingsBtn: document.getElementById('settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  settingsClose: document.getElementById('settings-close'),
  settingsCancel: document.getElementById('settings-cancel'),
  settingsSave: document.getElementById('settings-save'),
  cfgServerIp: document.getElementById('cfg-server-ip'),
  cfgServerPort: document.getElementById('cfg-server-port'),
  cfgMinMem: document.getElementById('cfg-min-mem'),
  cfgMaxMem: document.getElementById('cfg-max-mem'),
  cfgJavaPath: document.getElementById('cfg-java-path'),
  cfgJavaBrowse: document.getElementById('cfg-java-browse'),

  updateBanner: document.getElementById('update-banner'),
  updateBannerText: document.getElementById('update-banner-text'),
  updateRestartBtn: document.getElementById('update-restart-btn'),
};

function startTagline() {
  let i = 0;
  const set = () => {
    els.tickerText.textContent = TAGLINES[i % TAGLINES.length];
    i += 1;
  };
  set();
  setInterval(set, 9000);
}

function log(line) {
  els.logDetails.classList.remove('hidden');
  els.logOutput.textContent += `${line}\n`;
  els.logOutput.scrollTop = els.logOutput.scrollHeight;
}

function renderNews() {
  els.newsList.innerHTML = '';
  for (const item of NEWS) {
    const div = document.createElement('div');
    div.className = `news-item ${item.accent}`.trim();
    div.innerHTML = `
      <div class="news-item-head">
        <span class="news-item-title">${item.title}</span>
        <span class="news-item-date">${item.date}</span>
      </div>
      <p class="news-item-body">${item.body}</p>
    `;
    els.newsList.appendChild(div);
  }
}

function openNews() {
  els.newsModal.classList.remove('hidden');
  els.newsDot.classList.remove('show');
  localStorage.setItem('chevre.newsSeen', NEWS_VERSION);
}

function checkFirstRunNews() {
  renderNews();
  const seen = localStorage.getItem('chevre.newsSeen');
  if (seen !== NEWS_VERSION) {
    els.newsDot.classList.add('show');
    openNews();
  }
}

function showLoggedOut() {
  els.loginOverlay.classList.remove('hidden');
  els.profileBlock.querySelector('.status-dot').classList.remove('online');
  els.profileName.textContent = 'Non connecté';
  els.logoutBtn.classList.add('hidden');
  els.installBtn.disabled = true;
  els.playBtn.disabled = true;
}

async function showLoggedIn(account) {
  els.loginOverlay.classList.add('hidden');
  els.profileBlock.querySelector('.status-dot').classList.add('online');
  els.profileName.textContent = account.profile.name;
  els.logoutBtn.classList.remove('hidden');

  const installed = await window.chevre.isInstalled();
  els.installBtn.classList.toggle('hidden', installed);
  els.playBtn.classList.toggle('hidden', !installed);
  els.installBtn.disabled = false;
  els.playBtn.disabled = false;
  els.progressLabel.textContent = installed
    ? 'Tout est prêt. La chèvre attend.'
    : 'Prêt à invoquer le chaos.';
}

const PHASE_LABELS = {
  'resolving-version-manifest': 'Consultation du grimoire Mojang...',
  'installing-vanilla': 'Téléchargement de Minecraft 1.21.1...',
  vanilla: 'Téléchargement de Minecraft 1.21.1...',
  'installing-java': "Invocation d'une machine à café Java...",
  java: "Invocation d'une machine à café Java...",
  'installing-neoforge': 'Greffe de NeoForge 21.1.241...',
  neoforge: 'Greffe de NeoForge 21.1.241...',
  'deploying-mods': 'Déversement des 138 mods dans la bergerie...',
  complete: 'Chaos prêt à être déchaîné.',
};

function attachInstallProgress() {
  window.chevre.onInstallProgress((payload) => {
    const label = PHASE_LABELS[payload.phase] || payload.phase;
    els.progressLabel.textContent = label;
    if (typeof payload.progress === 'number' && typeof payload.total === 'number' && payload.total > 0) {
      const pct = Math.min(100, Math.round((payload.progress / payload.total) * 100));
      els.progressBar.style.width = `${pct}%`;
    }
    log(`[${payload.phase}] ${payload.subphase || ''}`.trim());
  });
}

function attachGameEvents() {
  window.chevre.onGameEvent((payload) => {
    if (payload.type === 'window-ready') {
      els.progressLabel.textContent = '🐐 Minecraft a chèvre-marré avec succès. Amuse-toi !';
    }
    if (payload.type === 'exit' || payload.type === 'error') {
      els.progressLabel.textContent =
        payload.type === 'exit'
          ? `Le jeu s'est arrêté (code ${payload.code}).`
          : `Erreur : ${payload.message}`;
      els.playBtn.disabled = false;
      els.installBtn.disabled = false;
    }
  });
}

function attachUpdateEvents() {
  window.chevre.onUpdateEvent((payload) => {
    els.updateBanner.classList.remove('hidden');
    if (payload.type === 'available') {
      els.updateBannerText.textContent = `🐐 Mise à jour ${payload.version} trouvée, téléchargement en cours...`;
    }
    if (payload.type === 'progress') {
      els.updateBannerText.textContent = `Téléchargement de la mise à jour... ${Math.round(payload.percent)}%`;
    }
    if (payload.type === 'downloaded') {
      els.updateBannerText.textContent = `Mise à jour ${payload.version} prête.`;
      els.updateRestartBtn.classList.remove('hidden');
    }
    if (payload.type === 'error') {
      els.updateBanner.classList.add('hidden');
    }
  });
  els.updateRestartBtn.addEventListener('click', () => window.chevre.installUpdate());
}

async function refreshSettingsForm() {
  const cfg = await window.chevre.getConfig();
  els.cfgServerIp.value = cfg.serverIp || '';
  els.cfgServerPort.value = cfg.serverPort || 25565;
  els.cfgMinMem.value = cfg.minMemoryMb || 3072;
  els.cfgMaxMem.value = cfg.maxMemoryMb || 6144;
  els.cfgJavaPath.value = cfg.javaPath || '';
}

function wireEvents() {
  els.newsNavBtn.addEventListener('click', openNews);
  els.newsClose.addEventListener('click', () => els.newsModal.classList.add('hidden'));

  els.loginBtn.addEventListener('click', async () => {
    els.loginError.classList.add('hidden');
    els.loginBtn.disabled = true;
    els.loginBtn.textContent = 'CONNEXION EN COURS...';
    try {
      const account = await window.chevre.login();
      await showLoggedIn(account);
    } catch (err) {
      els.loginError.textContent = err?.message || String(err);
      els.loginError.classList.remove('hidden');
    } finally {
      els.loginBtn.disabled = false;
      els.loginBtn.textContent = 'SE CONNECTER AVEC MICROSOFT';
    }
  });

  els.logoutBtn.addEventListener('click', async () => {
    await window.chevre.logout();
    showLoggedOut();
  });

  els.installBtn.addEventListener('click', async () => {
    els.installBtn.disabled = true;
    els.progressWrap.classList.remove('hidden');
    try {
      await window.chevre.install();
      els.installBtn.classList.add('hidden');
      els.playBtn.classList.remove('hidden');
      els.playBtn.disabled = false;
    } catch (err) {
      log(`ERREUR : ${err?.message || err}`);
      els.progressLabel.textContent = 'Le chaos a mal tourné, regarde le journal.';
    } finally {
      els.installBtn.disabled = false;
    }
  });

  els.reinstallBtn.addEventListener('click', () => {
    els.settingsModal.classList.add('hidden');
    els.playBtn.classList.add('hidden');
    els.installBtn.classList.remove('hidden');
    els.installBtn.disabled = false;
    els.progressWrap.classList.add('hidden');
    els.progressBar.style.width = '0%';
    els.progressLabel.textContent = 'Prêt à invoquer le chaos.';
  });

  els.playBtn.addEventListener('click', async () => {
    els.playBtn.disabled = true;
    els.installBtn.disabled = true;
    els.progressLabel.textContent =
      'Lancement en cours... (le premier chargement peut prendre 1-2 min, ne ferme pas le launcher)';
    try {
      await window.chevre.play();
      // Stays disabled until a game:event (window-ready keeps it running,
      // exit/error re-enables it) — see attachGameEvents.
    } catch (err) {
      els.progressLabel.textContent = `Erreur : ${err?.message || err}`;
      els.playBtn.disabled = false;
      els.installBtn.disabled = false;
    }
  });

  const openSettings = async () => {
    await refreshSettingsForm();
    els.settingsModal.classList.remove('hidden');
  };
  els.settingsBtn.addEventListener('click', openSettings);
  els.settingsClose.addEventListener('click', () => els.settingsModal.classList.add('hidden'));
  els.settingsCancel.addEventListener('click', () => els.settingsModal.classList.add('hidden'));
  els.cfgJavaBrowse.addEventListener('click', async () => {
    const picked = await window.chevre.pickJavaPath();
    if (picked) els.cfgJavaPath.value = picked;
  });

  els.settingsSave.addEventListener('click', async () => {
    await window.chevre.updateConfig({
      serverIp: els.cfgServerIp.value.trim(),
      serverPort: Number(els.cfgServerPort.value) || 25565,
      minMemoryMb: Number(els.cfgMinMem.value) || 3072,
      maxMemoryMb: Number(els.cfgMaxMem.value) || 6144,
      javaPath: els.cfgJavaPath.value.trim(),
    });
    els.settingsModal.classList.add('hidden');
  });

  for (const modal of [els.newsModal, els.settingsModal]) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }
}

async function boot() {
  startTagline();
  wireEvents();
  attachInstallProgress();
  attachGameEvents();
  attachUpdateEvents();
  checkFirstRunNews();

  const account = await window.chevre.tryAutoLogin();
  if (account) await showLoggedIn(account);
  else showLoggedOut();
}

boot();
