/* ═══════════════════════════════════════════════════════════
   NEXUS APP — app.js
   Router · localStorage · State · Init
═══════════════════════════════════════════════════════════ */

/* ── STORAGE ── */
const Store = {
  prefix: 'nexus_',
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(this.prefix + key, JSON.stringify(val)); return true; }
    catch { return false; }
  },
  remove(key) { localStorage.removeItem(this.prefix + key); },
  keys() {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix))
      .map(k => k.slice(this.prefix.length));
  },
  clear() { this.keys().forEach(k => this.remove(k)); },
};

/* ── ID GENERATOR ── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ── DATE HELPERS ── */
const DateUtils = {
  today() { return new Date().toISOString().slice(0, 10); },
  now() { return new Date().toISOString(); },
  format(iso, opts = {}) {
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', ...opts });
  },
  formatTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  },
  relative(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'à l\'instant';
    if (m < 60) return `il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `il y a ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `il y a ${d}j`;
    return DateUtils.format(iso);
  },
  weekNum(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  },
  startOfWeek(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().slice(0, 10);
  },
};

/* ── EVENT BUS ── */
const Bus = {
  _listeners: {},
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  },
  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  },
  emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  },
};

/* ── ROUTER ── */
const Router = {
  current: 'dashboard',
  modules: ['dashboard', 'musculation', 'stockage', 'agenda', 'nutrition', 'finances', 'notes', 'pomodoro', 'meteo', 'contacts', 'stats'],
  moduleLabels: {
    dashboard: 'Dashboard', musculation: 'Musculation', stockage: 'Stockage',
    agenda: 'Agenda', nutrition: 'Nutrition', finances: 'Finances',
    notes: 'Notes', pomodoro: 'Pomodoro', meteo: 'Météo',
    contacts: 'Contacts', stats: 'Statistiques',
  },
  moduleIcons: {
    dashboard: 'dashboard', musculation: 'musculation', stockage: 'stockage',
    agenda: 'agenda', nutrition: 'nutrition', finances: 'finances',
    notes: 'notes', pomodoro: 'pomodoro', meteo: 'meteo',
    contacts: 'contacts', stats: 'stats',
  },
  navigate(module) {
    if (!this.modules.includes(module)) return;
    const prev = this.current;
    this.current = module;
    Store.set('lastModule', module);
    this._updateNav();
    this._updateContent(prev);
    Bus.emit('navigate', { module, prev });
  },
  _updateNav() {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === this.current);
    });
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = this.moduleLabels[this.current] || '';
    // Sync bottom nav + topbar module label
    if (typeof updateBottomNav === 'function') updateBottomNav(this.current);
  },
  _updateContent(prev) {
    document.querySelectorAll('.module-pane').forEach(pane => {
      const isActive = pane.dataset.module === this.current;
      if (isActive) {
        pane.classList.remove('hidden');
        pane.classList.add('anim-fade-up');
        setTimeout(() => pane.classList.remove('anim-fade-up'), 400);
      } else {
        pane.classList.add('hidden');
      }
    });
    Bus.emit('moduleActivated', { module: this.current });
  },
  init() {
    const saved = Store.get('lastModule', 'dashboard');
    this.current = saved;
    this._updateNav();
    document.querySelectorAll('.module-pane').forEach(pane => {
      pane.classList.toggle('hidden', pane.dataset.module !== this.current);
    });
  },
};

/* ── APP STATE ── */
const AppState = {
  theme: 'dark',
  sidebarCollapsed: false,
  onboarded: false,
  user: { name: 'Valentin', avatar: null },

  load() {
    this.theme = Store.get('theme', 'dark');
    this.sidebarCollapsed = Store.get('sidebarCollapsed', false);
    this.onboarded = Store.get('onboarded', false);
    this.user = Store.get('user', { name: 'Valentin', avatar: null });
  },
  save() {
    Store.set('theme', this.theme);
    Store.set('sidebarCollapsed', this.sidebarCollapsed);
    Store.set('onboarded', this.onboarded);
    Store.set('user', this.user);
  },
  setTheme(t) {
    this.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    Store.set('theme', t);
    Bus.emit('themeChanged', t);
  },
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('sidebar-collapsed', this.sidebarCollapsed);
    Store.set('sidebarCollapsed', this.sidebarCollapsed);
    Bus.emit('sidebarToggled', this.sidebarCollapsed);
  },
};

