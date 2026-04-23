/* ═══════════════════════════════════════════════════════════
   NEXUS APP — auth.js
   Firebase Auth · Login · Register · Forgot password
═══════════════════════════════════════════════════════════ */

const Auth = {

  localMode: false,
  usernameCheckTimer: null,

  /* ── INJECTER L'ÉCRAN AUTH ── */
  show() {
    document.getElementById('app')?.classList.add('hidden');
    let screen = document.getElementById('auth-screen');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'auth-screen';
      screen.innerHTML = this._buildHTML();
      document.body.appendChild(screen);
    }
    screen.classList.remove('hidden');
    this._bindEvents();
  },

  hide() {
    document.getElementById('auth-screen')?.classList.add('hidden');
    document.getElementById('app')?.classList.remove('hidden');
  },

  /* ── HTML ── */
  _buildHTML() {
    return `
      <div class="auth-bg">
        <div class="auth-glow-1"></div>
        <div class="auth-glow-2"></div>
        <div class="auth-particles" id="auth-particles"></div>
      </div>

      <div class="auth-card anim-scale-in">

        <div class="auth-logo">
          <div class="auth-logo-icon">N</div>
          <span>NEXUS</span>
        </div>
        <p class="auth-tagline">Ton assistant personnel tout-en-un</p>

        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login">Connexion</button>
          <button class="auth-tab" data-tab="register">Créer un compte</button>
        </div>

        <!-- CONNEXION -->
        <form id="form-login" class="auth-form active" autocomplete="on">

          <div class="form-group">
            <label class="auth-label">Nom d'utilisateur ou Email</label>
            <div class="input-icon-wrapper">
              <span class="input-icon">👤</span>
              <input type="text" id="login-identifier" class="auth-input"
                placeholder="pseudo ou email@exemple.com"
                autocomplete="username" required/>
            </div>
          </div>

          <div class="form-group">
            <label class="auth-label">Mot de passe</label>
            <div class="input-icon-wrapper">
              <span class="input-icon">🔒</span>
              <input type="password" id="login-password" class="auth-input"
                placeholder="••••••••"
                autocomplete="current-password" required/>
              <button type="button" class="toggle-password" data-target="login-password">👁️</button>
            </div>
          </div>

          <div class="auth-row">
            <label class="auth-checkbox-label">
              <input type="checkbox" id="remember-me" checked/>
              <span>Se souvenir de moi</span>
            </label>
            <button type="button" class="auth-link" id="forgot-password-btn">
              Mot de passe oublié ?
            </button>
          </div>

          <div id="login-error" class="auth-error hidden"></div>

          <button type="submit" class="btn-auth" id="btn-login">
            <span class="btn-text">Se connecter</span>
            <span class="btn-spinner hidden">⏳</span>
          </button>

          <div class="auth-divider"><span>ou continuer sans compte</span></div>

          <button type="button" class="btn-auth-ghost" id="btn-local-mode">
            Utiliser en mode local
          </button>

        </form>

        <!-- INSCRIPTION -->
        <form id="form-register" class="auth-form hidden" autocomplete="on">

          <div class="auth-row-2">
            <div class="form-group">
              <label class="auth-label">Prénom</label>
              <input type="text" id="reg-firstname" class="auth-input"
                placeholder="Jean" autocomplete="given-name" required/>
            </div>
            <div class="form-group">
              <label class="auth-label">Nom</label>
              <input type="text" id="reg-lastname" class="auth-input"
                placeholder="Dupont" autocomplete="family-name" required/>
            </div>
          </div>

          <div class="form-group">
            <label class="auth-label">Nom d'utilisateur</label>
            <div class="input-icon-wrapper">
              <span class="input-icon">@</span>
              <input type="text" id="reg-username" class="auth-input"
                placeholder="jean_dupont"
                autocomplete="username"
                pattern="[a-zA-Z0-9_]{3,20}" required/>
            </div>
            <span class="input-hint">3-20 caractères, lettres, chiffres et _ uniquement</span>
            <span class="username-status" id="username-status"></span>
          </div>

          <div class="form-group">
            <label class="auth-label">Email</label>
            <div class="input-icon-wrapper">
              <span class="input-icon">✉️</span>
              <input type="email" id="reg-email" class="auth-input"
                placeholder="jean@exemple.com"
                autocomplete="email" required/>
            </div>
          </div>

          <div class="form-group">
            <label class="auth-label">Mot de passe</label>
            <div class="input-icon-wrapper">
              <span class="input-icon">🔒</span>
              <input type="password" id="reg-password" class="auth-input"
                placeholder="Minimum 8 caractères"
                autocomplete="new-password" required/>
              <button type="button" class="toggle-password" data-target="reg-password">👁️</button>
            </div>
            <div class="password-strength">
              <div class="strength-bar">
                <div class="strength-fill" id="strength-fill"></div>
              </div>
              <span class="strength-label" id="strength-label">Entrez un mot de passe</span>
            </div>
            <div class="password-rules" id="password-rules">
              <span class="rule" data-rule="length">✗ Minimum 8 caractères</span>
              <span class="rule" data-rule="upper">✗ Une majuscule</span>
              <span class="rule" data-rule="number">✗ Un chiffre</span>
              <span class="rule" data-rule="special">✗ Un caractère spécial (!@#$...)</span>
            </div>
          </div>

          <div class="form-group">
            <label class="auth-label">Confirmer le mot de passe</label>
            <div class="input-icon-wrapper">
              <span class="input-icon">🔒</span>
              <input type="password" id="reg-password-confirm" class="auth-input"
                placeholder="••••••••"
                autocomplete="new-password" required/>
            </div>
            <span class="match-status" id="match-status"></span>
          </div>

          <div id="register-error" class="auth-error hidden"></div>

          <button type="submit" class="btn-auth" id="btn-register">
            <span class="btn-text">Créer mon compte</span>
            <span class="btn-spinner hidden">⏳</span>
          </button>

        </form>

        <!-- MOT DE PASSE OUBLIÉ -->
        <form id="form-forgot" class="auth-form hidden">
          <div>
            <button type="button" class="auth-link" id="back-to-login">← Retour</button>
          </div>
          <h3 class="auth-form-title">Réinitialiser le mot de passe</h3>
          <p class="auth-form-desc">Entrez votre email pour recevoir un lien de réinitialisation.</p>
          <div class="form-group">
            <div class="input-icon-wrapper">
              <span class="input-icon">✉️</span>
              <input type="email" id="forgot-email" class="auth-input"
                placeholder="ton@email.com" required/>
            </div>
          </div>
          <div id="forgot-error" class="auth-error hidden"></div>
          <div id="forgot-success" class="auth-success hidden"></div>
          <button type="submit" class="btn-auth" id="btn-forgot">
            <span class="btn-text">Envoyer le lien</span>
            <span class="btn-spinner hidden">⏳</span>
          </button>
        </form>

      </div>
    `;
  },

  /* ── BIND EVENTS ── */
  _bindEvents() {
    /* Onglets */
    document.querySelectorAll('.auth-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.getElementById(`form-${tab}`)?.classList.remove('hidden');
        document.getElementById(`form-${tab}`)?.classList.add('active');
      });
    });

    /* Toggle password visibility */
    document.querySelectorAll('.toggle-password').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.textContent = input.type === 'password' ? '👁️' : '🙈';
      });
    });

    /* Forgot password */
    document.getElementById('forgot-password-btn')?.addEventListener('click', () => {
      document.querySelectorAll('.auth-form').forEach(f => { f.classList.add('hidden'); f.classList.remove('active'); });
      document.getElementById('form-forgot')?.classList.remove('hidden');
    });
    document.getElementById('back-to-login')?.addEventListener('click', () => {
      document.querySelectorAll('.auth-form').forEach(f => { f.classList.add('hidden'); f.classList.remove('active'); });
      document.getElementById('form-login')?.classList.remove('hidden');
      document.getElementById('form-login')?.classList.add('active');
    });

    /* Password strength */
    document.getElementById('reg-password')?.addEventListener('input', e => {
      this._updatePasswordStrength(e.target.value);
    });

    /* Password confirm */
    document.getElementById('reg-password-confirm')?.addEventListener('input', e => {
      const pwd = document.getElementById('reg-password')?.value;
      const ms = document.getElementById('match-status');
      if (!ms) return;
      if (!e.target.value) { ms.textContent = ''; return; }
      ms.textContent = pwd === e.target.value ? '✓ Les mots de passe correspondent' : '✗ Les mots de passe ne correspondent pas';
      ms.style.color = pwd === e.target.value ? 'var(--accent-green)' : 'var(--accent-red)';
    });

    /* Username check */
    document.getElementById('reg-username')?.addEventListener('input', e => {
      clearTimeout(this.usernameCheckTimer);
      const val = e.target.value.trim();
      const statusEl = document.getElementById('username-status');
      if (!statusEl) return;
      if (!Security.validateUsername(val)) {
        statusEl.textContent = val.length > 0 ? '✗ Format invalide' : '';
        statusEl.style.color = 'var(--accent-red)';
        return;
      }
      statusEl.textContent = '⏳ Vérification...';
      statusEl.style.color = 'var(--text-muted)';
      this.usernameCheckTimer = setTimeout(() => this._checkUsername(val, statusEl), 600);
    });

    /* Forms */
    document.getElementById('form-login')?.addEventListener('submit', e => { e.preventDefault(); this._login(); });
    document.getElementById('form-register')?.addEventListener('submit', e => { e.preventDefault(); this._register(); });
    document.getElementById('form-forgot')?.addEventListener('submit', e => { e.preventDefault(); this._forgotPassword(); });

    /* Local mode */
    document.getElementById('btn-local-mode')?.addEventListener('click', () => this._useLocalMode());

    /* Génère quelques particules SVG de fond */
    this._renderParticles();
  },

  /* ── VÉRIFICATION USERNAME ── */
  async _checkUsername(username, statusEl) {
    const reserved = ['admin', 'nexus', 'root', 'system', 'null', 'user', 'test'];
    if (reserved.includes(username.toLowerCase())) {
      statusEl.textContent = '✗ Nom réservé';
      statusEl.style.color = 'var(--accent-red)';
      return;
    }
    if (!window.firebaseDb || !window.fbFunctions) {
      statusEl.textContent = '✓ Disponible (mode local)';
      statusEl.style.color = 'var(--accent-green)';
      return;
    }
    try {
      const { getDoc, doc } = window.fbFunctions;
      const snap = await getDoc(doc(window.firebaseDb, 'usernames', username.toLowerCase()));
      if (snap.exists()) {
        statusEl.textContent = '✗ Déjà pris';
        statusEl.style.color = 'var(--accent-red)';
      } else {
        statusEl.textContent = '✓ Disponible';
        statusEl.style.color = 'var(--accent-green)';
      }
    } catch {
      statusEl.textContent = '⚠️ Impossible de vérifier';
      statusEl.style.color = 'var(--accent-orange)';
    }
  },

  /* ── CONNEXION ── */
  async _login() {
    const identifier = document.getElementById('login-identifier')?.value?.trim();
    const password   = document.getElementById('login-password')?.value;
    const errEl      = document.getElementById('login-error');
    const btn        = document.getElementById('btn-login');
    if (!identifier || !password) return this._showError(errEl, 'Remplis tous les champs');

    try {
      Security.checkRateLimit(identifier);
    } catch(e) {
      return this._showError(errEl, e.message);
    }

    this._setLoading(btn, true);
    this._hideError(errEl);

    try {
      let email = identifier;

      /* Connexion par username → cherche l'email */
      if (!identifier.includes('@') && window.firebaseDb && window.fbFunctions) {
        const { getDoc, doc } = window.fbFunctions;
        const usernameDoc = await getDoc(
          doc(window.firebaseDb, 'usernames', identifier.toLowerCase())
        );
        if (!usernameDoc.exists()) {
          this._setLoading(btn, false);
          return this._showError(errEl, 'Nom d\'utilisateur introuvable');
        }
        const uid = usernameDoc.data().uid;
        const profileDoc = await getDoc(
          doc(window.firebaseDb, 'users', uid, 'profile')
        );
        email = profileDoc.data()?.email || identifier;
      }

      if (window.firebaseAuth && window.fbFunctions?.signInWithEmailAndPassword) {
        const cred = await window.fbFunctions.signInWithEmailAndPassword(
          window.firebaseAuth, email, password
        );
        Security.resetRateLimit(identifier);
        await this._onLoginSuccess(cred.user);
      } else {
        /* Fallback local (pas de Firebase) */
        this._useLocalMode();
      }
    } catch(e) {
      this._setLoading(btn, false);
      this._showError(errEl, this._translateFirebaseError(e.code));
    }
  },

  /* ── INSCRIPTION ── */
  async _register() {
    const firstname = document.getElementById('reg-firstname')?.value?.trim();
    const lastname  = document.getElementById('reg-lastname')?.value?.trim();
    const username  = document.getElementById('reg-username')?.value?.trim();
    const email     = document.getElementById('reg-email')?.value?.trim();
    const password  = document.getElementById('reg-password')?.value;
    const confirm   = document.getElementById('reg-password-confirm')?.value;
    const errEl     = document.getElementById('register-error');
    const btn       = document.getElementById('btn-register');

    if (!firstname || !lastname || !username || !email || !password) {
      return this._showError(errEl, 'Remplis tous les champs');
    }
    if (!Security.validateUsername(username)) {
      return this._showError(errEl, 'Nom d\'utilisateur invalide (3-20 chars, lettres/chiffres/_)');
    }
    const pwdCheck = Security.validatePassword(password);
    if (!pwdCheck.valid) {
      return this._showError(errEl, 'Mot de passe trop faible (min 3 critères requis)');
    }
    if (password !== confirm) {
      return this._showError(errEl, 'Les mots de passe ne correspondent pas');
    }

    this._setLoading(btn, true);
    this._hideError(errEl);

    try {
      if (window.firebaseAuth && window.fbFunctions?.createUserWithEmailAndPassword) {
        const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification,
                setDoc, doc, serverTimestamp } = window.fbFunctions;
        const db = window.firebaseDb;

        /* Vérifie username */
        const usernameAvailable = await this._isUsernameAvailable(username);
        if (!usernameAvailable) {
          this._setLoading(btn, false);
          return this._showError(errEl, 'Ce nom d\'utilisateur est déjà pris');
        }

        const cred = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
        const user = cred.user;

        await updateProfile(user, { displayName: username });
        await sendEmailVerification(user);

        /* Crée le profil Firestore */
        await setDoc(doc(db, 'users', user.uid, 'profile'), {
          username: username.toLowerCase(),
          displayName: username,
          firstName: firstname,
          lastName: lastname,
          email,
          avatar: null,
          createdAt: serverTimestamp(),
          lastSeen: serverTimestamp(),
        });

        /* Réserve le username */
        await setDoc(doc(db, 'usernames', username.toLowerCase()), {
          uid: user.uid,
          createdAt: serverTimestamp(),
        });

        Toast.success(`Compte créé ! Un email de vérification a été envoyé à ${email}`);
        await this._onLoginSuccess(user, { firstName: firstname, lastName: lastname, username });
      } else {
        /* Fallback local */
        AppState.user.name = firstname;
        AppState.user.email = email;
        Store.set('user', AppState.user);
        this._useLocalMode();
      }
    } catch(e) {
      this._setLoading(btn, false);
      this._showError(errEl, this._translateFirebaseError(e.code));
    }
  },

  async _isUsernameAvailable(username) {
    if (!window.firebaseDb || !window.fbFunctions) return true;
    try {
      const { getDoc, doc } = window.fbFunctions;
      const snap = await getDoc(doc(window.firebaseDb, 'usernames', username.toLowerCase()));
      return !snap.exists();
    } catch { return true; }
  },

  /* ── MOT DE PASSE OUBLIÉ ── */
  async _forgotPassword() {
    const email   = document.getElementById('forgot-email')?.value?.trim();
    const errEl   = document.getElementById('forgot-error');
    const succEl  = document.getElementById('forgot-success');
    const btn     = document.getElementById('btn-forgot');
    if (!email) return this._showError(errEl, 'Entrez votre email');

    this._setLoading(btn, true);
    this._hideError(errEl);

    try {
      if (window.firebaseAuth && window.fbFunctions?.sendPasswordResetEmail) {
        await window.fbFunctions.sendPasswordResetEmail(window.firebaseAuth, email);
        succEl.textContent = '✓ Email envoyé ! Vérifiez votre boîte.';
        succEl.classList.remove('hidden');
      } else {
        this._showError(errEl, 'Firebase non configuré');
      }
    } catch(e) {
      this._showError(errEl, this._translateFirebaseError(e.code));
    }
    this._setLoading(btn, false);
  },

  /* ── MODE LOCAL ── */
  _useLocalMode() {
    this.localMode = true;
    Store.set('auth_local_mode', true);
    this.hide();
    Bus.emit('appReady', {});
    Toast.info('Mode local activé — données sauvées uniquement sur cet appareil');
  },

  /* ── POST-LOGIN ── */
  async _onLoginSuccess(user, extras = null) {
    const profile = extras || {};
    AppState.user.name     = extras?.firstName || user.displayName || user.email?.split('@')[0] || 'Utilisateur';
    AppState.user.email    = user.email;
    AppState.user.uid      = user.uid;
    AppState.user.username = extras?.username || user.displayName;
    Store.set('user', AppState.user);
    Store.set('auth_uid', user.uid);
    Store.remove('auth_local_mode');

    this.hide();

    /* Init sync Firestore */
    if (window.Sync) {
      await Sync.init(user.uid);
    }

    Bus.emit('appReady', {});
    Security.initInactivityDetection();

    const name = AppState.user.name;
    const h = new Date().getHours();
    const greet = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
    Toast.success(`${greet}, ${name} ! 👋`);
  },

  /* ── HELPERS UI ── */
  _showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    el.closest('form')?.classList.add('shake');
    setTimeout(() => el.closest('form')?.classList.remove('shake'), 500);
  },
  _hideError(el) { el?.classList.add('hidden'); },
  _setLoading(btn, loading) {
    if (!btn) return;
    btn.querySelector('.btn-text')?.classList.toggle('hidden', loading);
    btn.querySelector('.btn-spinner')?.classList.toggle('hidden', !loading);
    btn.disabled = loading;
  },

  _updatePasswordStrength(password) {
    const strength = Security.getPasswordStrength(password);
    const fill  = document.getElementById('strength-fill');
    const label = document.getElementById('strength-label');
    if (fill) {
      fill.style.width = (strength.level / 4 * 100) + '%';
      fill.style.background = strength.color;
      fill.style.transition = 'width 0.3s, background 0.3s';
    }
    if (label) { label.textContent = strength.label; label.style.color = strength.color; }

    const { rules } = Security.validatePassword(password);
    document.querySelectorAll('.password-rules .rule').forEach(r => {
      const passed = rules[r.dataset.rule];
      r.textContent = (passed ? '✓ ' : '✗ ') + r.textContent.slice(2);
      r.style.color = passed ? 'var(--accent-green)' : 'var(--text-muted)';
    });
  },

  _translateFirebaseError(code) {
    const map = {
      'auth/user-not-found':         'Aucun compte avec cet email',
      'auth/wrong-password':         'Mot de passe incorrect',
      'auth/email-already-in-use':   'Cet email est déjà utilisé',
      'auth/weak-password':          'Mot de passe trop faible (min 6 chars)',
      'auth/invalid-email':          'Email invalide',
      'auth/too-many-requests':      'Trop de tentatives. Réessayez plus tard.',
      'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion.',
      'auth/user-disabled':          'Ce compte a été désactivé.',
      'auth/invalid-credential':     'Identifiants incorrects',
    };
    return map[code] || 'Erreur : ' + (code || 'inconnue');
  },

  /* ── PARTICULES SVG FOND ── */
  _renderParticles() {
    const container = document.getElementById('auth-particles');
    if (!container) return;
    const count = 18;
    let svg = `<svg width="100%" height="100%" style="position:absolute;inset:0" xmlns="http://www.w3.org/2000/svg">`;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const r = Math.random() * 2 + 0.5;
      const op = Math.random() * 0.4 + 0.1;
      const dur = Math.random() * 4 + 3;
      svg += `<circle cx="${x}%" cy="${y}%" r="${r}" fill="rgba(124,58,237,${op})">
        <animate attributeName="opacity" values="${op};${op*0.3};${op}" dur="${dur}s" repeatCount="indefinite"/>
        <animate attributeName="cy" values="${y}%;${y - 2}%;${y}%" dur="${dur * 1.3}s" repeatCount="indefinite"/>
      </circle>`;
    }
    svg += `</svg>`;
    container.innerHTML = svg;
  },

  /* ── INIT (vérifie si déjà auth) ── */
  async initCheck() {
    /* Mode local persisté */
    if (Store.get('auth_local_mode')) {
      this.localMode = true;
      return true;
    }

    /* Vérifie auth Firebase */
    if (window.firebaseAuth && window.fbFunctions?.onAuthStateChanged) {
      return new Promise(resolve => {
        const unsubscribe = window.fbFunctions.onAuthStateChanged(window.firebaseAuth, async user => {
          unsubscribe();
          if (user) {
            AppState.user.name     = user.displayName || user.email?.split('@')[0] || 'Utilisateur';
            AppState.user.email    = user.email;
            AppState.user.uid      = user.uid;
            AppState.user.username = user.displayName;
            Store.set('user', AppState.user);
            if (window.Sync) Sync.init(user.uid).catch(console.warn);
            Security.initInactivityDetection();
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
    }

    /* Pas de Firebase configuré → mode local auto */
    this.localMode = true;
    return true;
  },
};

/* ── CSS AUTH (injecté dynamiquement) ── */
(function injectAuthCSS() {
  if (document.getElementById('auth-styles')) return;
  const style = document.createElement('style');
  style.id = 'auth-styles';
  style.textContent = `
    #auth-screen {
      position: fixed; inset: 0; z-index: 2000;
      display: flex; align-items: center; justify-content: center;
      background: var(--bg-primary);
      padding: 16px;
    }
    #auth-screen.hidden { display: none; }

    .auth-bg {
      position: absolute; inset: 0; overflow: hidden; pointer-events: none;
    }
    .auth-glow-1 {
      position: absolute; width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%);
      top: -200px; left: -200px; border-radius: 50%;
      animation: float-glow 8s ease-in-out infinite;
    }
    .auth-glow-2 {
      position: absolute; width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%);
      bottom: -100px; right: -100px; border-radius: 50%;
      animation: float-glow 10s ease-in-out infinite reverse;
    }
    @keyframes float-glow {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(30px, -30px); }
    }
    .auth-particles { position: absolute; inset: 0; }

    .auth-card {
      position: relative; z-index: 1;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 40px 36px;
      width: 100%; max-width: 440px;
      box-shadow: var(--shadow-lg), 0 0 60px rgba(124,58,237,0.1);
      max-height: 92vh; overflow-y: auto;
    }

    .auth-logo {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 6px;
    }
    .auth-logo-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: var(--grad-primary);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Fraunces', serif; font-size: 1.4rem; font-weight: 900; color: #fff;
      box-shadow: 0 0 20px rgba(124,58,237,0.4);
    }
    .auth-logo span {
      font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700;
      background: var(--grad-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .auth-tagline { color: var(--text-muted); font-size: 0.875rem; margin-bottom: 28px; }

    .auth-tabs {
      display: flex; background: var(--bg-secondary);
      border-radius: var(--radius-md); padding: 4px; gap: 4px; margin-bottom: 24px;
    }
    .auth-tab {
      flex: 1; padding: 9px; border-radius: var(--radius-sm); border: none;
      background: transparent; color: var(--text-secondary); cursor: pointer;
      font-size: 0.875rem; font-weight: 500; transition: all 0.2s;
      min-height: 40px; touch-action: manipulation;
    }
    .auth-tab.active { background: var(--accent-purple); color: #fff; box-shadow: 0 0 12px rgba(124,58,237,0.4); }

    .auth-form { display: flex; flex-direction: column; gap: 16px; }
    .auth-form.hidden { display: none; }
    .auth-label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
    .auth-input {
      width: 100%; background: var(--bg-tertiary); border: 1px solid var(--border);
      border-radius: var(--radius-sm); color: var(--text-primary);
      font-size: 16px !important; padding: 11px 12px 11px 40px;
      transition: border-color 0.2s; outline: none; box-sizing: border-box;
      min-height: 44px; -webkit-appearance: none; appearance: none;
    }
    .auth-input:focus { border-color: var(--accent-purple); box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
    .input-icon-wrapper { position: relative; }
    .input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 1rem; pointer-events: none; }
    .toggle-password {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; font-size: 1rem;
      padding: 4px; min-height: 32px; min-width: 32px; touch-action: manipulation;
    }
    .auth-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
    .auth-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .auth-checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; color: var(--text-secondary); }
    .auth-link { background: none; border: none; color: var(--accent-purple-light); cursor: pointer; font-size: 0.85rem; padding: 4px; touch-action: manipulation; }
    .auth-link:hover { text-decoration: underline; }

    .password-strength { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
    .strength-bar { flex: 1; height: 4px; background: var(--bg-tertiary); border-radius: 2px; overflow: hidden; }
    .strength-fill { height: 100%; width: 0; border-radius: 2px; }
    .strength-label { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; }
    .password-rules { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 6px; }
    .rule { font-size: 0.72rem; color: var(--text-muted); }
    .input-hint { font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; display: block; }
    .username-status, .match-status { font-size: 0.75rem; margin-top: 4px; display: block; font-weight: 500; }

    .btn-auth {
      width: 100%; padding: 13px; border-radius: var(--radius-md); border: none;
      background: var(--grad-primary); color: #fff; font-weight: 700; font-size: 1rem;
      cursor: pointer; transition: all 0.2s; min-height: 48px; touch-action: manipulation;
      box-shadow: 0 0 20px rgba(124,58,237,0.3); position: relative;
    }
    .btn-auth:hover { transform: translateY(-1px); box-shadow: 0 0 30px rgba(124,58,237,0.5); }
    .btn-auth:active { transform: scale(0.98); }
    .btn-auth:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .btn-auth-ghost {
      width: 100%; padding: 12px; border-radius: var(--radius-md);
      border: 1px solid var(--border); background: transparent;
      color: var(--text-secondary); font-weight: 500; cursor: pointer;
      min-height: 44px; touch-action: manipulation; transition: all 0.2s;
    }
    .btn-auth-ghost:hover { border-color: var(--border-hover); color: var(--text-primary); }

    .auth-divider { display: flex; align-items: center; gap: 12px; color: var(--text-muted); font-size: 0.8rem; }
    .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }

    .auth-error {
      background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
      color: var(--accent-red); border-radius: var(--radius-sm); padding: 10px 14px;
      font-size: 0.85rem; font-weight: 500;
    }
    .auth-error.hidden { display: none; }
    .auth-success {
      background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);
      color: var(--accent-green); border-radius: var(--radius-sm); padding: 10px 14px;
      font-size: 0.85rem; font-weight: 500;
    }
    .auth-success.hidden { display: none; }
    .auth-form-title { font-family:'Fraunces',serif; font-size:1.1rem; font-weight:700; margin-bottom:4px; }
    .auth-form-desc { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px; }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-8px); }
      75% { transform: translateX(8px); }
    }
    .shake { animation: shake 0.4s ease; }

    @media (max-width: 480px) {
      .auth-card { padding: 28px 20px; }
      .auth-row-2 { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
})();
