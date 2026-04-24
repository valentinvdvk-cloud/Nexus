/* ═══════════════════════════════════════════════════════════
   NEXUS APP — lock.js
   Accès admin via code secret + panel administrateur
═══════════════════════════════════════════════════════════ */

const Lock = {
  _K: {
    admin:  'nexus_admin_code',
    fails:  'nexus_lock_fails',
    locked: 'nexus_lock_until',
    logs:   'nexus_access_logs',
  },

  /* ── Code admin (stocké haché à l'init) ── */
  _ADMIN_CODE: 'Q8&mK!4nRx#pL$7Jv@2zT%9wY',

  /* ── Hash SHA-256 ── */
  async _hash(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async _store(k, v) { localStorage.setItem(k, await this._hash(v)); },

  async checkAdmin(p) {
    const h = localStorage.getItem(this._K.admin);
    return !!h && (await this._hash(p)) === h;
  },

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

  /* Container selon le mode */
  _root() { return (document.body.classList.contains('force-mobile') && document.getElementById('app')) || document.body; },

  /* ── Log d'accès ── */
  async _logAccess() {
    let ip = '?';
    try {
      const r = await fetch('https://api.ipify.org?format=json');
      ip = (await r.json()).ip;
    } catch {}
    const ua = navigator.userAgent;
    const device = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad'
      : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac'
      : /Windows/.test(ua) ? 'Windows' : 'Autre';
    const entry = { id: Date.now().toString(36), ts: new Date().toISOString(), ip, device };
    const logs = JSON.parse(localStorage.getItem(this._K.logs) || '[]');
    logs.unshift(entry);
    if (logs.length > 200) logs.splice(200);
    localStorage.setItem(this._K.logs, JSON.stringify(logs));
  },

  /* ──────────────────────────────────────────────────────────
     Modal de saisie du code
  ────────────────────────────────────────────────────────── */
  openCodeEntry() {
    if (document.getElementById('admin-code-modal')) return;

    const locked = this._isLocked();
    const m = document.createElement('div');
    m.id = 'admin-code-modal';
    m.className = 'admin-code-modal';
    m.innerHTML = `
      <div class="admin-code-box">
        <div class="admin-code-header">
          <div class="admin-code-title">Accès administrateur</div>
          <button class="btn-close" id="admin-code-close">✕</button>
        </div>
        ${locked ? `<div class="lock-lockout">Trop de tentatives — réessayez dans <span id="lock-countdown">${this._lockoutLeft()}</span>s</div>` : ''}
        <div class="lock-input-wrap">
          <input id="admin-code-inp" class="lock-text-input" type="password"
            placeholder="Code administrateur" ${locked ? 'disabled' : ''} autocomplete="off"/>
          <button class="lock-eye-btn" data-target="admin-code-inp">👁</button>
        </div>
        <div class="lock-error" id="admin-code-err" style="display:none">Code incorrect ✕</div>
        <button class="lock-submit-btn${locked ? ' lock-submit-btn--disabled' : ''}"
          id="admin-code-submit" ${locked ? 'disabled' : ''}>Accéder au panel →</button>
      </div>`;

    this._root().appendChild(m);
    requestAnimationFrame(() => m.classList.add('open'));

    if (locked) this._startCountdown('admin-code-inp', 'admin-code-submit');

    /* Eye toggle */
    m.querySelector('.lock-eye-btn')?.addEventListener('click', () => {
      const inp = document.getElementById('admin-code-inp');
      inp.type = inp.type === 'password' ? 'text' : 'password';
      m.querySelector('.lock-eye-btn').textContent = inp.type === 'password' ? '👁' : '🙈';
    });

    const close = () => {
      m.classList.remove('open');
      setTimeout(() => m.remove(), 250);
    };

    document.getElementById('admin-code-close')?.addEventListener('click', close);
    m.addEventListener('click', e => { if (e.target === m) close(); });

    const submit = async () => {
      if (this._isLocked()) return;
      const val = document.getElementById('admin-code-inp')?.value || '';
      const err = document.getElementById('admin-code-err');

      if (await this.checkAdmin(val)) {
        this._onSuccess();
        this._logAccess();
        close();
        setTimeout(() => this.openAdmin(), 260);
      } else {
        this._onFail();
        const box = m.querySelector('.admin-code-box');
        box.classList.add('lock-shake-box');
        setTimeout(() => box.classList.remove('lock-shake-box'), 420);
        if (err) err.style.display = 'block';
        const inp = document.getElementById('admin-code-inp');
        if (inp) inp.value = '';
        if (this._isLocked()) {
          if (err) err.style.display = 'none';
          const btn = document.getElementById('admin-code-submit');
          if (inp) inp.disabled = true;
          if (btn) { btn.disabled = true; btn.classList.add('lock-submit-btn--disabled'); }
          const lo = document.createElement('div');
          lo.className = 'lock-lockout'; lo.id = 'lock-lockout';
          lo.innerHTML = `Trop de tentatives — réessayez dans <span id="lock-countdown">${this._lockoutLeft()}</span>s`;
          m.querySelector('.admin-code-header')?.insertAdjacentElement('afterend', lo);
          this._startCountdown('admin-code-inp', 'admin-code-submit');
        }
      }
    };

    document.getElementById('admin-code-submit')?.addEventListener('click', submit);
    document.getElementById('admin-code-inp')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') submit();
    });

    setTimeout(() => document.getElementById('admin-code-inp')?.focus(), 100);
  },

  _startCountdown(inpId, btnId) {
    const tick = () => {
      const el = document.getElementById('lock-countdown');
      if (!el) return;
      const left = this._lockoutLeft();
      if (left <= 0) {
        const inp = document.getElementById(inpId);
        const btn = document.getElementById(btnId);
        const lo  = document.getElementById('lock-lockout');
        if (inp) inp.disabled = false;
        if (btn) { btn.disabled = false; btn.classList.remove('lock-submit-btn--disabled'); }
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
        ${logs.length === 0
          ? `<div class="admin-empty-logs">Aucune connexion admin enregistrée</div>`
          : `<div class="admin-log-list">
              ${logs.map(l => `
                <div class="admin-log-entry">
                  <div class="admin-log-top">
                    <span class="admin-log-role admin-log-role--admin">🛡️ Admin</span>
                    <span class="admin-log-device">${l.device}</span>
                  </div>
                  <div class="admin-log-ip">🌐 ${l.ip}</div>
                  <div class="admin-log-date">${new Date(l.ts).toLocaleString('fr-FR')}</div>
                </div>`).join('')}
            </div>`
        }

        <div class="admin-section-title" style="margin-top:20px">Sécurité</div>
        <div class="admin-security-info">
          <div class="admin-security-row">
            <span>🔒 Anti-brute force</span>
            <span class="admin-badge ${locked ? 'admin-badge-warn' : 'admin-badge-ok'}">${locked ? `Verrouillé (${this._lockoutLeft()}s)` : 'Actif'}</span>
          </div>
          <div class="admin-security-row">
            <span>🔑 Hash du code</span>
            <span class="admin-badge admin-badge-ok">SHA-256</span>
          </div>
        </div>

        <div class="admin-section-title" style="margin-top:20px">Actions</div>
        <button class="btn btn-outline btn-sm w-full" id="admin-clear-logs" style="margin-bottom:8px">
          🗑️ Effacer les journaux d'accès
        </button>
        <button class="btn btn-outline btn-sm w-full" id="admin-reset-fails">
          🔓 Réinitialiser les tentatives échouées
        </button>
      </div>`;

    this._root().appendChild(p);
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
  },

  /* ── Init : stocke le hash du code admin + bind le bouton ── */
  async init() {
    /* Stocke le hash du code admin si pas encore fait */
    if (!localStorage.getItem(this._K.admin)) {
      await this._store(this._K.admin, this._ADMIN_CODE);
    }

    /* Bind le bouton topbar */
    const btn = document.getElementById('admin-trigger-btn');
    if (btn) btn.addEventListener('click', () => this.openCodeEntry());
  },
};