/* ── TOAST NOTIFICATIONS ── */
const Toast = {
  container: null,
  _ensure() {
    if (!this.container) {
      this.container = document.getElementById('toast-container');
    }
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(msg, type = 'info', duration = 3500) {
    this._ensure();
    const t = document.createElement('div');
    t.className = `toast toast-${type} anim-fade-up`;
    const iconMap = { success: 'checkCircle', error: 'xCircle', warning: 'alertTriangle', info: 'info' };
    t.innerHTML = `
      <span class="toast-icon">${Icons[iconMap[type]] || Icons.info}</span>
      <span class="toast-msg">${msg}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">${Icons.close}</button>
    `;
    this.container.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(100%)';
      t.style.transition = 'all 0.3s ease';
      setTimeout(() => t.remove(), 300);
    }, duration);
    return t;
  },
  success(msg, d) { return this.show(msg, 'success', d); },
  error(msg, d) { return this.show(msg, 'error', d); },
  warning(msg, d) { return this.show(msg, 'warning', d); },
  info(msg, d) { return this.show(msg, 'info', d); },
};

/* ── MODAL HELPERS ── */
const Modal = {
  open(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('hidden');
    m.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    m.querySelector('[data-focus]')?.focus();
  },
  close(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('modal-open');
    m.classList.add('hidden');
    document.body.style.overflow = '';
  },
  closeAll() {
    document.querySelectorAll('.modal.modal-open').forEach(m => {
      m.classList.remove('modal-open');
      m.classList.add('hidden');
    });
    document.body.style.overflow = '';
  },
  init() {
    document.addEventListener('click', e => {
      if (e.target.classList.contains('modal')) this.closeAll();
      if (e.target.dataset.closeModal) this.close(e.target.dataset.closeModal);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.closeAll();
    });
  },
};

/* ── BOTTOM SHEET ── */
const Sheet = {
  open(id) {
    const s = document.getElementById(id);
    if (!s) return;
    s.classList.remove('hidden');
    requestAnimationFrame(() => s.classList.add('sheet-open'));
    document.body.style.overflow = 'hidden';
  },
  close(id) {
    const s = document.getElementById(id);
    if (!s) return;
    s.classList.remove('sheet-open');
    setTimeout(() => { s.classList.add('hidden'); document.body.style.overflow = ''; }, 300);
  },
};

