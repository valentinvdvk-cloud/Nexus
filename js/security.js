/* ═══════════════════════════════════════════════════════════
   NEXUS APP — security.js
   Rate limiting · Password validation · Session security
═══════════════════════════════════════════════════════════ */

const Security = {

  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  INACTIVITY_LIMIT: 30 * 60 * 1000, // 30 minutes
  inactivityTimer: null,

  /* ── RATE LIMITING (anti brute-force) ── */
  checkRateLimit(identifier) {
    const now = Date.now();
    const key = `nexus_attempts_${identifier}`;
    const attempts = JSON.parse(localStorage.getItem(key) || '{"count":0,"time":0}');

    if (now - attempts.time > this.LOCKOUT_DURATION) {
      attempts.count = 0;
    }

    if (attempts.count >= this.MAX_ATTEMPTS) {
      const remaining = Math.ceil((this.LOCKOUT_DURATION - (now - attempts.time)) / 60000);
      throw new Error(`Trop de tentatives. Réessayez dans ${remaining} minutes.`);
    }

    attempts.count++;
    attempts.time = now;
    localStorage.setItem(key, JSON.stringify(attempts));
  },

  resetRateLimit(identifier) {
    localStorage.removeItem(`nexus_attempts_${identifier}`);
  },

  /* ── VALIDATION MOT DE PASSE ── */
  validatePassword(password) {
    const rules = {
      length:  password.length >= 8,
      upper:   /[A-Z]/.test(password),
      number:  /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`]/.test(password),
    };
    const score = Object.values(rules).filter(Boolean).length;
    return { rules, score, valid: score >= 3 };
  },

  getPasswordStrength(password) {
    const { score } = this.validatePassword(password);
    if (!password) return { level: 0, label: 'Entrez un mot de passe', color: 'var(--text-muted)' };
    if (password.length < 4) return { level: 1, label: 'Trop court', color: 'var(--accent-red)' };
    if (score <= 1) return { level: 1, label: 'Faible', color: 'var(--accent-red)' };
    if (score === 2) return { level: 2, label: 'Moyen', color: 'var(--accent-orange)' };
    if (score === 3) return { level: 3, label: 'Fort', color: 'var(--accent-green)' };
    return { level: 4, label: 'Très fort', color: 'var(--accent-cyan)' };
  },

  /* ── VALIDATION USERNAME ── */
  validateUsername(username) {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
  },

  /* ── SANITIZE INPUT (anti-XSS) ── */
  sanitize(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  },

  /* ── SESSION CHECK ── */
  checkSession() {
    return !!(window.firebaseAuth?.currentUser);
  },

  /* ── INACTIVITY TIMER ── */
  resetInactivityTimer() {
    clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => {
      if (!window.firebaseAuth?.currentUser) return;
      Toast.warning('Session expirée — reconnectez-vous');
      setTimeout(() => {
        window.fbFunctions?.signOut(window.firebaseAuth).catch(() => {});
        Auth.show();
      }, 2000);
    }, this.INACTIVITY_LIMIT);
  },

  initInactivityDetection() {
    ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(ev => {
      document.addEventListener(ev, () => this.resetInactivityTimer(), { passive: true });
    });
    this.resetInactivityTimer();
  },

  /* ── ENCODE/DECODE données sensibles localStorage ── */
  encodeData(data) {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(data)))); }
    catch { return null; }
  },
  decodeData(encoded) {
    try { return JSON.parse(decodeURIComponent(escape(atob(encoded)))); }
    catch { return null; }
  },
};
