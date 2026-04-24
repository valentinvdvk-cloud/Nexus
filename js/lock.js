/* ═══════════════════════════════════════════════════════════
   NEXUS APP — lock.js
   Écran de verrouillage PIN + panel administrateur
═══════════════════════════════════════════════════════════ */

const Lock = {
  _K: {
    pin:   'nexus_lock_pin',
    admin: 'nexus_lock_admin',
    name:  'nexus_lock_name',
  },

  /* ── Hash djb2 (non-cryptographique, suffisant pour un PIN local) ── */
  _hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
    return (h >>> 0).toString(36);
  },

  isPinSet()    { return !!localStorage.getItem(this._K.pin); },
  checkPin(p)   { return this._hash(p) === localStorage.getItem(this._K.pin); },
  checkAdmin(p) { return !!localStorage.getItem(this._K.admin) && this._hash(p) === localStorage.getItem(this._K.admin); },
  setPin(p)     { localStorage.setItem(this._K.pin,   this._hash(p)); },
  setAdmin(p)   { localStorage.setItem(this._K.admin, this._hash(p)); },
  getName()     { return localStorage.getItem(this._K.name) || ''; },
  setName(n)    { localStorage.setItem(this._K.name, n); },

  /* ── Session : déverrouillé jusqu'à fermeture de l'onglet ── */
  _sessionOpen() { return sessionStorage.getItem('nexus_lock_session') === '1'; },
  _openSession() { sessionStorage.setItem('nexus_lock_session', '1'); },

  /* ── Met à jour les points du PIN ── */
  _dots(id, n) {
    document.querySelectorAll(`#${id} span`).forEach((s, i) =>
      s.classList.toggle('filled', i < n)
    );
  },

  /* ── Génère un pavé numérique ── */
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
     Affichage de l'écran
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
        <div class="lock-title">Première connexion</div>
        <div class="lock-sub">Sécurisez votre application</div>

        <div id="ls-name" class="lock-step-block">
          <div class="lock-label">Votre prénom (optionnel)</div>
          <input id="lock-name-inp" class="lock-name-input" type="text"
            placeholder="Ex: Valentin" maxlength="30" autocomplete="off"/>
          <button class="lock-next-btn" id="lock-name-next">Suivant →</button>
        </div>

        <div id="ls-pin" class="lock-step-block" style="display:none">
          <div class="lock-label" id="ls-pin-label">Choisissez un PIN à 4 chiffres</div>
          <div class="lock-dots" id="lock-dots-main">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="lock-pad" id="lock-pad-main"></div>
          <div class="lock-hint" id="ls-hint"></div>
        </div>

        <div id="ls-admin" class="lock-step-block" style="display:none">
          <div class="lock-label">Code administrateur</div>
          <div class="lock-sub-sm">4 chiffres différents de votre PIN. Donne accès au panel admin.</div>
          <div class="lock-dots" id="lock-dots-admin">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="lock-pad" id="lock-pad-admin"></div>
          <button class="lock-skip-btn" id="ls-skip-admin">Ignorer cette étape</button>
        </div>
      </div>`;
  },

  _htmlUnlock() {
    const name = this.getName();
    return `
      <div class="lock-box">
        <div class="lock-logo">✦ NEXUS</div>
        ${name ? `<div class="lock-welcome">Bonjour, ${name} 👋</div>` : ''}
        <div class="lock-title">Entrez votre PIN</div>
        <div class="lock-dots" id="lock-dots-main">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="lock-pad" id="lock-pad-main"></div>
        <div class="lock-error" id="lock-err" style="display:none">Code incorrect ✕</div>
      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     Logique setup
  ────────────────────────────────────────────────────────── */
  _bindSetup(ov) {
    let pin = '', firstPin = '', step = 'name';

    const goPin = () => {
      const v = document.getElementById('lock-name-inp')?.value.trim();
      if (v) this.setName(v);
      document.getElementById('ls-name').style.display = 'none';
      document.getElementById('ls-pin').style.display = 'flex';
      step = 'pin';
      bindMainPad();
    };

    document.getElementById('lock-name-next')?.addEventListener('click', goPin);
    document.getElementById('lock-name-inp')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') goPin();
    });

    const bindMainPad = () => {
      this._pad('lock-pad-main',
        (d) => {
          if (pin.length >= 4) return;
          pin += d;
          this._dots('lock-dots-main', pin.length);
          if (pin.length < 4) return;

          if (step === 'pin') {
            firstPin = pin; pin = ''; step = 'confirm';
            this._dots('lock-dots-main', 0);
            document.getElementById('ls-pin-label').textContent = 'Confirmez votre PIN';
          } else {
            if (pin === firstPin) {
              this.setPin(pin);
              /* Passe à l'étape admin */
              document.getElementById('ls-pin').style.display = 'none';
              document.getElementById('ls-admin').style.display = 'flex';
              let ap = '';
              this._pad('lock-pad-admin',
                (d2) => {
                  if (ap.length >= 4) return;
                  ap += d2; this._dots('lock-dots-admin', ap.length);
                  if (ap.length === 4) { this.setAdmin(ap); this._doneSetup(ov); }
                },
                () => { ap = ap.slice(0, -1); this._dots('lock-dots-admin', ap.length); }
              );
              document.getElementById('ls-skip-admin')
                ?.addEventListener('click', () => this._doneSetup(ov));
            } else {
              pin = ''; firstPin = ''; step = 'pin';
              this._dots('lock-dots-main', 0);
              const lbl = document.getElementById('ls-pin-label');
              if (lbl) lbl.textContent = 'Codes différents — réessayez';
            }
          }
        },
        () => { pin = pin.slice(0, -1); this._dots('lock-dots-main', pin.length); }
      );
    };
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

    this._pad('lock-pad-main',
      (d) => {
        if (pin.length >= 4) return;
        pin += d;
        this._dots('lock-dots-main', pin.length);
        if (pin.length < 4) return;

        if (this.checkPin(pin)) {
          ov.classList.add('unlocking');
          setTimeout(() => { ov.remove(); this._openSession(); }, 380);

        } else if (this.checkAdmin(pin)) {
          ov.classList.add('unlocking');
          setTimeout(() => {
            ov.remove();
            this._openSession();
            setTimeout(() => this.openAdmin(), 300);
          }, 380);

        } else {
          ov.classList.add('lock-shake');
          setTimeout(() => ov.classList.remove('lock-shake'), 420);
          const e = err(); if (e) e.style.display = 'block';
          pin = ''; this._dots('lock-dots-main', 0);
        }
      },
      () => {
        pin = pin.slice(0, -1);
        this._dots('lock-dots-main', pin.length);
        const e = err(); if (e) e.style.display = 'none';
      }
    );
  },

  /* ──────────────────────────────────────────────────────────
     Panel Administrateur
  ────────────────────────────────────────────────────────── */
  openAdmin() {
    document.getElementById('admin-panel')?.remove();

    const count = key => {
      try { return JSON.parse(localStorage.getItem(key) || '[]').length; } catch { return 0; }
    };
    const seances = count('nexus_seances');
    const events  = count('nexus_events');
    const notes   = count('nexus_notes');
    const trans   = count('nexus_transactions');
    const contacts= count('nexus_contacts');
    const name    = this.getName() || 'Inconnu';

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

        <div class="admin-section-title">Utilisateur actuel</div>
        <div class="admin-user-row">
          <div class="admin-user-avatar">${name.charAt(0).toUpperCase()}</div>
          <div>
            <div style="font-weight:600;font-size:14px">${name}</div>
            <div style="font-size:11px;color:var(--text-muted)">Cet appareil</div>
          </div>
        </div>

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
            <div class="admin-stat-val" style="font-size:16px">${new Date().toLocaleDateString('fr-FR')}</div>
            <div class="admin-stat-label">Date</div>
          </div>
        </div>

        <div class="admin-section-title" style="margin-top:20px">Utilisateurs multi-appareils</div>
        <div class="admin-firestore-note">
          <span style="font-size:24px">☁️</span>
          <div>
            <div style="font-weight:600;font-size:13px;margin-bottom:6px">Firestore non configuré</div>
            <div style="font-size:12px;color:var(--text-muted);line-height:1.6">
              Configurez Firebase Firestore pour voir la liste de tous les utilisateurs,
              leur prénom et leurs statistiques depuis n'importe quel appareil en temps réel.
            </div>
          </div>
        </div>

        <div class="admin-section-title" style="margin-top:20px">Sécurité</div>
        <button class="btn btn-outline btn-sm w-full" id="admin-reset-pin" style="margin-bottom:8px">
          🔑 Reconfigurer le PIN & code admin
        </button>
      </div>`;

    document.body.appendChild(p);
    requestAnimationFrame(() => p.classList.add('open'));

    document.getElementById('admin-close')?.addEventListener('click', () => {
      p.classList.remove('open');
      setTimeout(() => p.remove(), 280);
    });

    document.getElementById('admin-reset-pin')?.addEventListener('click', () => {
      p.remove();
      localStorage.removeItem(this._K.pin);
      localStorage.removeItem(this._K.admin);
      sessionStorage.removeItem('nexus_lock_session');
      this.show('setup');
    });
  },

  /* ── Init ── */
  init() {
    if (this._sessionOpen()) return;
    this.show(this.isPinSet() ? 'unlock' : 'setup');
  },
};
