/* ═══════════════════════════════════════════════════════════
   NEXUS APP — annonces.js
   Changelog & nouveautés — mis à jour à chaque session
═══════════════════════════════════════════════════════════ */

const Annonces = {

  /* ── Changelog — ajouter en TÊTE à chaque session ── */
  CHANGELOG: [
    {
      version: '2.4',
      date: '2026-04-24',
      label: 'Aujourd\'hui',
      emoji: '🌐',
      title: 'NEXUS accessible partout',
      items: [
        'Disponible depuis n\'importe quel appareil via URL',
        'Installable sur iPhone & Android',
      ],
    },
    {
      version: '2.3',
      date: '2026-04-22',
      label: '22 avril',
      emoji: '📦',
      title: 'Export & import de données',
      items: [
        'Sauvegarde toutes tes données en un fichier .nexus',
        'Import avec mode fusion — rien n\'est écrasé',
      ],
    },
    {
      version: '2.2',
      date: '2026-04-22',
      label: '22 avril',
      emoji: '📱',
      title: 'Navigation mobile',
      items: [
        'Barre de navigation en bas sur mobile',
        'Accès rapide à tous les modules depuis le menu ···',
      ],
    },
    {
      version: '2.1',
      date: '2026-04-22',
      label: '22 avril',
      emoji: '🤖',
      title: 'Assistant en langage naturel',
      items: [
        'Crée des séances, notes, événements et dépenses par la voix',
        'Fonctionne 100% hors-ligne, sans clé API',
      ],
    },
    {
      version: '1.0',
      date: '2026-01-01',
      label: 'Lancement',
      emoji: '🚀',
      title: 'Lancement de NEXUS',
      items: [
        '11 modules tout-en-un — sport, agenda, finances, notes et plus',
        '5 thèmes, mode hors-ligne, PWA installable',
      ],
    },
  ],

  STORAGE_KEY: 'annonces_last_seen',

  /* Container selon le mode (force-mobile appende dans #app pour rester dans le mockup) */
  _root() { return (document.body.classList.contains('force-mobile') && document.getElementById('app')) || document.body; },

  /* ── Calcule le nombre de versions non lues ── */
  getUnreadCount() {
    const lastSeen = Store.get(this.STORAGE_KEY) || '0000-00-00';
    return this.CHANGELOG.filter(e => e.date > lastSeen).length;
  },

  /* ── Marque tout comme lu ── */
  markAllRead() {
    Store.set(this.STORAGE_KEY, DateUtils.today());
    this._updateBadge();
  },

  /* ── Met à jour le badge dans le topbar ── */
  _updateBadge() {
    const badge = document.getElementById('annonces-badge');
    const count = this.getUnreadCount();
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  },

  /* ── Ouvre le panel ── */
  open() {
    const existing = document.getElementById('annonces-panel');
    if (existing) { existing.remove(); return; }

    const lastSeen = Store.get(this.STORAGE_KEY) || '0000-00-00';

    const panel = document.createElement('div');
    panel.id = 'annonces-panel';
    panel.className = 'annonces-panel';
    panel.setAttribute('aria-label', 'Annonces et mises à jour');

    panel.innerHTML = `
      <div class="annonces-header">
        <div class="annonces-header-left">
          <span class="annonces-header-icon">📣</span>
          <div>
            <div class="annonces-title">Nouveautés</div>
            <div class="annonces-sub">Historique des mises à jour</div>
          </div>
        </div>
        <button class="btn-close" id="annonces-close" aria-label="Fermer">✕</button>
      </div>
      <div class="annonces-list">
        ${this.CHANGELOG.map((entry, i) => {
          const isNew = entry.date > lastSeen;
          return `
            <div class="annonces-entry ${isNew ? 'annonces-entry--new' : ''}">
              <div class="annonces-entry-header">
                <span class="annonces-entry-emoji">${entry.emoji}</span>
                <div class="annonces-entry-meta">
                  <div class="annonces-entry-title">${entry.title}</div>
                  <div class="annonces-entry-date">
                    ${isNew ? '<span class="annonces-new-badge">Nouveau</span>' : ''}
                    v${entry.version} · ${entry.label}
                  </div>
                </div>
              </div>
              <ul class="annonces-items">
                ${entry.items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>`;
        }).join('')}
      </div>`;

    this._root().appendChild(panel);

    document.getElementById('annonces-close').addEventListener('click', () => this.close());

    // Ferme si clic en dehors
    setTimeout(() => {
      document.addEventListener('click', this._outsideClick, { once: false });
    }, 50);

    requestAnimationFrame(() => panel.classList.add('open'));
    this.markAllRead();
  },

  _outsideClick(e) {
    const panel = document.getElementById('annonces-panel');
    const btn   = document.getElementById('annonces-btn');
    if (!panel) return;
    if (!panel.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
      Annonces.close();
    }
  },

  close() {
    document.removeEventListener('click', this._outsideClick);
    const panel = document.getElementById('annonces-panel');
    if (!panel) return;
    panel.classList.remove('open');
    setTimeout(() => panel.remove(), 280);
  },

  init() {
    const btn = document.getElementById('annonces-btn');
    if (btn) btn.addEventListener('click', e => { e.stopPropagation(); this.open(); });
    this._updateBadge();
  },
};
