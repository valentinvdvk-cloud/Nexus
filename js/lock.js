/* ═══════════════════════════════════════════════════════════
   NEXUS APP — lock.js
   Code d'accès partagé + panel administrateur
═══════════════════════════════════════════════════════════ */

const Lock = {
  _K: {
    access: 'nexus_access_code',
    admin:  'nexus_admin_code',
    fails:  'nexus_lock_fails',
    locked: 'nexus_lock_until',
  },

  /* ── Hash djb2 ── */
  _hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
    return (h >>> 0).toString(36);
  },

  isSetup()      { return !!localStorage.getItem(this._K.access); },
  checkAccess(p) { return this._hash(p) === localStorage.getItem(this._K.access); },
  checkAdmin(p)  { return !!localStorage.getItem(this._K.admin) && this._hash(p) === localStorage.getItem(this._K.admin); },
  setAccess(p)   { localStorage.setItem(this._K.access, this._hash(p)); },
  setAdmin(p)    { localStorage.setItem(this._K.admin,  this._hash(p)); },

  /* ── Session : déverrouillé jusqu'à fermeture de l'onglet ── */
  _sessionOpen() { return sessionStorage.getItem('nexus_lock_session') === '1'; },
  _openSession() { sessionStorage.setItem('nexus_lock_session', '1'); },

  /* ── Brute-force protection ── */
  _getFails()    { return parseInt(localStorage.getItem(this._K.fails) || '0', 10); },
  _setFails(n)   { localStorage.setItem(this._K.fails, n); },
  _getLocked()   { return parseInt(localStorage.getItem(this._K.locked) || '0', 10); },
  _isLocked()    { return Date.now() < this._getLocked(); },
  _lockoutLeft() { return Math.ceil((this._getLocked() - Date.now()) / 1000); },

  _onFail() {
    const fails = this._getFails() + 1;
    this._setFails(fails);
    if (fails >= 5) {
      /* Durée exponentielle : 30s, 60s, 120s… plafonné à 1h */
      const duration = Math.min(30 * Math.pow(2, Math.floor(fails / 5) - 1), 3600) * 1000;
      localStorage.setItem(this._K.locked, Date.now() + duration);
    }
  },

  _onSuccess() {
    this._setFails(0);
    localStorage.removeItem(this._K.locked);
  },

  /* ── Dots ── */
  _dots(id, n) {
    document.querySelectorAll(`#${id} span`).forEach((s, i) =>
      s.classList.toggle('filled', i < n)
    );
  },

  /* ── Pavé numérique ── */
  _pad(containerId, onDigit, onDel) {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = [1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(d =>
      d === '' ? '<span class="lock-pad-empty"></span>'
               : `<button class="lock-pad-btn" data-v="${d}">${d}</button>`
    ).join('');
    c.addEventListener('click', e => {
      const btn = e.target.closest('.lock-pad-btn');
      if (!btn) return;
      btn.dataset.v === '⌫' ? onDel() : onDigit(btn.dataset.v);
    });
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
          <div class="lock-label" id="ls-access-lbl">Code d'accès</div>
          <div class="lock-sub-sm">Ce code sera demandé à tous les utilisateurs.</div>
          <div class="lock-dots" id="lock-dots-access">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="lock-pad" id="lock-pad-access"></div>
          <div class="lock-hint" id="ls-access-hint"></div>
        </div>

        <div id="ls-admin" class="lock-step-block" style="display:none">
          <div class="lock-label" id="ls-admin-lbl">Code administrateur</div>
          <div class="lock-sub-sm">Code secret pour vous seul. Donne accès au panel admin.</div>
          <div class="lock-dots" id="lock-dots-admin">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="lock-pad" id="lock-pad-admin"></div>
          <div class="lock-hint" id="ls-admin-hint"></div>
        </div>
      </div>`;
  },

  _htmlUnlock() {
    const locked = this._isLocked();
    return `
      <div class="lock-box">
        <div class="lock-logo">✦ NEXUS</div>
        <div class="lock-title">Code d'accès</div>
        ${locked ? `<div class="lock-lockout" id="lock-lockout">
          Trop de tentatives — réessayez dans <span id="lock-countdown">${this._lockoutLeft()}</span>s
        </div>` : ''}
        <div class="lock-dots${locked ? ' lock-dots--disabled' : ''}" id="lock-dots-main">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="lock-pad${locked ? ' lock-pad--disabled' : ''}" id="lock-pad-main"></div>
        <div class="lock-error" id="lock-err" style="display:none">Code incorrect ✕</div>
      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     Logique setup
  ────────────────────────────────────────────────────────── */
  _bindSetup(ov) {
    let access = '', firstAccess = '', step = 'access';

    const bindAdminPad = (savedAccess) => {
      let admin = '', firstAdmin = '', adminStep = 'admin';
      this._pad('lock-pad-admin',
        (d) => {
          if (admin.length >= 4) return;
          admin += d;
          this._dots('lock-dots-admin', admin.length);
          if (admin.length < 4) return;

          if (adminStep === 'admin') {
            firstAdmin = admin; admin = ''; adminStep = 'confirm';
            this._dots('lock-dots-admin', 0);
            document.getElementById('ls-admin-lbl').textContent = 'Confirmez le code admin';
          } else {
            if (admin !== firstAdmin) {
              admin = ''; firstAdmin = ''; adminStep = 'admin';
              this._dots('lock-dots-admin', 0);
              document.getElementById('ls-admin-lbl').textContent = 'Codes différents — réessayez';
              return;
            }
            if (admin === savedAccess) {
              admin = ''; firstAdmin = ''; adminStep = 'admin';
              this._dots('lock-dots-admin', 0);
              document.getElementById('ls-admin-lbl').textContent = 'Code admin';
              document.getElementById('ls-admin-hint').textContent = 'Doit être différent du code d\'accès';
              return;
            }
            this.setAdmin(admin);
            this._doneSetup(ov);
          }
        },
        () => { admin = admin.slice(0, -1); this._dots('lock-dots-admin', admin.length); }
      );
    };

    this._pad('lock-pad-access',
      (d) => {
        if (access.length >= 4) return;
        access += d;
        this._dots('lock-dots-access', access.length);
        if (access.length < 4) return;

        if (step === 'access') {
          firstAccess = access; access = ''; step = 'confirm';
          this._dots('lock-dots-access', 0);
          document.getElementById('ls-access-lbl').textContent = 'Confirmez le code d\'accès';
        } else {
          if (access !== firstAccess) {
            access = ''; firstAccess = ''; step = 'access';
            this._dots('lock-dots-access', 0);
            document.getElementById('ls-access-lbl').textContent = 'Codes différents — réessayez';
            return;
          }
          this.setAccess(access);
          const saved = access;
          document.getElementById('ls-access').style.display = 'none';
          document.getElementById('ls-admin').style.display = 'flex';
          bindAdminPad(saved);
        }
      },
      () => { access = access.slice(0, -1); this._dots('lock-dots-access', access.length); }
    );
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
    let pin = '';
    const err = () => document.getElementById('lock-err');

    if (this._isLocked()) { this._startCountdown(); return; }

    this._pad('lock-pad-main',
      (d) => {
        if (this._isLocked()) return;
        if (pin.length >= 4) return;
        pin += d;
        this._dots('lock-dots-main', pin.length);
        if (pin.length < 4) return;

        if (this.checkAccess(pin)) {
          this._onSuccess();
          ov.classList.add('unlocking');
          setTimeout(() => { ov.remove(); this._openSession(); }, 380);

        } else if (this.checkAdmin(pin)) {
          this._onSuccess();
          ov.classList.add('unlocking');
          setTimeout(() => {
            ov.remove();
            this._openSession();
            setTimeout(() => this.openAdmin(), 300);
          }, 380);

        } else {
          this._onFail();
          ov.classList.add('lock-shake');
          setTimeout(() => ov.classList.remove('lock-shake'), 420);
          const e = err(); if (e) e.style.display = 'block';
          pin = ''; this._dots('lock-dots-main', 0);

          if (this._isLocked()) {
            if (e) e.style.display = 'none';
            const pad  = document.getElementById('lock-pad-main');
            const dots = document.getElementById('lock-dots-main');
            if (pad)  pad.classList.add('lock-pad--disabled');
            if (dots) dots.classList.add('lock-dots--disabled');
            const box = ov.querySelector('.lock-box');
            let lo = document.createElement('div');
            lo.className = 'lock-lockout'; lo.id = 'lock-lockout';
            lo.innerHTML = `Trop de tentatives — réessayez dans <span id="lock-countdown">${this._lockoutLeft()}</span>s`;
            box.querySelector('.lock-title')?.insertAdjacentElement('afterend', lo);
            this._startCountdown();
          }
        }
      },
      () => {
        if (this._isLocked()) return;
        pin = pin.slice(0, -1);
        this._dots('lock-dots-main', pin.length);
        const e = err(); if (e) e.style.display = 'none';
      }
    );
  },

  _startCountdown() {
    const tick = () => {
      const el = document.getElementById('lock-countdown');
      if (!el) return;
      const left = this._lockoutLeft();
      if (left <= 0) {
        const pad  = document.getElementById('lock-pad-main');
        const dots = document.getElementById('lock-dots-main');
        const lo   = document.getElementById('lock-lockout');
        if (pad)  pad.classList.remove('lock-pad--disabled');
        if (dots) dots.classList.remove('lock-dots--disabled');
        if (lo)   lo.remove();
        /* Re-bind le pad maintenant déverrouillé */
        this._bindUnlock(document.getElementById('lock-overlay'));
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

        <div class="admin-section-title">Données de cet appareil</div>
        <div class="admin-stats-grid">
          <div class="admin-stat">
            <div class="admin-stat-val">${seances}</div>
            <div class="admin-stat-label">Séances</div>
          </div>
          <div class="admin-stat">
            <div class="admin-stat-val">${events}</div>
            <div class="admin-stat-label">Événements</div>
          </div>
          <div class="admin-stat">
            <div class="admin-stat-val">${notes}</div>
            <div class="admin-stat-label">Notes</div>
          </div>
          <div class="admin-stat">
            <div class="admin-stat-val">${trans}</div>
            <div class="admin-stat-label">Transactions</div>
          </div>
          <div class="admin-stat">
            <div class="admin-stat-val">${contacts}</div>
            <div class="admin-stat-label">Contacts</div>
          </div>
          <div class="admin-stat">
            <div class="admin-stat-val" style="font-size:14px;color:${fails > 0 ? '#EF4444' : '#10B981'}">${fails}</div>
            <div class="admin-stat-label">Tentatives échouées</div>
          </div>
        </div>

        <div class="admin-section-title" style="margin-top:20px">Sécurité</div>
        <div class="admin-security-info">
          <div class="admin-security-row">
            <span>🔑 Code d'accès</span>
            <span class="admin-badge admin-badge-ok">Configuré</span>
          </div>
          <div class="admin-security-row">
            <span>🛡️ Code admin</span>
            <span class="admin-badge admin-badge-ok">Configuré</span>
          </div>
          <div class="admin-security-row">
            <span>🔒 Anti-brute force</span>
            <span class="admin-badge ${locked ? 'admin-badge-warn' : 'admin-badge-ok'}">${locked ? `Actif (${this._lockoutLeft()}s)` : 'Actif'}</span>
          </div>
          <div class="admin-security-row">
            <span>📅 Date</span>
            <span style="font-size:12px;color:var(--text-muted)">${new Date().toLocaleDateString('fr-FR')}</span>
          </div>
        </div>

        <div class="admin-section-title" style="margin-top:20px">Actions</div>
        <button class="btn btn-outline btn-sm w-full" id="admin-reset-fails" style="margin-bottom:8px">
          🔓 Réinitialiser les tentatives échouées
        </button>
        <button class="btn btn-outline btn-sm w-full" id="admin-reset-codes" style="margin-bottom:8px">
          🔑 Reconfigurer les codes d'accès
        </button>
      </div>`;

    document.body.appendChild(p);
    requestAnimationFrame(() => p.classList.add('open'));

    document.getElementById('admin-close')?.addEventListener('click', () => {
      p.classList.remove('open');
      setTimeout(() => p.remove(), 280);
    });

    document.getElementById('admin-reset-fails')?.addEventListener('click', () => {
      this._setFails(0);
      localStorage.removeItem(this._K.locked);
      if (typeof Toast !== 'undefined') Toast.success('Tentatives réinitialisées');
      p.remove();
    });

    document.getElementById('admin-reset-codes')?.addEventListener('click', () => {
      if (!confirm('Reconfigurer les codes ? Les anciens codes seront effacés.')) return;
      p.remove();
      localStorage.removeItem(this._K.access);
      localStorage.removeItem(this._K.admin);
      localStorage.removeItem(this._K.fails);
      localStorage.removeItem(this._K.locked);
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