/* ── RIPPLE ── */
function addRipple(el) {
  el.classList.add('ripple-wrap');
  el.addEventListener('click', e => {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

/* ── LOADING BAR ── */
const LoadingBar = {
  el: null,
  timer: null,
  init() { this.el = document.getElementById('loading-bar'); },
  start() {
    if (!this.el) return;
    this.el.className = 'active';
    clearTimeout(this.timer);
  },
  done() {
    if (!this.el) return;
    this.el.className = 'done';
    this.timer = setTimeout(() => { this.el.className = ''; }, 700);
  },
};

/* ── GLOBAL SEARCH ── */
const Search = {
  _open: false,
  open() {
    const m = document.getElementById('search-modal');
    if (m) { m.classList.remove('hidden'); m.querySelector('#search-input')?.focus(); }
    this._open = true;
  },
  close() {
    const m = document.getElementById('search-modal');
    if (m) m.classList.add('hidden');
    this._open = false;
  },
  toggle() { this._open ? this.close() : this.open(); },
  query(q) {
    if (!q.trim()) return [];
    const results = [];
    const ql = q.toLowerCase();

    /* Notes */
    const notes = Store.get('notes', []);
    notes.filter(n => n.title?.toLowerCase().includes(ql) || n.content?.toLowerCase().includes(ql))
      .forEach(n => results.push({ type: 'Note', title: n.title || 'Sans titre', icon: 'notes', action: () => { Router.navigate('notes'); Bus.emit('openNote', n.id); } }));

    /* Contacts */
    const contacts = Store.get('contacts', []);
    contacts.filter(c => (c.name + ' ' + (c.email || '')).toLowerCase().includes(ql))
      .forEach(c => results.push({ type: 'Contact', title: c.name, icon: 'contacts', action: () => { Router.navigate('contacts'); Bus.emit('openContact', c.id); } }));

    /* Agenda */
    const events = Store.get('agenda_events', []);
    events.filter(ev => ev.title?.toLowerCase().includes(ql))
      .forEach(ev => results.push({ type: 'Événement', title: ev.title, icon: 'agenda', action: () => Router.navigate('agenda') }));

    /* Modules */
    Router.modules.filter(m => Router.moduleLabels[m].toLowerCase().includes(ql))
      .forEach(m => results.push({ type: 'Module', title: Router.moduleLabels[m], icon: Router.moduleIcons[m], action: () => Router.navigate(m) }));

    return results.slice(0, 12);
  },
};

/* ── NOTIFICATIONS STORE ── */
const Notifications = {
  list: [],
  load() { this.list = Store.get('notifications', []); },
  add(msg, type = 'info') {
    const n = { id: uid(), msg, type, read: false, createdAt: DateUtils.now() };
    this.list.unshift(n);
    if (this.list.length > 50) this.list = this.list.slice(0, 50);
    Store.set('notifications', this.list);
    Bus.emit('notifAdded', n);
    this._updateBadge();
  },
  markRead(id) {
    const n = this.list.find(n => n.id === id);
    if (n) { n.read = true; Store.set('notifications', this.list); this._updateBadge(); }
  },
  markAllRead() {
    this.list.forEach(n => n.read = true);
    Store.set('notifications', this.list);
    this._updateBadge();
  },
  unread() { return this.list.filter(n => !n.read).length; },
  _updateBadge() {
    const badge = document.getElementById('notif-badge');
    const count = this.unread();
    if (badge) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  },
};

/* ── KEYBOARD SHORTCUTS ── */
const Shortcuts = {
  init() {
    document.addEventListener('keydown', e => {
      const tag = document.activeElement?.tagName;
      const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) ||
        document.activeElement?.contentEditable === 'true';

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); Search.toggle(); return;
      }
      if (e.key === 'Escape') { Search.close(); Modal.closeAll(); return; }
      if (editing) return;

      const keyMap = { '1': 'dashboard', '2': 'musculation', '3': 'stockage', '4': 'agenda', '5': 'nutrition', '6': 'finances', '7': 'notes', '8': 'pomodoro', '9': 'meteo', '0': 'contacts' };
      if (keyMap[e.key] && !e.ctrlKey && !e.metaKey) { Router.navigate(keyMap[e.key]); return; }
      if (e.key === 'b' && !e.ctrlKey) { AppState.toggleSidebar(); return; }
      if (e.key === '?' && !e.ctrlKey) { Shortcuts.showModal(); return; }

      /* G + key navigation shortcuts */
      if (e.key === 'g' && !e.ctrlKey) {
        Shortcuts._gMode = true;
        setTimeout(() => { Shortcuts._gMode = false; }, 1000);
        return;
      }
      if (Shortcuts._gMode) {
        const gMap = { 'h': 'dashboard', 'm': 'musculation', 'a': 'agenda', 'f': 'finances', 'n': 'notes', 'p': 'pomodoro', 's': 'stats', 'c': 'contacts', 'w': 'meteo', 'u': 'nutrition', 'x': 'stockage' };
        if (gMap[e.key]) { Router.navigate(gMap[e.key]); Shortcuts._gMode = false; return; }
      }
    });
  },
  _gMode: false,
  showModal() {
    const existing = document.getElementById('shortcuts-modal');
    if (existing) { Modal.open('shortcuts-modal'); return; }
    const el = document.createElement('div');
    el.id = 'shortcuts-modal';
    el.className = 'modal hidden';
    el.innerHTML = `
      <div class="modal-box modal-md anim-scale-in">
        <div class="modal-header">
          <h3 class="modal-title">Raccourcis clavier</h3>
          <button class="btn-icon" data-close-modal="shortcuts-modal">${Icons.close}</button>
        </div>
        <div class="modal-body">
          <div class="shortcuts-grid">
            <div class="shortcut-section">
              <h4 class="shortcut-section-title">Navigation</h4>
              <div class="shortcut-row"><kbd>G</kbd><kbd>H</kbd><span>Dashboard</span></div>
              <div class="shortcut-row"><kbd>G</kbd><kbd>M</kbd><span>Musculation</span></div>
              <div class="shortcut-row"><kbd>G</kbd><kbd>A</kbd><span>Agenda</span></div>
              <div class="shortcut-row"><kbd>G</kbd><kbd>F</kbd><span>Finances</span></div>
              <div class="shortcut-row"><kbd>G</kbd><kbd>N</kbd><span>Notes</span></div>
              <div class="shortcut-row"><kbd>G</kbd><kbd>P</kbd><span>Pomodoro</span></div>
              <div class="shortcut-row"><kbd>G</kbd><kbd>C</kbd><span>Contacts</span></div>
              <div class="shortcut-row"><kbd>1</kbd>–<kbd>0</kbd><span>Modules 1-10</span></div>
            </div>
            <div class="shortcut-section">
              <h4 class="shortcut-section-title">Actions</h4>
              <div class="shortcut-row"><kbd>Ctrl</kbd><kbd>K</kbd><span>Recherche globale</span></div>
              <div class="shortcut-row"><kbd>Ctrl</kbd><kbd>N</kbd><span>Nouvelle note</span></div>
              <div class="shortcut-row"><kbd>Ctrl</kbd><kbd>S</kbd><span>Sauvegarder</span></div>
              <div class="shortcut-row"><kbd>B</kbd><span>Toggle sidebar</span></div>
              <div class="shortcut-row"><kbd>?</kbd><span>Cette fenêtre</span></div>
              <div class="shortcut-row"><kbd>ESC</kbd><span>Fermer modal</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    Modal.open('shortcuts-modal');
  },
};

/* ── MOTIVATIONAL QUOTES ── */
const QUOTES = [
  { text: "Le succès, c'est tomber sept fois et se relever huit.", author: "Proverbe japonais" },
  { text: "La discipline, c'est faire ce qui doit être fait, même si tu n'en as pas envie.", author: "Elbert Hubbard" },
  { text: "Ne compte pas les jours. Fais que les jours comptent.", author: "Muhammad Ali" },
  { text: "Les champions ne sont pas faits dans les salles de gym. Ils sont faits de quelque chose de profond en eux.", author: "Muhammad Ali" },
  { text: "Tu n'as pas à être génial pour démarrer, mais tu dois démarrer pour être génial.", author: "Zig Ziglar" },
  { text: "La douleur que tu ressens aujourd'hui sera la force que tu ressentiras demain.", author: "Arnold Schwarzenegger" },
  { text: "L'effort d'aujourd'hui est le succès de demain.", author: "Anonyme" },
  { text: "Commence là où tu es. Utilise ce que tu as. Fais ce que tu peux.", author: "Arthur Ashe" },
  { text: "Chaque jour est une nouvelle chance de changer ta vie.", author: "Anonyme" },
  { text: "Le seul mauvais entraînement est celui que tu n'as pas fait.", author: "Anonyme" },
  { text: "La motivation te fait démarrer. L'habitude te fait continuer.", author: "Jim Ryun" },
  { text: "Fixe tes objectifs assez hauts pour que tu ne puisses pas les atteindre avant de te transformer.", author: "Zig Ziglar" },
  { text: "Si tu veux quelque chose que tu n'as jamais eu, tu dois faire quelque chose que tu n'as jamais fait.", author: "Thomas Jefferson" },
  { text: "Le corps accomplit ce que l'esprit croit.", author: "Napoleon Hill" },
  { text: "Croire, c'est voir ce qui n'existe pas encore.", author: "Henri Bergson" },
  { text: "Chaque expert a été un débutant.", author: "Helen Hayes" },
  { text: "La persévérance est la mère du succès.", author: "Honoré de Balzac" },
  { text: "Fais-le ou ne le fais pas. Il n'y a pas d'essai.", author: "Yoda" },
  { text: "Les limites comme les peurs ne sont souvent qu'une illusion.", author: "Michael Jordan" },
  { text: "Certains veulent que ça arrive, d'autres souhaitent que ça arrive, d'autres le font arriver.", author: "Michael Jordan" },
  { text: "Le travail acharné bat le talent quand le talent ne travaille pas dur.", author: "Tim Notke" },
  { text: "La condition physique n'est pas une destination, c'est un mode de vie.", author: "Anonyme" },
  { text: "N'attendez pas. Le bon moment n'arrivera jamais.", author: "Napoleon Hill" },
  { text: "Ce qui ne me tue pas me rend plus fort.", author: "Friedrich Nietzsche" },
  { text: "Prends soin de ton corps, c'est le seul endroit où tu es obligé de vivre.", author: "Jim Rohn" },
  { text: "Tu es plus fort que tu ne le penses.", author: "Anonyme" },
  { text: "Chaque jour, en tout point, je vais de mieux en mieux.", author: "Émile Coué" },
  { text: "L'excellence n'est pas une destination mais un voyage continu.", author: "Brian Tracy" },
  { text: "Petit à petit, l'oiseau fait son nid.", author: "Proverbe français" },
  { text: "La différence entre impossible et possible réside dans la détermination.", author: "Tommy Lasorda" },
  { text: "Les difficultés renforcent l'esprit comme le travail renforce le corps.", author: "Sénèque" },
  { text: "Si tu veux être heureux, fixe un but qui commande tes pensées.", author: "Anatole France" },
  { text: "Le chemin se fait en marchant.", author: "Antonio Machado" },
  { text: "Garde tes yeux sur les étoiles, et tes pieds sur terre.", author: "Theodore Roosevelt" },
  { text: "Le succès n'est pas final, l'échec n'est pas fatal: c'est le courage de continuer qui compte.", author: "Winston Churchill" },
  { text: "Sois le changement que tu veux voir dans le monde.", author: "Mahatma Gandhi" },
  { text: "Agis comme si ce que tu fais fait une différence. Ça en fait une.", author: "William James" },
  { text: "Tu n'échoues que quand tu t'arrêtes d'essayer.", author: "Albert Einstein" },
  { text: "Le plus grand secret du succès est de commencer.", author: "Mark Twain" },
  { text: "La vie commence là où finit ta zone de confort.", author: "Neale Donald Walsch" },
  { text: "Il n'y a pas d'ascenseur pour le succès. Tu dois prendre les escaliers.", author: "Anonyme" },
  { text: "Les grandes choses ne sont jamais faites par une seule personne.", author: "Steve Jobs" },
  { text: "Mange correctement, dors bien, et cours vite.", author: "Usain Bolt" },
  { text: "L'athlète le plus fort est celui qui gagne la bataille mentale.", author: "Anonyme" },
  { text: "Chaque rep que tu fais compte. Chaque kilo que tu soulèves compte.", author: "Anonyme" },
  { text: "Tu peux avoir les résultats ou les excuses. Pas les deux.", author: "Arnold Schwarzenegger" },
  { text: "Le corps dit ce que les mots ne peuvent exprimer.", author: "Martha Graham" },
  { text: "Le vrai changement commence par un engagement ferme.", author: "Tony Robbins" },
  { text: "L'avenir appartient à ceux qui se lèvent tôt.", author: "Proverbe" },
  { text: "Investis en toi-même. C'est le meilleur investissement que tu puisses faire.", author: "Warren Buffett" },
  { text: "Sois obsédé ou sois ordinaire.", author: "Grant Cardone" },
];

function getDailyQuote() {
  const day = Math.floor(Date.now() / 86400000);
  return QUOTES[day % QUOTES.length];
}

/* ── ONBOARDING ── */
const Onboarding = {
  steps: [
    { target: '#sidebar', title: 'Bienvenue sur NEXUS', text: 'Ton assistant personnel tout-en-un. Navigation dans la barre latérale.', pos: 'right' },
    { target: '[data-nav="musculation"]', title: 'Musculation', text: 'Suis tes séances, exercices, volumes et progressions.', pos: 'right' },
    { target: '[data-nav="agenda"]', title: 'Agenda', text: 'Planifie tes événements avec vue calendrier et semaine.', pos: 'right' },
    { target: '[data-nav="notes"]', title: 'Notes', text: 'Éditeur riche avec catégories, markdown et export.', pos: 'right' },
    { target: '#search-btn', title: 'Recherche globale', text: 'Ctrl+K pour chercher partout dans NEXUS.', pos: 'bottom' },
  ],
  current: 0,
  start() {
    if (AppState.onboarded) return;
    this.current = 0;
    this._show();
  },
  _show() {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;
    const step = this.steps[this.current];
    if (!step) { this._finish(); return; }
    const target = document.querySelector(step.target);
    overlay.classList.remove('hidden');
    const box = overlay.querySelector('.highlight-box');
    const bubble = overlay.querySelector('.tooltip-bubble');
    if (target && box) {
      const r = target.getBoundingClientRect();
      box.style.cssText = `top:${r.top - 8}px;left:${r.left - 8}px;width:${r.width + 16}px;height:${r.height + 16}px`;
    }
    if (bubble) {
      bubble.querySelector('.step-title').textContent = step.title;
      bubble.querySelector('.step-text').textContent = step.text;
      bubble.querySelector('.step-counter').textContent = `${this.current + 1} / ${this.steps.length}`;
    }
  },
  next() {
    this.current++;
    if (this.current >= this.steps.length) this._finish();
    else this._show();
  },
  skip() { this._finish(); },
  _finish() {
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.classList.add('hidden');
    AppState.onboarded = true;
    AppState.save();
  },
};

/* ── DASHBOARD DATA ── */
const Dashboard = {
  render() {
    /* Greeting */
    const greetEl = document.getElementById('dash-greeting');
    if (greetEl) {
      const h = new Date().getHours();
      const g = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
      greetEl.textContent = `${g}, ${AppState.user.name} 👋`;
    }
    /* Date */
    const dateEl = document.getElementById('dash-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    /* Daily quote */
    const q = getDailyQuote();
    const qText = document.getElementById('dash-quote-text');
    const qAuth = document.getElementById('dash-quote-author');
    if (qText) qText.textContent = q.text;
    if (qAuth) qAuth.textContent = '— ' + q.author;

    this._renderStats();
    this._renderRecentActivity();
  },
  _renderStats() {
    /* Events today */
    const today = DateUtils.today();
    const events = Store.get('agenda_events', []).filter(e => e.date === today);
    const evEl = document.getElementById('stat-events-today');
    if (evEl) evEl.textContent = events.length;

    /* Tasks today */
    const tasks = Store.get('tasks', []).filter(t => t.dueDate === today && !t.done);
    const taskEl = document.getElementById('stat-tasks-today');
    if (taskEl) taskEl.textContent = tasks.length;

    /* Last workout */
    const sessions = Store.get('workout_sessions', []);
    const lastEl = document.getElementById('stat-last-workout');
    if (lastEl) {
      if (sessions.length) {
        const last = sessions.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        lastEl.textContent = DateUtils.relative(last.date);
      } else lastEl.textContent = '—';
    }

    /* Notes count */
    const notes = Store.get('notes', []);
    const notesEl = document.getElementById('stat-notes-count');
    if (notesEl) notesEl.textContent = notes.length;

    /* Finance balance */
    const transactions = Store.get('transactions', []);
    const balance = transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    const balEl = document.getElementById('stat-balance');
    if (balEl) balEl.textContent = balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

    /* Workout streak */
    const streakEl = document.getElementById('stat-streak');
    if (streakEl) streakEl.textContent = this._calcStreak(sessions) + '🔥';
  },
  _calcStreak(sessions) {
    if (!sessions.length) return 0;
    const days = [...new Set(sessions.map(s => s.date?.slice(0, 10)))].sort().reverse();
    let streak = 0, cur = new Date();
    for (const d of days) {
      const day = new Date(d);
      const diff = Math.round((cur - day) / 86400000);
      if (diff <= 1) { streak++; cur = day; }
      else break;
    }
    return streak;
  },
  _renderRecentActivity() {
    const el = document.getElementById('recent-activity');
    if (!el) return;
    const items = [];
    Store.get('workout_sessions', []).slice(-3).forEach(s => items.push({ icon: 'musculation', text: `Séance ${s.muscleGroup || ''}`, time: s.date }));
    Store.get('notes', []).slice(-2).forEach(n => items.push({ icon: 'notes', text: n.title || 'Note sans titre', time: n.updatedAt }));
    Store.get('agenda_events', []).filter(e => e.date >= DateUtils.today()).slice(0, 2)
      .forEach(e => items.push({ icon: 'agenda', text: e.title, time: e.date }));
    items.sort((a, b) => new Date(b.time) - new Date(a.time));
    el.innerHTML = items.slice(0, 6).map(i => `
      <div class="activity-item anim-fade-up">
        <span class="activity-icon">${Icons[i.icon] || ''}</span>
        <div class="activity-info">
          <span class="activity-text">${i.text}</span>
          <span class="activity-time">${DateUtils.relative(i.time)}</span>
        </div>
      </div>
    `).join('') || '<p class="text-muted">Aucune activité récente.</p>';
  },
};

/* ── FORMAT HELPERS ── */
function fmtBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}

function fmtDuration(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

function fmtCurrency(n) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

/* ── INIT ── */
function initApp() {
  AppState.load();
  document.documentElement.setAttribute('data-theme', AppState.theme);

  /* Sidebar collapsed state */
  const sidebar = document.getElementById('sidebar');
  if (sidebar && AppState.sidebarCollapsed) sidebar.classList.add('sidebar-collapsed');

  /* Init subsystems */
  Router.init();
  Modal.init();
  LoadingBar.init();
  Notifications.load();
  Shortcuts.init();

  /* Nav clicks */
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      Router.navigate(el.dataset.nav);
      if (typeof updateBottomNav === 'function') updateBottomNav(el.dataset.nav);
      if (typeof window.closeFmDrawer === 'function') window.closeFmDrawer();
    });
    addRipple(el);
  });

  /* Sidebar toggle */
  const toggleBtn = document.getElementById('sidebar-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', () => AppState.toggleSidebar());

  /* Search */
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) searchBtn.addEventListener('click', () => Search.open());

  /* Search modal logic */
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  if (searchInput && searchResults) {
    searchInput.addEventListener('input', () => {
      const results = Search.query(searchInput.value);
      if (!results.length) {
        searchResults.innerHTML = `<p class="search-empty">Aucun résultat pour "${searchInput.value}"</p>`;
        return;
      }
      searchResults.innerHTML = results.map((r, i) => `
        <div class="search-result-item anim-fade-up stagger-${Math.min(i+1,10)}" data-idx="${i}" tabindex="0">
          <span class="search-result-icon">${Icons[r.icon] || ''}</span>
          <div class="search-result-info">
            <span class="search-result-title">${r.title}</span>
            <span class="search-result-type">${r.type}</span>
          </div>
        </div>
      `).join('');
      searchResults.querySelectorAll('.search-result-item').forEach((el, i) => {
        el.addEventListener('click', () => { results[i].action?.(); Search.close(); });
      });
    });
  }

  /* Notifications toggle */
  const notifBtn = document.getElementById('notif-btn');
  const notifDropdown = document.getElementById('notif-dropdown');
  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', e => {
      e.stopPropagation();
      notifDropdown.classList.toggle('hidden');
      Notifications.markAllRead();
      renderNotifDropdown();
    });
    document.addEventListener('click', () => notifDropdown?.classList.add('hidden'));
  }

  /* Theme toggle */
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const themes = ['dark', 'light', 'amoled', 'dark-blue', 'dark-purple'];
      const labels = { dark: '🌙 Sombre', light: '☀️ Clair', amoled: '⚫ AMOLED', 'dark-blue': '🔵 Bleu', 'dark-purple': '🟣 Violet' };
      const idx = themes.indexOf(AppState.theme);
      const next = themes[(idx + 1) % themes.length];
      AppState.setTheme(next);
      document.querySelectorAll('[data-set-theme]').forEach(e => e.classList.toggle('active', e.dataset.setTheme === next));
      Toast.info(`Thème : ${labels[next] || next}`);
    });
  }

  /* Dashboard */
  Dashboard.render();
  Bus.on('moduleActivated', ({ module }) => {
    if (module === 'dashboard') Dashboard.render();
  });

  /* Onboarding */
  document.getElementById('onboarding-next')?.addEventListener('click', () => Onboarding.next());
  document.getElementById('onboarding-skip')?.addEventListener('click', () => Onboarding.skip());
  setTimeout(() => Onboarding.start(), 800);

  /* Module-level init calls (each module registers itself) */
  Bus.emit('appReady', {});

  console.log('%cNEXUS APP ready', 'color:#7C3AED;font-weight:bold;font-size:14px');
  registerSW();
}

/* ── Service Worker — enregistrement + rechargement auto ── */
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  let swRefreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!swRefreshing) { swRefreshing = true; window.location.reload(); }
  });
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw?.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[SW] Nouvelle version installée — rechargement...');
        }
      });
    });
  }).catch(e => console.warn('[SW] Échec enregistrement', e));
}

function renderNotifDropdown() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  const items = Notifications.list.slice(0, 15);
  if (!items.length) {
    list.innerHTML = '<p class="notif-empty">Aucune notification</p>';
    return;
  }
  list.innerHTML = items.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}">
      <span class="notif-dot notif-dot-${n.type}"></span>
      <div class="notif-body">
        <p class="notif-msg">${n.msg}</p>
        <span class="notif-time">${DateUtils.relative(n.createdAt)}</span>
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', initApp);
