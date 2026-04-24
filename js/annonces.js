/* ═══════════════════════════════════════════════════════════
   NEXUS APP — annonces.js
   Changelog & nouveautés — mis à jour à chaque session
═══════════════════════════════════════════════════════════ */

const Annonces = {

  /* ── Changelog — ajouter en TÊTE à chaque session ── */
  CHANGELOG: [
    {
      version: '2.7',
      date: '2026-04-24',
      label: 'Aujourd\'hui',
      emoji: '🛡️',
      title: 'Accès admin simplifié — code secret dans l\'app',
      items: [
        'Plus d\'écran de verrouillage au démarrage — app directement accessible',
        'Bouton 🛡️ dans le topbar — ouvre une fenêtre de saisie du code admin',
        'Code admin secret → ouvre le panel administrateur directement',
        'Anti-brute force conservé — verrouillage après 5 tentatives',
        'Panel admin — journaux d\'accès avec IP, appareil et date de connexion',
      ],
    },
    {
      version: '2.6',
      date: '2026-04-24',
      label: '2026-04-24',
      emoji: '🔒',
      title: 'Mot de passe texte & journal d\'accès',
      items: [
        'Mot de passe texte (longueur libre) à la place du code PIN',
        'Afficher/masquer le mot de passe (bouton 👁)',
        'Hash SHA-256 — mots de passe jamais stockés en clair',
        'Journal d\'accès — chaque connexion enregistrée (IP, appareil, date, rôle)',
        'IP récupérée via api.ipify.org à chaque connexion',
        'Panel admin — liste complète des connexions avec badges rôle + filtrage',
        'Actions admin : effacer les journaux, réinitialiser les tentatives, reconfigurer',
      ],
    },
    {
      version: '2.5',
      date: '2026-04-24',
      label: '2026-04-24',
      emoji: '🔒',
      title: 'Sécurité renforcée & code d\'accès partagé',
      items: [
        'Code d\'accès unique partagé — même code pour tous les utilisateurs',
        'Code administrateur séparé — accès au panel admin pour l\'admin uniquement',
        'Anti-brute force — verrouillage après 5 tentatives (durée exponentielle)',
        'Countdown de déverrouillage visible en temps réel',
        'Panel admin — statistiques, état de sécurité, gestion des codes',
        'Réinitialisation des tentatives échouées depuis le panel admin',
      ],
    },
    {
      version: '2.4',
      date: '2026-04-24',
      label: '2026-04-24',
      emoji: '🔒',
      title: 'Verrouillage PIN & Panel Admin',
      items: [
        'Écran de verrouillage PIN à 4 chiffres au lancement',
        'Setup guidé au premier démarrage — prénom + PIN + code admin',
        'Code administrateur séparé — ouvre le panel admin directement',
        'Panel admin — stats de l\'appareil (séances, notes, événements…)',
        'Session déverrouillée jusqu\'à fermeture de l\'onglet',
        'Déploiement GitHub Pages — app accessible partout via URL',
      ],
    },
    {
      version: '2.3',
      date: '2026-04-22',
      label: '2026-04-22',
      emoji: '📦',
      title: 'Transfert de données & corrections mobile',
      items: [
        'Nouveau panel Transfert — exporte/importe toutes tes données en fichier .nexus',
        'Mode Fusionner à l\'import — ajoute sans écraser les données existantes',
        'Accessible depuis le drawer ··· ou via l\'assistant ("exporte mes données")',
        'Correction topbar iPhone — notch pris en compte, NEXUS bien centré',
        'Bottom nav repositionnée correctement au-dessus du safe area iOS',
      ],
    },
    {
      version: '2.2',
      date: '2026-04-22',
      label: '2026-04-22',
      emoji: '📱',
      title: 'Navigation mobile & Bottom Nav',
      items: [
        'Bottom nav mobile — 5 onglets fixes en bas (Accueil, Sport, Agenda, Finances, ···)',
        'Drawer "Plus" — grille 3×3 avec les 7 autres modules',
        'Topbar NEXUS centré en dégradé violet→cyan (police Fraunces)',
        'Module actif affiché en sous-titre sous NEXUS sur mobile',
        'FAB assistant repositionné au-dessus de la bottom nav',
        'Modals en bottom sheet plein-écran sur iPhone',
        'Assistant plein écran sur mobile',
        'Boutons ✕ unifiés — 36×36px, hover rouge, z-index correct',
        'Router synchro avec la bottom nav à chaque navigation',
      ],
    },
    {
      version: '2.1',
      date: '2026-04-22',
      label: '2026-04-22',
      emoji: '🤖',
      title: 'Assistant NLP — refonte complète',
      items: [
        'Multi-groupes musculaires — "séance pecs dos" crée les deux groupes',
        'Parsing exercices — "avec développé couché 3x10 80kg, rowing barre" extrait nom/séries/reps/poids',
        'Agenda langage naturel — "rdv médecin demain 14h", "réunion lundi", "cours yoga ce soir 19h"',
        'Finances complètes — dépenses, revenus, budget par catégorie, solde',
        'Notes avec contenu — "note idée : aller courir" crée titre + contenu séparés',
        'Contacts avec email — extrait nom, téléphone ET email',
        'Suppression — "supprime la dernière séance / dépense / note / événement"',
        'Fonctionne 100% offline, sans API, sans clé',
      ],
    },
    {
      version: '2.0',
      date: '2026-04-22',
      label: '2026-04-22',
      emoji: '📚',
      title: 'Documentation & Service Worker',
      items: [
        'NEXUS_DOCS.md — documentation complète de l\'app (10 sections)',
        'scripts/update-docs.ps1 — régénère les métriques automatiquement',
        'update-docs.bat — double-clic pour mettre à jour la doc',
        'Service Worker refait — tous les fichiers JS/CSS mis en cache pour offline',
        '12 931 lignes de code · 605 fonctions JS',
      ],
    },
    {
      version: '1.0',
      date: '2026-01-01',
      label: 'Lancement',
      emoji: '🚀',
      title: 'NEXUS — lancement initial',
      items: [
        '11 modules : Dashboard, Musculation, Agenda, Finances, Nutrition, Notes, Contacts, Pomodoro, Météo, Stockage, Stats',
        'PWA installable iOS & Android',
        'Synchronisation Firebase Firestore',
        'Mode hors-ligne avec IndexedDB',
        '5 thèmes : Dark, Light, AMOLED, Dark Blue, Dark Purple',
        'Assistant vocal et textuel NLP',
        'Curseur personnalisé + animations',
      ],
    },
  ],

  STORAGE_KEY: 'annonces_last_seen',

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

    document.body.appendChild(panel);

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
