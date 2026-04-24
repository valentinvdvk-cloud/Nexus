/* ═══════════════════════════════════════════════════════════
   NEXUS APP — lock.js
   Mot de passe texte + logs d'accès + panel admin
═══════════════════════════════════════════════════════════ */

const Lock = {
  _K: {
    access: 'nexus_access_pwd',
    admin:  'nexus_admin_pwd',
    fails:  'nexus_lock_fails',
    locked: 'nexus_lock_until',
    logs:   'nexus_access_logs',
  },

  /* ── Hash SHA-256 via SubtleCrypto (navigateur) ── */
  async _hash(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  isSetup()    { return !!localStorage.getItem(this._K.access); },
  _getHash(k)  { return localStorage.getItem(k) || ''; },
  async _store(k, v) { localStorage.setItem(k, await this._hash(v)); },

  async checkAccess(p) { return (await this._hash(p)) === this._getHash(this._K.access); },
  async checkAdmin(p)  {
    const h = this._getHash(this._K.admin);
    return !!h && (await this._hash(p)) === h;
  },

  /* ── Session ── */
  _sessionOpen() { return sessionStorage.getItem('nexus_lock_session') === '1'; },
  _openSession() { sessionStorage.setItem('nexus_lock_session', '1'); },

  /* ── Brute-force ── */
  _getFails()  { return parseInt(localStorage.getItem(this._K.fails) || '0', 10); },
  _setFails(n) { localStorage.setItem(this._K.fails, n); },
  _getLocked() { return parseInt(localStorage.getItem(this._K.locked) || '0', 10); },
  _isLocked()  { return Date.now() < this._getLocked(); },
  _lockoutLeft(){ return Math.ceil((this._getLocked() - Date.now()) / 1000); },

  _onFail() {
    const f = this._getFails() + 1;
    this._setFails(f);
    if (f >= 5) {
      const dur = Math.min(30 * Math.pow(2, Math.floor(f / 5) - 1), 3600) * 1000;
      localStorage.setItem(this._K.locked, Date.now() + dur);
    }
  },

  _onSuccess() {
    this._setFails(0);
    localStorage.removeItem(this._K.locked);
  },

  /* ── Log d'accès ── */
  async _logAccess(role) {
    let ip = '?';
    try {
      const r = await fetch('https://api.ipify.org?format=json');
      ip = (await r.json()).ip;
    } catch {}

    const ua = navigator.userAgent;
    const device = this._parseDevice(ua);
    const entry = {
      id: Date.now().toString(36),
      ts: new Date().toISOString(),
      ip,
      device,
      role,
    };

    const logs = JSON.parse(localStorage.getItem(this._K.logs) || '[]');
    logs.unshift(entry);
    if (logs.length > 200) logs.splice(200);
    localStorage.setItem(this._K.logs, JSON.stringify(logs));

    /* Tente d'écrire dans Firestore si disponible */
    if (window.firebaseDb && window.fbFunctions) {
      try {
        const { collection, addDoc, serverTimestamp } = window.fbFunctions;
        await addDoc(collection(window.firebaseDb, 'nexus_access_logs'), {
          ...entry,
          serverTs: serverTimestamp(),
        });
      } catch {}
    }
  },

  _parseDevice(ua) {
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua)) return 'Android';
    if (/Mac/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Linux/.test(ua)) return 'Linux';
    return 'Inconnu';
  },

  /* ──────────────────────────────────────────────────────────
     Affichage
  ────────────────────────────────────────────────────────── */
  show(mode) {
    document.getElementById('lock-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'lock-overlay';
    ov.className = 'lock-overlay';
    ov.innerHTML = mode === 'setup' ? this._htmlSetup() : this._htmlUnlock();
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('visible'));
    mode === 'setup' ? this._bindSetup(ov) : this._bindUnlock(ov);
  },

  _htmlSetup() {
    return `
      <div class="lock-box">
        <div class="lock-logo">✦ NEXUS</div>
        <div class="lock-title">Configuration de l'accès</div>
        <div class="lock-sub">Sécurisez votre application</div>

        <div id="ls-access" class="lock-step-block">
          <div class="lock-step-badge">Étape 1 / 2</div>
          <div class="lock-label">Mot de passe d'accès</div>
          <div class="lock-sub-sm">Ce mot de passe sera demandé à tous les utilisateurs.</div>
          <div class="lock-input-wrap">
            <input id="lock-inp-access" class="lock-text-input" type="password"
              placeholder="Choisissez un mot de passe" autocomplete="new-password"/>
            <button class="lock-eye-btn" data-target="lock-inp-access">👁</button>
          </div>
          <div class="lock-input-wrap" id="wrap-access-confirm">
            <input id="lock-inp-access2" class="lock-text-input" type="password"
              placeholder="Confirmez le mot de passe" autocomplete="new-password"/>
            <button class="lock-eye-btn" data-target="lock-inp-access2">👁</button>
          </div>
          <div class="lock-hint" id="ls-access-hint"></div>
          <button class="lock-submit-btn" id="btn-access-next">Suivant →</button>
        </div>

        <div id="ls-admin" class="lock-step-block" style="display:none">
          <div class="lock-step-badge">Étape 2 / 2</div>
          <div class="lock-label">Mot de passe administrateur</div>
          <div class="lock-sub-sm">Mot de passe secret pour vous seul. Donne accès au panel admin.</div>
          <div class="lock-input-wrap">
            <input id="lock-inp-admin" class="lock-text-input" type="password"
              placeholder="Mot de passe admin" autocomplete="new-password"/>
            <button class="lock-eye-btn" data-target="lock-inp-admin">👁</button>
          </div>
          <div class="lock-input-wrap">
            <input id="lock-inp-admin2" class="lock-text-input" type="password"
              placeholder="Confirmez le mot de passe admin" autocomplete="new-password"/>
            <button class="lock-eye-btn" data-target="lock-inp-admin2">👁</button>
          </div>
          <div class="lock-hint" id="ls-admin-hint"></div>
          <button class="lock-submit-btn" id="btn-admin-save">Sauvegarder ✓</button>
        </div>
      </div>`;
  },

  _htmlUnlock() {
    const locked = this._isLocked();
    return `
      <div class="lock-box">
        <div class="lock-logo">✦ NEXUS</div>
        <div class="lock-title">Mot de passe</div>
        ${locked ? `<div class="lock-lockout" id="lock-lockout">
          Trop de tentatives — réessayez dans <span id="lock-countdown">${this._lockoutLeft()}</span>s
        </div>` : ''}
        <div class="lock-input-wrap" style="margin-top:8px">
          <input id="lock-inp-main" class="lock-text-input" type="password"
            placeholder="Entrez votre mot de passe"
            ${locked ? 'disabled' : ''} autocomplete="current-password"/>
          <button class="lock-eye-btn" data-target="lock-inp-main">👁</button>
        </div>
        <div class="lock-error" id="lock-err" style="display:none">Mot de passe incorrect ✕</div>
        <button class="lock-submit-btn${locked ? ' lock-submit-btn--disabled' : ''}"
          id="btn-unlock" ${locked ? 'disabled' : ''}>Déverrouiller</button>
      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     Eye toggle (show/hide password)
  ────────────────────────────────────────────────────────── */
  _bindEyes(root) {
    root.querySelectorAll('.lock-eye-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp = document.getElementById(btn.dataset.target);
        if (!inp) return;
        inp.type = inp.type === 'password' ? 'text' : 'password';
        btn.textContent = inp.type === 'password' ? '👁' : '🙈';
      });
    });
  },

  /* ──────────────────────────────────────────────────────────
     Logique setup
  ────────────────────────────────────────────────────────── */
  _bindSetup(ov) {
    this._bindEyes(ov);

    const hint = id => document.getElementById(id);

    document.getElementById('btn-access-next')?.addEventListener('click', async () => {
      const v1 = document.getElementById('lock-inp-access')?.value;
      const v2 = document.getElementById('lock-inp-access2')?.value;
      if (!v1 || v1.length < 4) { hint('ls-access-hint').textContent = 'Minimum 4 caractères'; return; }
      if (v1 !== v2) { hint('ls-access-hint').textContent = 'Les mots de passe ne correspondent pas'; return; }
      await this._store(this._K.access, v1);
      document.getElementById('ls-access').style.display = 'none';
      document.getElementById('ls-admin').style.display  = 'flex';
      this._bindEyes(ov);
    });

    document.getElementById('btn-admin-save')?.addEventListener('click', async () => {
      const v1 = document.getElementById('lock-inp-admin')?.value;
      const v2 = document.getElementById('lock-inp-admin2')?.value;
      if (!v1 || v1.length < 4) { hint('ls-admin-hint').textContent = 'Minimum 4 caractères'; return; }
      if (v1 !== v2) { hint('ls-admin-hint').textContent = 'Les mots de passe ne correspondent pas'; return; }
      const accessVal = ''; /* vérification anti-identique via hash */
      if (v1 === (document.getElementById('lock-inp-access')?.value || '')) {
        hint('ls-admin-hint').textContent = 'Doit être différent du mot de passe d\'accès';
        return;
      }
      await this._store(this._K.admin, v1);
      this._doneSetup(ov);
    });

    /* Enter key */
    ov.addEventListener('keydown', async e => {
      if (e.key !== 'Enter') return;
      if (document.getElementById('ls-admin')?.style.display !== 'none') {
        document.getElementById('btn-admin-save')?.click();
      } else {
        document.getElementById('btn-access-next')?.click();
      }
    });
  },

  _doneSetup(ov) {
    ov.classList.add('unlocking');
    setTimeout(() => { ov.remove(); this._openSession(); }, 400);
    if (typeof Toast !== 'undefined') Toast.success('🔒 Application sécurisée !');
  },

  /* ──────────────────────────────────────────────────────────
     Logique unlock
  ────────────────────────────────────────────────────────── */
  _bindUnlock(ov) {
    if (this._isLocked()) { this._startCountdown(); return; }

    const submit = async () => {
      if (this._isLocked()) return;
      const val = document.getElementById('lock-inp-main')?.value || '';
      const err = document.getElementById('lock-err');

      if (await this.checkAccess(val)) {
        this._onSuccess();
        ov.classList.add('unlocking');
        this._logAccess('user');
        setTimeout(() => { ov.remove(); this._openSession(); }, 380);

      } else if (await this.checkAdmin(val)) {
        this._onSuccess();
        ov.classList.add('unlocking');
        this._logAccess('admin');
        setTimeout(() => {
          ov.remove();
          this._openSession();
          setTimeout(() => this.openAdmin(), 300);
        }, 380);

      } else {
        this._onFail();
        ov.classList.add('lock-shake');
        setTimeout(() => ov.classList.remove('lock-shake'), 420);
        if (err) err.style.display = 'block';
        const inp = document.getElementById('lock-inp-main');
        if (inp) inp.value = '';

        if (this._isLocked()) {
          if (err) err.style.display = 'none';
          const btn = document.getElementById('btn-unlock');
          const inp2 = document.getElementById('lock-inp-main');
          if (btn) { btn.disabled = true; btn.classList.add('lock-submit-btn--disabled'); }
          if (inp2) inp2.disabled = true;
          const lo = document.createElement('div');
          lo.className = 'lock-lockout'; lo.id = 'lock-lockout';
          lo.innerHTML = `Trop de tentatives — réessayez dans <span id="lock-countdown">${this._lockoutLeft()}</span>s`;
          ov.querySelector('.lock-title')?.insertAdjacentElement('afterend', lo);
          this._startCountdown();
        }
      }
    };

    document.getElementById('btn-unlock')?.addEventListener('click', submit);
    ov.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    this._bindEyes(ov);
  },

  _startCountdown() {
    const tick = () => {
      const el = document.getElementById('lock-countdown');
      if (!el) return;
      const left = this._lockoutLeft();
      if (left <= 0) {
        const btn  = document.getElementById('btn-unlock');
        const inp  = document.getElementById('lock-inp-main');
        const lo   = document.getElementById('lock-lockout');
        if (btn) { btn.disabled = false; btn.classList.remove('lock-submit-btn--disabled'); }
        if (inp) inp.disabled = false;
        if (lo)  lo.remove();
        return;
      }
      el.textContent = left;
      setTimeout(tick, 1000);
    };
    setTimeout(tick, 1000);
  },

  /* ──────────────────────────────────────────────────────────
     Panel Administrateur
  ────────────────────────────────────────────────────────── */
  openAdmin() {
    document.getElementById('admin-panel')?.remove();

    const count = key => {
      try { return JSON.parse(localStorage.getItem(key) || '[]').length; } catch { return 0; }
    };
    const seances  = count('nexus_seances');
    const events   = count('nexus_events');
    const notes    = count('nexus_notes');
    const trans    = count('nexus_transactions');
    const contacts = count('nexus_contacts');
    const fails    = this._getFails();
    const locked   = this._isLocked();
    const logs     = JSON.parse(localStorage.getItem(this._K.logs) || '[]');

    const p = document.createElement('div');
    p.id = 'admin-panel';
    p.className = 'admin-panel';
    p.innerHTML = `
      <div class="annonces-header">
        <div class="annonces-header-left">
          <span style="font-size:20px">🛡️</span>
          <div>
            <div class="annonces-title">Panel Admin</div>
            <div class="annonces-sub">Accès restreint · NEXUS</div>
          </div>
        </div>
        <button class="btn-close" id="admin-close">✕</button>
      </div>
      <div class="admin-body">

        <div class="admin-section-title">Données de l'appareil</div>
        <div class="admin-stats-grid">
          <div class="admin-stat"><div class="admin-stat-val">${seances}</div><div class="admin-stat-label">Séances</div></div>
          <div class="admin-stat"><div class="admin-stat-val">${events}</div><div class="admin-stat-label">Événements</div></div>
          <div class="admin-stat"><div class="admin-stat-val">${notes}</div><div class="admin-stat-label">Notes</div></div>
          <div class="admin-stat"><div class="admin-stat-val">${trans}</div><div class="admin-stat-label">Transactions</div></div>
          <div class="admin-stat"><div class="admin-stat-val">${contacts}</div><div class="admin-stat-label">Contacts</div></div>
          <div class="admin-stat">
            <div class="admin-stat-val" style="font-size:14px;color:${fails > 0 ? '#EF4444' : '#10B981'}">${fails}</div>
            <div class="admin-stat-label">Tentatives échouées</div>
          </div>
        </div>

        <div class="admin-section-title" style="margin-top:20px">
          Journaux d'accès
          <span class="admin-log-count">${logs.length} entrée${logs.length !== 1 ? 's' : ''}</span>
        </div>
        ${logs.length === 0 ? `
          <div class="admin-empty-logs">Aucune connexion enregistrée</div>
        ` : `
          <div class="admin-log-list">
            ${logs.map(l => `
              <div class="admin-log-entry">
                <div class="admin-log-top">
                  <span class="admin-log-role admin-log-role--${l.role}">${l.role === 'admin' ? '🛡️ Admin' : '👤 Utilisateur'}</span>
                  <span class="admin-log-device">${l.device}</span>
                </div>
                <div class="admin-log-ip">🌐 ${l.ip}</div>
                <div class="admin-log-date">${new Date(l.ts).toLocaleString('fr-FR')}</div>
              </div>
            `).join('')}
          </div>
        `}

        <div class="admin-section-title" style="margin-top:20px">Sécurité</div>
        <div class="admin-security-info">
          <div class="admin-security-row">
            <span>🔒 Anti-brute force</span>
            <span class="admin-badge ${locked ? 'admin-badge-warn' : 'admin-badge-ok'}">${locked ? `Actif (${this._lockoutLeft()}s)` : 'Actif'}</span>
          </div>
          <div class="admin-security-row">
            <span>🔑 Hash des mots de passe</span>
            <span class="admin-badge admin-badge-ok">SHA-256</span>
          </div>
        </div>

        <div class="admin-section-title" style="margin-top:20px">Actions</div>
        <button class="btn btn-outline btn-sm w-full" id="admin-clear-logs" style="margin-bottom:8px">
          🗑️ Effacer les journaux d'accès
        </button>
        <button class="btn btn-outline btn-sm w-full" id="admin-reset-fails" style="margin-bottom:8px">
          🔓 Réinitialiser les tentatives échouées
        </button>
        <button class="btn btn-outline btn-sm w-full" id="admin-reset-codes">
          🔑 Reconfigurer les mots de passe
        </button>
      </div>`;

    document.body.appendChild(p);
    requestAnimationFrame(() => p.classList.add('open'));

    document.getElementById('admin-close')?.addEventListener('click', () => {
      p.classList.remove('open');
      setTimeout(() => p.remove(), 280);
    });

    document.getElementById('admin-clear-logs')?.addEventListener('click', () => {
      if (!confirm('Effacer tous les journaux d\'accès ?')) return;
      localStorage.removeItem(this._K.logs);
      if (typeof Toast !== 'undefined') Toast.success('Journaux effacés');
      p.remove(); this.openAdmin();
    });

    document.getElementById('admin-reset-fails')?.addEventListener('click', () => {
      this._setFails(0);
      localStorage.removeItem(this._K.locked);
      if (typeof Toast !== 'undefined') Toast.success('Tentatives réinitialisées');
      p.remove(); this.openAdmin();
    });

    document.getElementById('admin-reset-codes')?.addEventListener('click', () => {
      if (!confirm('Reconfigurer les mots de passe ? Les anciens seront effacés.')) return;
      p.remove();
      [this._K.access, this._K.admin, this._K.fails, this._K.locked].forEach(k =>
        localStorage.removeItem(k)
      );
      sessionStorage.removeItem('nexus_lock_session');
      this.show('setup');
    });
  },

  /* ── Init ── */
  init() {
    if (this._sessionOpen()) return;
    this.show(this.isSetup() ? 'unlock' : 'setup');
  },
};
