/* ═══════════════════════════════════════════════════════════
   NEXUS APP — assistant.js
   Assistant conversationnel + vocal — tous les modules
═══════════════════════════════════════════════════════════ */

const Assistant = {
  open: false,
  listening: false,
  history: [],
  recognition: null,

  MODULE_MAP: {
    'dashboard': 'dashboard', 'accueil': 'dashboard', 'tableau de bord': 'dashboard', 'home': 'dashboard',
    'musculation': 'musculation', 'sport': 'musculation', 'gym': 'musculation', 'entraînement': 'musculation',
    'entrainement': 'musculation', 'seance': 'musculation', 'séance': 'musculation', 'fitness': 'musculation',
    'agenda': 'agenda', 'calendrier': 'agenda', 'planning': 'agenda', 'emploi du temps': 'agenda',
    'notes': 'notes', 'note': 'notes', 'carnet': 'notes', 'memo': 'notes', 'mémo': 'notes',
    'stockage': 'stockage', 'fichiers': 'stockage', 'documents': 'stockage',
    'nutrition': 'nutrition', 'alimentation': 'nutrition', 'repas': 'nutrition', 'calories': 'nutrition',
    'finances': 'finances', 'finance': 'finances', 'argent': 'finances', 'budget': 'finances',
    'pomodoro': 'pomodoro', 'timer': 'pomodoro', 'minuteur': 'pomodoro', 'chrono': 'pomodoro',
    'météo': 'meteo', 'meteo': 'meteo', 'temps': 'meteo',
    'contacts': 'contacts', 'répertoire': 'contacts', 'carnet d\'adresses': 'contacts',
    'stats': 'stats', 'statistiques': 'stats', 'graphiques': 'stats',
  },

  MUSCLE_MAP: {
    'pectoraux': 'pectoraux', 'pecs': 'pectoraux', 'pec': 'pectoraux', 'poitrine': 'pectoraux', 'chest': 'pectoraux',
    'dos': 'dos', 'back': 'dos', 'dorsaux': 'dos', 'dorsal': 'dos',
    'jambes': 'jambes', 'legs': 'jambes', 'cuisses': 'jambes', 'squats': 'jambes', 'jambe': 'jambes',
    'epaules': 'epaules', 'épaules': 'epaules', 'epaule': 'epaules', 'épaule': 'epaules',
    'shoulders': 'epaules', 'deltoides': 'epaules', 'deltoïdes': 'epaules',
    'biceps': 'biceps', 'bicep': 'biceps',
    'triceps': 'triceps', 'tricep': 'triceps',
    'abdos': 'abdos', 'abdo': 'abdos', 'abdominaux': 'abdos', 'core': 'abdos', 'ventre': 'abdos',
    'fullbody': 'fullbody', 'full body': 'fullbody', 'corps entier': 'fullbody', 'complet': 'fullbody',
    'cardio': 'cardio', 'course': 'cardio', 'velo': 'cardio', 'vélo': 'cardio', 'running': 'cardio',
  },

  MONTH_MAP: {
    'janvier':1,'février':2,'fevrier':2,'mars':3,'avril':4,'mai':5,'juin':6,
    'juillet':7,'août':8,'aout':8,'septembre':9,'octobre':10,'novembre':11,'décembre':12,'decembre':12,
    'jan':1,'fev':2,'mar':3,'avr':4,'jul':7,'aou':8,'sep':9,'oct':10,'nov':11,'dec':12,
  },

  DAY_MAP: {
    'lundi':1,'mardi':2,'mercredi':3,'jeudi':4,'vendredi':5,'samedi':6,'dimanche':0,
  },

  FINANCE_CATS: {
    'alimentation':'alimentation','nourriture':'alimentation','courses':'alimentation','restaurant':'alimentation',
    'boulangerie':'alimentation','mcdo':'alimentation','burger':'alimentation','pizza':'alimentation','kebab':'alimentation',
    'transport':'transport','voiture':'transport','essence':'transport','bus':'transport','metro':'transport',
    'train':'transport','uber':'transport','taxi':'transport','carburant':'transport',
    'logement':'logement','loyer':'logement','maison':'logement','appartement':'logement','electricite':'logement',
    'internet':'logement','telephone':'logement','tel':'logement',
    'sante':'sante','medecin':'sante','pharmacie':'sante','docteur':'sante','dentiste':'sante','mutuelle':'sante',
    'sport':'sport','gym':'sport','fitness':'sport','salle':'sport','abonnement salle':'sport',
    'loisirs':'loisirs','cinema':'loisirs','jeux':'loisirs','musique':'loisirs','streaming':'loisirs',
    'netflix':'loisirs','disney':'loisirs','spotify':'loisirs','amazon':'loisirs','prime':'loisirs',
    'shopping':'shopping','vetements':'shopping','habits':'shopping','chaussures':'shopping','fringues':'shopping',
    'education':'education','livres':'education','cours':'education','formation':'education','livre':'education',
    'salaire':'salaire','paie':'salaire','revenu':'salaire','paye':'salaire',
    'freelance':'freelance','client':'freelance','mission':'freelance','facture':'freelance',
    'cadeau':'cadeaux','anniversaire':'cadeaux',
    'voyage':'voyage','hotel':'voyage','avion':'voyage','vacances':'voyage',
  },

  init() {
    this._buildUI();
    this._initSpeech();
    this._bindEvents();
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
    this._addMsg('assistant', `${greet} ! Je suis votre assistant NEXUS. Je peux tout faire pour vous :<br>
      <span style="opacity:.7;font-size:.8em">agenda · musculation · finances · nutrition · notes · contacts · pomodoro · navigation</span><br>
      Essayez : <em>"séance pecs dos avec développé couché, rowing barre"</em> · <em>"dépense de 20€ restaurant"</em> · <em>"résumé du jour"</em>`);
  },

  /* ── UI ── */
  _buildUI() {
    const fab = document.createElement('button');
    fab.id = 'assistant-fab';
    fab.className = 'assistant-fab';
    fab.innerHTML = this._micSVG();
    fab.title = 'Assistant NEXUS (Ctrl+J)';
    document.body.appendChild(fab);

    const panel = document.createElement('div');
    panel.id = 'assistant-panel';
    panel.className = 'assistant-panel hidden';
    panel.innerHTML = `
      <div class="assistant-header">
        <div class="assistant-header-left">
          <div class="assistant-avatar">${this._starSVG()}</div>
          <div>
            <div class="assistant-title">Assistant NEXUS</div>
            <div class="assistant-subtitle" id="assistant-status">Prêt</div>
          </div>
        </div>
        <button class="btn-icon assistant-close" id="assistant-close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="assistant-messages" id="assistant-messages"></div>
      <div class="assistant-suggestions" id="assistant-suggestions">
        <button class="asst-chip" data-cmd="résumé du jour">📊 Résumé</button>
        <button class="asst-chip" data-cmd="séance pecs dos avec développé couché, rowing barre">💪 Séance</button>
        <button class="asst-chip" data-cmd="rdv médecin demain 14h">📅 RDV</button>
        <button class="asst-chip" data-cmd="quel est mon solde">💰 Solde</button>
        <button class="asst-chip" data-cmd="aide">❓ Aide</button>
      </div>
      <div class="assistant-input-bar">
        <textarea id="assistant-input" class="assistant-textarea" placeholder="Posez une question ou donnez un ordre…" rows="1"></textarea>
        <button id="assistant-mic" class="btn-icon assistant-mic-btn" title="Vocal">
          <span id="assistant-mic-icon">${this._micSVG()}</span>
        </button>
        <button id="assistant-send" class="btn-icon assistant-send-btn" title="Envoyer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>`;
    document.body.appendChild(panel);
  },

  _micSVG() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>`;
  },

  _starSVG() {
    return `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z"/>
    </svg>`;
  },

  _bindEvents() {
    document.getElementById('assistant-fab').addEventListener('click', () => this.toggle());
    document.getElementById('assistant-close').addEventListener('click', () => this.hide());
    document.getElementById('assistant-send').addEventListener('click', () => this._submit());
    document.getElementById('assistant-mic').addEventListener('click', () => this._toggleVoice());
    document.getElementById('assistant-suggestions').addEventListener('click', e => {
      const chip = e.target.closest('.asst-chip');
      if (!chip) return;
      document.getElementById('assistant-input').value = chip.dataset.cmd;
      this._submit();
    });
    const input = document.getElementById('assistant-input');
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._submit(); }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') { e.preventDefault(); this.toggle(); }
      if (e.key === 'Escape' && this.open) this.hide();
    });
  },

  show() {
    this.open = true;
    const p = document.getElementById('assistant-panel');
    p.classList.remove('hidden');
    p.classList.add('open');
    document.getElementById('assistant-fab').classList.add('active');
    setTimeout(() => document.getElementById('assistant-input')?.focus(), 150);
  },
  hide() {
    this.open = false;
    const p = document.getElementById('assistant-panel');
    p.classList.remove('open');
    p.classList.add('hidden');
    document.getElementById('assistant-fab').classList.remove('active');
    if (this.listening) this._stopVoice();
  },
  toggle() { this.open ? this.hide() : this.show(); },

  _submit() {
    const input = document.getElementById('assistant-input');
    const text = input?.value?.trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';
    this._addMsg('user', text);
    this._setStatus('Traitement…');
    setTimeout(() => this._process(text), 200);
  },

  _addMsg(role, html) {
    this.history.push({ role, html, ts: Date.now() });
    const c = document.getElementById('assistant-messages');
    if (!c) return;
    const div = document.createElement('div');
    div.className = `asst-msg asst-msg-${role} anim-fade-up`;
    if (role === 'assistant') {
      div.innerHTML = `<div class="asst-avatar-small">${this._starSVG()}</div><div class="asst-bubble">${html}</div>`;
    } else {
      div.innerHTML = `<div class="asst-bubble asst-bubble-user">${Security.sanitize(html)}</div>`;
    }
    c.appendChild(div);
    c.scrollTop = c.scrollHeight;
  },

  _reply(html) { this._addMsg('assistant', html); this._setStatus('Prêt'); },
  _setStatus(t) { const el = document.getElementById('assistant-status'); if (el) el.textContent = t; },

  /* ════════════════════════════════════════
     TRAITEMENT NLP
  ════════════════════════════════════════ */
  _process(text) {
    const t = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    /* ── Salutations ── */
    if (/^(bonjour|bonsoir|salut|coucou|hello|hey|bonne (journee|nuit|soiree))/.test(t)) {
      const h = new Date().getHours();
      const m = h < 12 ? 'matin' : h < 18 ? 'après-midi' : 'soir';
      return this._reply([
        `Bonjour ! Beau ${m} pour être productif 💪 Comment puis-je vous aider ?`,
        `Salut ! Prêt pour votre ${m} ? Je suis là pour tout organiser.`,
        `Bonjour ! Qu'est-ce qu'on accomplit aujourd'hui ?`,
      ][~~(Math.random() * 3)]);
    }

    /* ── Comment ça va ── */
    if (/(comment (tu vas|ca va|vous allez|vas.tu)|t'es comment|ca va|vous allez bien)/.test(t)) {
      return this._reply(`Je fonctionne parfaitement, merci ! Je suis votre assistant NEXUS. Et vous, comment se passe votre journée ?`);
    }

    /* ── Remerciements ── */
    if (/^(merci|super|parfait|tres bien|excellent|genial|cool|nickel|top|bien joue|bravo|thanks)/.test(t)) {
      return this._reply([
        `Avec plaisir ! N'hésitez pas si vous avez besoin d'autre chose.`,
        `De rien ! Je suis là si vous avez d'autres questions.`,
        `Avec plaisir ! Bonne suite dans NEXUS 👍`,
      ][~~(Math.random() * 3)]);
    }

    /* ── Heure & date ── */
    if (/(quelle heure|il est quelle heure|l'heure)/.test(t)) {
      const n = new Date();
      return this._reply(`Il est <b>${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}</b>.`);
    }
    if (/(quel jour|quelle date|on est quel|aujourd'hui c'est)/.test(t)) {
      return this._reply(`Nous sommes le <b>${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</b>.`);
    }

    /* ── Au revoir ── */
    if (/^(au revoir|bye|ciao|a bientot|a plus|bonne journee|bonne nuit)/.test(t)) {
      return this._reply(`À bientôt ! Bonne suite dans NEXUS 👋`);
    }

    /* ── Aide ── */
    if (/^(aide|help|que peux.tu|commandes?|qu'est.ce que tu (sais|peux)|tes fonctions|tu peux quoi|quoi faire)/.test(t)) {
      return this._replyHelp();
    }

    /* ── À propos de NEXUS ── */
    if (/(qu'est.ce que nexus|c'est quoi nexus|a quoi sert nexus)/.test(t)) {
      return this._reply(`NEXUS est votre app de productivité personnelle tout-en-un :<br>
        📅 Agenda · 💪 Musculation · 📝 Notes · 💰 Finances<br>
        🍎 Nutrition · ⏱ Pomodoro · 🌤 Météo · 👥 Contacts · 📦 Stockage<br>
        <br>Tout est synchronisé Firebase, fonctionne hors ligne. Je peux créer, modifier et naviguer partout.`);
    }

    /* ── Transfert / backup ── */
    if (/(export|backup|sauvegarde|telecharge|transfert|transfère).*(donnees?|data|tout|nexus)?|(mes donnees?|mon backup)/.test(t)) {
      if (typeof Transfert !== 'undefined') Transfert.open();
      else if (typeof exportData === 'function') exportData();
      return this._reply(`📦 Panel de transfert ouvert. Téléchargez votre backup ou importez depuis un autre appareil.`);
    }
    if (/(import|restaure|charge|charge).*(donnees?|backup|fichier)/.test(t)) {
      if (typeof Transfert !== 'undefined') Transfert.open();
      return this._reply(`📦 Panel de transfert ouvert. Choisissez votre fichier <code>.nexus</code> à importer.`);
    }

    /* ── Suppression ── */
    if (/(supprime|efface|enleve|retire|annule|delete).*(derniere?|last|seance|depense|transaction|evenement|event|rdv|note|contact)|(supprime|efface).*(tout|toutes|tous)/.test(t)) {
      return this._execDelete(text, t);
    }

    /* ── Navigation ── */
    if (/^(va sur|ouvre|affiche|navigue vers|montre|aller sur|voir|show|go to|aller a)\s/.test(t) || this._findModule(t)) {
      const mod = this._findModule(t);
      if (mod) return this._execNavigation(mod);
    }

    /* ── Musculation — détection large ── */
    if (this._isWorkoutIntent(t)) {
      return this._execWorkout(text, t);
    }

    /* ── Agenda — rendez-vous / événement ── */
    if (/(cree|ajoute|nouvel|nouveau|planifie|programme|rappel|mets|schedule|rdv|rendezvous|rendez.vous).*(evenement|event|rdv|rendez.vous|rendez vous|meeting|reunion|rappel|anniversaire|consultation|dentiste|medecin|docteur|coiffeur|sport|yoga|pilates|salle|cours|formation|conference)|(evenement|rdv|reunion|anniversaire|rendez.vous|consultation|rdv).*(demain|aujourd|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|le \d|\d+h)|(medecin|dentiste|coiffeur|reunion|meeting|yoga|pilates|cours|formation|conference)\s+(demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|le \d|a \d|\d+h)/.test(t)) {
      return this._execAgenda(text, t);
    }

    /* ── Agenda — forme courte: "réunion demain 14h" ── */
    if (/(demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|ce soir|ce matin|apres.demain)/.test(t) && !/(seance|workout|muscu|pecs|dos|jambes|biceps|triceps|epaules|abdos|cardio)/.test(t) && t.split(' ').length <= 8) {
      const hasTime = /\d+h|\d+:\d+/.test(t);
      const hasEvent = /(reunion|meeting|rdv|rendez|medecin|dentiste|coiffeur|yoga|pilates|cours|sport|anniversaire|cinema|sortie|diner|dejeuner|petit.dej|appel|call|entretien|interview)/.test(t);
      if (hasEvent || hasTime) return this._execAgenda(text, t);
    }

    /* ── Finance dépense ── */
    if (/(depense|achat|paye|j'ai achete|j'ai paye|j'ai depense|sortie d'argent|j'ai claque|acheté|payé|dépensé|claque).*(euro|\d|€)|(\d+).*(depense|achat|paye|€)|(ajoute|nouvelle|enregistre|cree|mettre).*(depense|achat|sortie)|(j'ai paye|j'ai achete|j'ai depense)\s+\d|(\d+\s*€|\d+\s*euros?)/.test(t) && /(depense|achat|paye|achete|claque|restaurant|boulangerie|courses|supermarche|leclerc|carrefour|lidl|aldi|monoprix|primark|zara|amazon)/.test(t)) {
      return this._execExpense(text);
    }

    /* ── Finance dépense — montant seul avec contexte dépense ── */
    if (/(\d+(?:[.,]\d+)?)\s*(?:€|euros?)/.test(t) && /(depense|achat|paye|achete|claque|restaurant|courses|supermarche|transport|essence|loyer|pharmacie|cinema|netflix|spotify)/.test(t)) {
      return this._execExpense(text);
    }

    /* ── Finance revenu ── */
    if (/(revenu|salaire|virement|recu|gagne|encaisse|touche|rentre).*(euro|\d|€)|(\d+).*(revenu|salaire)|(ajoute|nouveau|enregistre).*(revenu|salaire|rentree)|j'ai (recu|gagne|touche|encaisse)\s+\d/.test(t)) {
      return this._execIncome(text);
    }

    /* ── Finance budget ── */
    if (/(budget|limite|plafond).*(alimentation|transport|loisirs|shopping|sante|logement|\d+)|\d+.*budget/.test(t)) {
      return this._execBudget(text, t);
    }

    /* ── Solde & bilan finances ── */
    if (/(solde|balance|combien.*compte|mes finances|bilan.*finance|resume.*finance)/.test(t)) {
      return this._execSolde();
    }

    /* ── Nutrition ── */
    if (/(j'ai mange|j'ai bu|ajoute.*repas|ajoute.*aliment|mange|repas|nourriture|calories|dejeuner|diner|petit.dej|collation|eau|verre d'eau|hydrat)/.test(t)) {
      return this._execNutrition(text, t);
    }

    /* ── Note ── */
    if (/(cree|ajoute|nouvelle?|ecris|redige|prends?).*(note|memo|pense.bete|remarque)|^note\b/.test(t)) {
      return this._execNote(text);
    }

    /* ── Contacts ── */
    if (/(ajoute|cree|nouveau|nouvelle?|enregistre).*(contact|ami|personne|numero|collegue)|(contact|ami|personne).*(ajoute|cree|nouveau)/.test(t)) {
      return this._execContact(text);
    }

    /* ── Pomodoro ── */
    if (/(demarre|lance|start|commence|active|pause|stop|reset|relance).*(pomodoro|timer|minuteur|travail|focus|chrono)|(pomodoro|timer|minuteur).*(demarre|lance|pause|stop|reset)|^(pomodoro|focus|travail|pause)$/.test(t)) {
      return this._execPomodoro(t);
    }

    /* ── Prochains événements ── */
    if (/(prochain.*(evenement|rdv)|qu'est.ce que j'ai|agenda.*aujourd|programme.*aujourd|qu'est.ce qui est prevu|mon programme|mon agenda)/.test(t)) {
      return this._execNextEvents();
    }

    /* ── Résumé ── */
    if (/(resume|bilan|situation|quoi de neuf|rapport|comment.*va|statistiques.*jour|dashboard)/.test(t)) {
      return this._execDaySummary();
    }

    /* ── Comptages ── */
    if (/combien/.test(t)) {
      if (/note/.test(t)) return this._execCountNotes();
      if (/depense|transaction/.test(t)) return this._execCountTransactions();
      if (/seance|workout|entrainement/.test(t)) return this._execCountWorkouts();
      return this._execCountEvents();
    }

    /* ── Détection d'intention partielle ── */
    this._replyFallback(text, t);
  },

  /* ════════════════════════════════════════
     DÉTECTION INTENTIONS
  ════════════════════════════════════════ */

  _isWorkoutIntent(t) {
    // Intention explicite de séance
    if (/(seance|séance|entrainement|entraînement|workout|muscu|musculation)/.test(t)) return true;
    // "j'ai fait / j'ai souleve" + contexte sport
    if (/(j'ai fait|j'ai souleve|j'ai souleve|fait une?|j'ai bosse|je viens de faire).*(dos|pec|jambe|epaule|bicep|tricep|abdo|cardio|sport|gym|muscu|full|corps|barre|haltere|pompe|traction|squat|developpe|rowing|tirage|curl|dips|planche|extension|crunch|fente|presse)/.test(t)) return true;
    // Groupe musculaire + verbe d'action
    if (/(nouvelle?|cree|ajoute|enregistre|log|noter|sauvegarder).*(dos|pecs|pectoraux|jambes|epaules|biceps|triceps|abdos|cardio|fullbody)/.test(t)) return true;
    // Exercice seul suffisamment spécifique
    if (/(developpe couche|squat barre|soulevé de terre|souleve de terre|rowing barre|tractions|traction|pompes|dips|curl barre|curl haltere|planche|crunch|burpee)/.test(t)) return true;
    return false;
  },

  /* ════════════════════════════════════════
     EXÉCUTEURS
  ════════════════════════════════════════ */

  /* Navigation */
  _findModule(t) {
    const clean = t.replace(/^(va sur|ouvre|affiche|navigue vers|montre|aller sur|voir|show|go to)\s+/, '');
    const key = Object.keys(this.MODULE_MAP).find(k => clean.includes(k) || clean === k);
    return key ? this.MODULE_MAP[key] : null;
  },

  _execNavigation(module) {
    const labels = { dashboard:'tableau de bord', musculation:'musculation', agenda:'agenda',
      notes:'notes', stockage:'stockage', nutrition:'nutrition', finances:'finances',
      pomodoro:'pomodoro', meteo:'météo', contacts:'contacts', stats:'statistiques' };
    Router.navigate(module);
    this._reply(`Navigation vers <b>${labels[module] || module}</b> ✓`);
    setTimeout(() => this.hide(), 600);
  },

  /* ── MUSCULATION (refonte complète) ── */
  _execWorkout(text, t) {
    const groups = this._extractMuscleGroups(t);
    const primaryGroup = groups[0];
    const dateStr = this._extractDate(text) || DateUtils.today();
    const duration = this._extractDuration(text) || 60;

    // Tente d'extraire les exercices mentionnés dans le texte
    const parsedExercises = this._extractExercises(text, t);

    let exercises;
    if (parsedExercises && parsedExercises.length > 0) {
      exercises = parsedExercises;
    } else {
      // Exercices par défaut pour chaque groupe
      exercises = [];
      for (const grpKey of groups) {
        const mg = Musculation.MUSCLE_GROUPS?.find(g => g.key === grpKey);
        if (mg?.templates) {
          mg.templates.slice(0, 2).forEach(name => {
            if (!exercises.find(e => e.name === name)) {
              exercises.push({ name, sets: 3, reps: 10, weight: 0 });
            }
          });
        }
      }
      if (!exercises.length) exercises = [{ name: 'Exercice 1', sets: 3, reps: 10, weight: 0 }];
    }

    // Label combiné si multi-groupes
    const groupLabels = groups.map(k => {
      const mg = Musculation.MUSCLE_GROUPS?.find(g => g.key === k);
      return mg ? `${mg.emoji} ${mg.label}` : k;
    });

    const session = {
      id: uid(),
      date: dateStr,
      duration,
      notes: 'Créé par l\'assistant NEXUS',
      exercises,
      muscleGroup: primaryGroup,
      muscleGroups: groups,
      createdAt: DateUtils.now(),
    };

    const sessions = Store.get('workout_sessions', []);
    sessions.push(session);
    Store.set('workout_sessions', sessions);

    if (typeof Musculation !== 'undefined') {
      Musculation.sessions = sessions;
      if (document.getElementById('muscu-container')) Musculation._render();
    }

    Toast.success(`Séance ${groupLabels.join(' + ')} enregistrée 💪`);
    const dateLabel = this._formatDateLabel(dateStr);
    const exerciseList = exercises.map(e => {
      let detail = e.name;
      if (e.sets && e.reps) detail += ` <span style="opacity:.6">${e.sets}×${e.reps}${e.weight ? ' · ' + e.weight + 'kg' : ''}</span>`;
      return detail;
    }).join('<br>');

    this._reply(`💪 Séance <b>${groupLabels.join(' + ')}</b> enregistrée ${dateLabel ? 'le <b>' + dateLabel + '</b>' : "aujourd'hui"}<br>
      <br><b>${exercises.length} exercice${exercises.length > 1 ? 's' : ''} :</b><br>
      <small>${exerciseList}</small><br>
      <small style="opacity:.6">Ouvrez Musculation pour modifier les séries/répétitions/charges.</small>`);
  },

  /* ── AGENDA ── */
  _execAgenda(text, t) {
    const dateStr = this._extractDate(text);
    const timeStr = this._extractTime(text);

    // Extraction du titre en enlevant les mots-clés
    let title = text
      .replace(/^(crée|créé|ajoute|ajouter|planifie|programme|mets|nouveau|nouvel|nouvelle?|schedule|rappel|rdv|rendez.vous)\s+(un |une )?(evenement|event|rdv|rendez.vous|rendez vous|meeting|reunion|réunion|rappel|anniversaire|rendez-vous|consultation)?\s*/i, '')
      .replace(/\s+(le|pour|a|à|au|ce|ce soir|ce matin|demain|après-demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+.*$/i, '')
      .replace(/\s+(?:le\s+)?\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\s*/g, '')
      .replace(/\s+(?:le\s+)?\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre).*$/i, '')
      .replace(/\s*\d{1,2}h\d{0,2}\s*/g, '')
      .trim();

    if (!title || title.length < 2) {
      // Essaie d'extraire un mot-clé porteur de sens
      const keywords = /(reunion|meeting|rdv|medecin|dentiste|coiffeur|yoga|pilates|cours|formation|conference|anniversaire|cinema|sortie|diner|dejeuner|appel|call|entretien|interview|sport|gym|salle)/i;
      const m = text.match(keywords);
      title = m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : 'Événement';
    }
    title = title.charAt(0).toUpperCase() + title.slice(1);

    const event = {
      id: uid(),
      title,
      date: dateStr || DateUtils.today(),
      time: timeStr || '',
      desc: 'Créé par l\'assistant NEXUS',
      color: 'purple',
      createdAt: DateUtils.now(),
    };

    const events = Store.get('agenda_events', []);
    events.push(event);
    Store.set('agenda_events', events);

    if (typeof Agenda !== 'undefined') {
      Agenda.events = events;
      if (document.getElementById('agenda-container')) Agenda._render();
    }

    const dateLabel = dateStr ? `le <b>${this._formatDateLabel(dateStr)}</b>` : `<b>aujourd'hui</b>`;
    Toast.success(`"${event.title}" ajouté à l'agenda`);
    this._reply(`📅 <b>${event.title}</b> ajouté ${dateLabel}${timeStr ? ' à <b>' + timeStr + '</b>' : ''}`);
  },

  /* ── DÉPENSE ── */
  _execExpense(text) {
    const amount = this._extractAmount(text);
    const cat = this._extractFinanceCat(text);
    if (!amount) return this._reply(`Quel montant ? Exemple : <em>"dépense de 25€ restaurant"</em>`);

    const desc = this._extractExpenseDesc(text, amount);
    const tx = { id: uid(), type: 'expense', amount, category: cat, description: desc || 'Dépense', date: DateUtils.today(), createdAt: DateUtils.now() };
    const txs = Store.get('transactions', []);
    txs.push(tx);
    Store.set('transactions', txs);
    if (typeof Finances !== 'undefined') { Finances.transactions = txs; if (document.getElementById('finances-container')) Finances._render(); }

    const catObj = Finances?.CATEGORIES?.find(c => c.key === cat);
    Toast.success(`Dépense de ${amount}€ enregistrée`);
    this._reply(`💸 <b>-${this._fmt(amount)}</b>${catObj ? ` · ${catObj.emoji} ${catObj.label}` : ''}${desc ? `<br><small>${desc}</small>` : ''}`);
  },

  /* ── REVENU ── */
  _execIncome(text) {
    const amount = this._extractAmount(text);
    const cat = this._extractFinanceCat(text) || 'salaire';
    if (!amount) return this._reply(`Quel montant ? Exemple : <em>"revenu de 2000€ salaire"</em>`);

    const desc = this._extractExpenseDesc(text, amount);
    const tx = { id: uid(), type: 'income', amount, category: cat, description: desc || 'Revenu', date: DateUtils.today(), createdAt: DateUtils.now() };
    const txs = Store.get('transactions', []);
    txs.push(tx);
    Store.set('transactions', txs);
    if (typeof Finances !== 'undefined') { Finances.transactions = txs; if (document.getElementById('finances-container')) Finances._render(); }

    Toast.success(`Revenu de ${amount}€ enregistré`);
    this._reply(`💰 <b>+${this._fmt(amount)}</b> enregistré${desc ? `<br><small>${desc}</small>` : ''}`);
  },

  /* ── BUDGET ── */
  _execBudget(text, t) {
    const amount = this._extractAmount(text);
    const cat = this._extractFinanceCat(text);
    if (!amount) return this._reply(`Précisez le montant. Ex : <em>"budget alimentation 300€"</em>`);

    const budgets = Store.get('budgets', {});
    budgets[cat] = amount;
    Store.set('budgets', budgets);
    if (typeof Finances !== 'undefined' && document.getElementById('finances-container')) Finances._render();

    const catObj = Finances?.CATEGORIES?.find(c => c.key === cat);
    Toast.success(`Budget mis à jour`);
    this._reply(`🎯 Budget <b>${catObj ? catObj.label : cat}</b> fixé à <b>${this._fmt(amount)}</b>/mois`);
  },

  /* ── SOLDE ── */
  _execSolde() {
    const txs = Store.get('transactions', []);
    const balance = txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    const month = new Date().toISOString().slice(0, 7);
    const income  = txs.filter(t => t.type === 'income'  && t.date?.startsWith(month)).reduce((s,t)=>s+t.amount,0);
    const expense = txs.filter(t => t.type === 'expense' && t.date?.startsWith(month)).reduce((s,t)=>s+t.amount,0);
    const sign = balance >= 0 ? '🟢' : '🔴';
    this._reply(`${sign} <b>Solde total : ${this._fmt(balance)}</b><br>
      <small>Ce mois-ci : +${this._fmt(income)} revenus · -${this._fmt(expense)} dépenses</small>`);
  },

  /* ── SUPPRESSION ── */
  _execDelete(text, t) {
    if (/(seance|workout|sport|muscu)/.test(t)) {
      const sessions = Store.get('workout_sessions', []);
      if (!sessions.length) return this._reply(`Aucune séance à supprimer.`);
      const removed = sessions.sort((a,b) => new Date(b.date) - new Date(a.date))[0];
      const updated = sessions.filter(s => s.id !== removed.id);
      Store.set('workout_sessions', updated);
      if (typeof Musculation !== 'undefined') { Musculation.sessions = updated; if (document.getElementById('muscu-container')) Musculation._render(); }
      return this._reply(`🗑️ Séance <b>${removed.date}</b> supprimée.`);
    }
    if (/(depense|transaction|achat|paiement)/.test(t)) {
      const txs = Store.get('transactions', []);
      const expenses = txs.filter(tx => tx.type === 'expense').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (!expenses.length) return this._reply(`Aucune dépense à supprimer.`);
      const removed = expenses[0];
      const updated = txs.filter(tx => tx.id !== removed.id);
      Store.set('transactions', updated);
      if (typeof Finances !== 'undefined') { Finances.transactions = updated; if (document.getElementById('finances-container')) Finances._render(); }
      return this._reply(`🗑️ Dernière dépense supprimée : <b>${removed.description}</b> (-${this._fmt(removed.amount)})`);
    }
    if (/(evenement|event|rdv|rendez.vous)/.test(t)) {
      const events = Store.get('agenda_events', []).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (!events.length) return this._reply(`Aucun événement à supprimer.`);
      const removed = events[0];
      const updated = events.filter(e => e.id !== removed.id);
      Store.set('agenda_events', updated);
      if (typeof Agenda !== 'undefined') { Agenda.events = updated; if (document.getElementById('agenda-container')) Agenda._render(); }
      return this._reply(`🗑️ Événement supprimé : <b>${removed.title}</b>`);
    }
    if (/(note)/.test(t)) {
      const notes = Store.get('notes', []);
      if (!notes.length) return this._reply(`Aucune note à supprimer.`);
      const removed = notes[0];
      const updated = notes.slice(1);
      Store.set('notes', updated);
      if (typeof Notes !== 'undefined') { Notes.notes = updated; if (document.getElementById('notes-container')) Notes._render(); }
      return this._reply(`🗑️ Note supprimée : <b>${removed.title}</b>`);
    }
    this._reply(`Que souhaitez-vous supprimer ? Précisez : séance, dépense, événement, note.`);
  },

  /* ── NUTRITION ── */
  _execNutrition(text, t) {
    if (/(eau|verre|litre|bois|hydratation)/.test(t)) {
      const qty = this._extractAmount(text) || 1;
      const water = Store.get('nutrition_water', []);
      water.push({ id: uid(), date: DateUtils.today(), amount: qty });
      Store.set('nutrition_water', water);
      if (typeof Nutrition !== 'undefined' && document.getElementById('nutrition-container')) Nutrition._render();
      Toast.success('Eau enregistrée 💧');
      return this._reply(`💧 ${qty > 1 ? qty + ' verres' : 'Verre'} d'eau enregistré${qty > 1 ? 's' : ''} !`);
    }

    const mealTypes = { 'petit.dej': 'Petit-déjeuner', 'matin': 'Petit-déjeuner', 'dejeuner': 'Déjeuner', 'midi': 'Déjeuner', 'diner': 'Dîner', 'soir': 'Dîner', 'collation': 'Collation', 'snack': 'Collation' };
    const typeKey = Object.keys(mealTypes).find(k => t.includes(k));
    const mealType = typeKey ? mealTypes[typeKey] : 'Déjeuner';

    const food = Nutrition?.FOOD_DB?.find(f => t.includes(f.name.toLowerCase().slice(0, 6).normalize('NFD').replace(/[̀-ͯ]/g, '')));

    let foodName = text.replace(/^(j'ai mange|j'ai bu|ajoute|mange|manger)\s*/i, '').replace(/\s*(au|a|pour|ce|le)\s+(petit.dej|dejeuner|diner|collation|matin|midi|soir)/i, '').trim() || 'Aliment';
    foodName = foodName.charAt(0).toUpperCase() + foodName.slice(1);

    const meal = {
      id: uid(),
      foodName: food ? food.name : foodName,
      calories: food ? food.cal : this._extractAmount(text) || 0,
      protein:  food ? food.p : 0,
      carbs:    food ? food.c : 0,
      fat:      food ? food.f : 0,
      mealType,
      date: DateUtils.today(),
      createdAt: DateUtils.now(),
    };

    const meals = Store.get('nutrition_meals', []);
    meals.push(meal);
    Store.set('nutrition_meals', meals);
    if (typeof Nutrition !== 'undefined' && document.getElementById('nutrition-container')) Nutrition._render();

    Toast.success(`${meal.foodName} ajouté`);
    this._reply(`🍽️ <b>${meal.foodName}</b> ajouté au ${mealType}${meal.calories ? ` (${meal.calories} kcal)` : ''}`);
  },

  /* ── NOTE ── */
  _execNote(text) {
    const raw = text.replace(/^(crée|créé|ajoute|ajouter|nouvelle?|écris|rédige|prends?|prendre)\s+(une? )?(note|mémo|memo|pense.bete|remarque)\s*/i, '').trim();
    // Si le contenu contient ":" ou "-", sépare titre et contenu
    let title = raw, content = '';
    const sep = raw.match(/^([^:–\-]+)[\s]*[:–\-][\s]*(.+)$/s);
    if (sep) { title = sep[1].trim(); content = sep[2].trim(); }

    const note = {
      id: uid(),
      title: (title || 'Nouvelle note').charAt(0).toUpperCase() + (title || 'nouvelle note').slice(1),
      content,
      category: 'personnel',
      createdAt: DateUtils.now(),
      updatedAt: DateUtils.now(),
    };
    const notes = Store.get('notes', []);
    notes.unshift(note);
    Store.set('notes', notes);
    if (typeof Notes !== 'undefined') { Notes.notes = notes; Notes.activeId = note.id; if (document.getElementById('notes-container')) Notes._render(); }
    Router.navigate('notes');
    Toast.success(`Note "${note.title}" créée`);
    this._reply(`📝 Note créée : <b>${note.title}</b>${content ? `<br><small>${content.slice(0, 60)}…</small>` : ''}`);
    setTimeout(() => this.hide(), 500);
  },

  /* ── CONTACT ── */
  _execContact(text) {
    const phoneMatch = text.match(/(\+?\d[\d\s.\-]{7,14}\d)/);
    const phone = phoneMatch ? phoneMatch[1].replace(/\s/g, '') : '';

    let name = text
      .replace(/^(ajoute|crée|créé|nouveau|nouvelle?|enregistre)\s+(un |une )?(contact|ami|personne|collegue|numero)?\s*/i, '')
      .replace(/\s+(au repertoire|dans mes contacts)$/i, '')
      .replace(phoneMatch?.[0] || '', '')
      .trim() || 'Nouveau contact';

    // Extrait email si présent
    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    const email = emailMatch ? emailMatch[0] : '';
    if (email) name = name.replace(email, '').trim();

    const contact = {
      id: uid(),
      name: name.charAt(0).toUpperCase() + name.slice(1),
      group: 'autre', phone, email, company: '', role: '',
      website: '', birthday: '', address: '', notes: '',
      createdAt: DateUtils.now(),
    };

    const contacts = Store.get('contacts', []);
    contacts.push(contact);
    Store.set('contacts', contacts);
    if (typeof Contacts !== 'undefined') { Contacts.contacts = contacts; if (document.getElementById('contacts-container')) Contacts._render(); }

    Toast.success(`Contact "${contact.name}" ajouté`);
    this._reply(`👤 Contact ajouté : <b>${contact.name}</b>${phone ? `<br><small>📞 ${phone}</small>` : ''}${email ? `<br><small>✉️ ${email}</small>` : ''}<br><small style="opacity:.6">Ouvrez Contacts pour compléter le profil.</small>`);
  },

  /* ── POMODORO ── */
  _execPomodoro(t) {
    const isRunning = typeof Pomodoro !== 'undefined' && Pomodoro.state?.running;

    if (/(pause|stop|arrete|stoppe)/.test(t)) {
      if (isRunning) { Pomodoro._pause(); return this._reply(`⏸ Pomodoro mis en pause.`); }
      return this._reply(`Le timer n'est pas en cours.`);
    }
    if (/(reset|reinitialise|remet a zero)/.test(t)) {
      if (typeof Pomodoro !== 'undefined') Pomodoro._reset();
      return this._reply(`🔄 Timer réinitialisé.`);
    }

    Router.navigate('pomodoro');
    if (typeof Pomodoro !== 'undefined' && !isRunning) {
      setTimeout(() => Pomodoro._start(), 400);
      this._reply(`▶️ Pomodoro démarré ! Bonne session de travail 🎯`);
    } else {
      this._reply(`▶️ Pomodoro ouvert. Cliquez sur play pour démarrer.`);
    }
    setTimeout(() => this.hide(), 700);
  },

  /* ── PROCHAINS ÉVÉNEMENTS ── */
  _execNextEvents() {
    const today = DateUtils.today();
    const upcoming = Store.get('agenda_events', [])
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
    if (!upcoming.length) return this._reply(`📅 Aucun événement à venir dans votre agenda.`);
    const list = upcoming.map(e => {
      const d = new Date(e.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
      return `<span style="color:var(--text-muted);font-size:.8em">${d}</span> — <b>${e.title}</b>${e.time ? ' à ' + e.time : ''}`;
    }).join('<br>');
    this._reply(`📅 Prochains événements :<br><br>${list}`);
  },

  /* ── RÉSUMÉ DU JOUR ── */
  _execDaySummary() {
    const today = DateUtils.today();
    const evts   = Store.get('agenda_events', []).filter(e => e.date === today);
    const txs    = Store.get('transactions', []);
    const balance = txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    const notes  = Store.get('notes', []);
    const sessions = Store.get('workout_sessions', []);
    const water  = Store.get('nutrition_water', []).filter(w => w.date === today).length;
    const thisWeekSessions = sessions.filter(s => new Date() - new Date(s.date) < 7 * 24 * 3600 * 1000).length;
    const month = new Date().toISOString().slice(0, 7);
    const monthExpenses = txs.filter(t => t.type === 'expense' && t.date?.startsWith(month)).reduce((s,t)=>s+t.amount,0);

    this._reply(`📊 <b>Résumé NEXUS — ${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</b><br><br>
      📅 Aujourd'hui : <b>${evts.length} événement${evts.length>1?'s':''}</b>${evts.length ? ' — ' + evts.slice(0,2).map(e=>e.title).join(', ') : ''}<br>
      💪 Séances cette semaine : <b>${thisWeekSessions}</b> · Total : <b>${sessions.length}</b><br>
      💰 Solde : <b>${this._fmt(balance)}</b> · Dépenses ce mois : <b>${this._fmt(monthExpenses)}</b><br>
      📝 Notes : <b>${notes.length}</b><br>
      💧 Eau aujourd'hui : <b>${water} verre${water>1?'s':''}</b>`);
  },

  /* ── COMPTAGES ── */
  _execCountEvents() {
    const evts = Store.get('agenda_events', []);
    const upcoming = evts.filter(e => e.date >= DateUtils.today()).length;
    this._reply(`📅 <b>${evts.length}</b> événement(s) au total, dont <b>${upcoming}</b> à venir.`);
  },
  _execCountNotes() {
    this._reply(`📝 <b>${Store.get('notes',[]).length}</b> note(s) enregistrée(s).`);
  },
  _execCountTransactions() {
    const txs = Store.get('transactions', []);
    const month = new Date().toISOString().slice(0,7);
    const thisMonth = txs.filter(t => t.date?.startsWith(month));
    const dep = thisMonth.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    this._reply(`💳 Ce mois-ci : <b>${thisMonth.length}</b> transaction(s), <b>-${this._fmt(dep)}</b> de dépenses.`);
  },
  _execCountWorkouts() {
    const sessions = Store.get('workout_sessions', []);
    const thisWeek = sessions.filter(s => new Date() - new Date(s.date) < 7*24*3600*1000).length;
    this._reply(`💪 <b>${sessions.length}</b> séance(s) au total, dont <b>${thisWeek}</b> cette semaine.`);
  },

  /* ── AIDE ── */
  replyHelp() { this._replyHelp(); },
  _replyHelp() {
    this._reply(`Voici tout ce que je peux faire :<br><br>
      <b>💪 Musculation</b><br>
      "séance pecs dos avec développé couché, rowing barre"<br>
      "j'ai fait une séance jambes avec squat 4x8 100kg, presse 3x12"<br>
      "séance cardio 45min aujourd'hui"<br><br>
      <b>📅 Agenda</b><br>
      "rdv médecin demain 14h30" · "réunion lundi 9h"<br>
      "anniversaire Marie le 15 juin" · "prochains événements"<br><br>
      <b>💰 Finances</b><br>
      "dépense 25€ restaurant" · "j'ai payé 50€ courses"<br>
      "revenu 2000€ salaire" · "budget alimentation 400€"<br>
      "quel est mon solde"<br><br>
      <b>🍎 Nutrition</b><br>
      "j'ai mangé du poulet au déjeuner" · "ajoute un verre d'eau"<br>
      "banana au petit-déj" · "dîner riz saumon"<br><br>
      <b>📝 Notes</b><br>
      "note idée : aller courir demain matin"<br>
      "nouvelle note réunion"<br><br>
      <b>👤 Contacts</b><br>
      "ajoute contact Jean Dupont 0612345678"<br>
      "contact Marie martin@mail.com"<br><br>
      <b>⏱ Pomodoro</b><br>
      "démarre le pomodoro" · "pause timer" · "reset chrono"<br><br>
      <b>🗑️ Suppression</b><br>
      "supprime la dernière séance / dépense / note / événement"<br><br>
      <b>📦 Transfert</b><br>
      "exporte mes données" · "sauvegarde" · "transfère vers mon PC"<br><br>
      <b>🧭 Navigation</b><br>
      "va sur agenda / finances / musculation / nutrition…"<br><br>
      <b>📊 Infos</b><br>
      "résumé du jour" · "combien de séances" · "prochains événements"<br><br>
      <small>Raccourci : <kbd>Ctrl+J</kbd> · Vocal : bouton 🎤</small>`);
  },

  /* ── FALLBACK ── */
  _replyFallback(text, t) {
    if (/\d+.*€|€.*\d+|\d+.*euro/.test(t)) {
      return this._reply(`Je vois un montant. Voulez-vous :<br>• "dépense de X€ [catégorie]"<br>• "revenu de X€" ?`);
    }
    if (/(demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d+ (mai|juin|juillet))/.test(t)) {
      return this._reply(`Je vois une date. Voulez-vous créer un <b>événement</b> ? Ex : "réunion demain 14h".`);
    }
    if (/(pecs?|dos|jambes?|epaules?|biceps?|triceps?|abdos?|cardio)/.test(t)) {
      return this._reply(`Je vois un groupe musculaire. Voulez-vous créer une <b>séance</b> ? Ex : "séance pecs avec développé couché".`);
    }
    const r = [
      `Je n'ai pas saisi. Dites "aide" pour voir tout ce que je fais, ou reformulez.`,
      `Hmm, pas sûr de comprendre. Essayez : "séance pecs dos avec développé couché", "dépense 20€ restaurant", "rdv médecin demain"…`,
      `Je suis spécialisé dans NEXUS. Dites "aide" pour voir mes capacités.`,
    ];
    this._reply(r[~~(Math.random() * r.length)]);
  },

  /* ════════════════════════════════════════
     PARSEURS — MUSCULATION
  ════════════════════════════════════════ */

  _extractMuscleGroups(t) {
    const found = [];
    for (const [key, val] of Object.entries(this.MUSCLE_MAP)) {
      const k = key.normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (t.includes(k) && !found.includes(val)) found.push(val);
    }
    return found.length ? found : ['fullbody'];
  },

  /* Extrait les exercices depuis "avec exercice1, exercice2 et exercice3"
     Supporte aussi le format "exercice NxM Pkg" par exercice */
  _extractExercises(text, t) {
    // Cherche tout ce qui vient après "avec"
    const avecReg = /\bave[ck]\s+(.+?)(?:\s+(?:aujourd'?hui|demain|le \d|ce matin|ce soir|\d+\s*min|\d+h\d*).*)?$/i;
    const m = text.match(avecReg);
    if (!m) return null;

    let exerciseStr = m[1].trim();
    // Retire les groupes musculaires qui seraient là par erreur
    for (const key of Object.keys(this.MUSCLE_MAP)) {
      const k = key.normalize('NFD').replace(/[̀-ͯ]/g, '');
      exerciseStr = exerciseStr.replace(new RegExp(`\\b${k}\\b`, 'gi'), '').trim();
    }
    // Retire "et du/de la/des" résidus
    exerciseStr = exerciseStr.replace(/\bdu\b|\bde la\b|\bdes\b|\bde\b/gi, ' ').trim();

    // Sépare par virgule, " et ", " + "
    const parts = exerciseStr.split(/,\s*|\s+et\s+|\s*\+\s*/).map(s => s.trim()).filter(s => s.length > 2);
    if (!parts.length) return null;

    return parts.map(raw => {
      const sets   = this._parseSets(raw);
      const reps   = this._parseReps(raw);
      const weight = this._parseWeight(raw);
      // Nettoie le nom : retire "3x10", "80kg", "3 séries de 10"
      let name = raw
        .replace(/\d+\s*[x×]\s*\d+/gi, '')
        .replace(/\d+(?:[.,]\d+)?\s*kg/gi, '')
        .replace(/\d+\s*(?:series?|séries?|reps?|répétitions?)/gi, '')
        .replace(/\s+de\s+\d+/gi, '')
        .trim();
      name = name.charAt(0).toUpperCase() + name.slice(1);
      if (!name || name.length < 2) return null;
      return { name, sets: sets || 3, reps: reps || 10, weight: weight || 0 };
    }).filter(Boolean);
  },

  _parseSets(s) {
    const m = s.match(/(\d+)\s*[x×]\s*\d+/) || s.match(/(\d+)\s*(?:series?|séries?)/i);
    return m ? parseInt(m[1]) : null;
  },

  _parseReps(s) {
    const m = s.match(/\d+\s*[x×]\s*(\d+)/) || s.match(/(\d+)\s*(?:reps?|répétitions?)/i);
    return m ? parseInt(m[1]) : null;
  },

  _parseWeight(s) {
    const m = s.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  },

  _extractDuration(text) {
    // "1h30" → 90, "45min" → 45, "1h" → 60
    const hm = text.match(/(\d+)h(\d+)?/i);
    if (hm) return parseInt(hm[1]) * 60 + (hm[2] ? parseInt(hm[2]) : 0);
    const min = text.match(/(\d+)\s*min/i);
    if (min) return parseInt(min[1]);
    return null;
  },

  /* ════════════════════════════════════════
     PARSEURS — GÉNÉRIQUES
  ════════════════════════════════════════ */

  _extractAmount(text) {
    const m = text.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:euros?|€)/i)
           || text.match(/(?:de|d'|=)\s*(\d+(?:[.,]\d{1,2})?)/i)
           || text.match(/(\d+(?:[.,]\d{1,2})?)/);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  },

  _extractFinanceCat(text) {
    const t = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    const k = Object.keys(this.FINANCE_CATS).find(k => t.includes(k.normalize('NFD').replace(/[̀-ͯ]/g,'')));
    return k ? this.FINANCE_CATS[k] : 'autre';
  },

  _extractExpenseDesc(text, amount) {
    // Retire les mots-clés et le montant pour isoler la description
    let desc = text
      .replace(/^(ajoute|cree|créé|nouvelle?|enregistre|j'ai paye|j'ai achete|j'ai depense|j'ai claque|depense|achat|paye)\s*/i, '')
      .replace(new RegExp(`${amount}\\s*(?:euros?|€)?`, 'gi'), '')
      .replace(/\s*(de|d'|pour|en|au|a|à)\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!desc || desc.length < 2) return null;
    return desc.charAt(0).toUpperCase() + desc.slice(1);
  },

  _extractDate(text) {
    const t = text.toLowerCase();
    const today = new Date();
    if (/aujourd'?hui|maintenant/.test(t)) return DateUtils.today();
    if (/demain/.test(t)) { const d=new Date(today); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); }
    if (/apres.demain|après.demain/.test(t)) { const d=new Date(today); d.setDate(d.getDate()+2); return d.toISOString().slice(0,10); }
    if (/semaine prochaine/.test(t)) { const d=new Date(today); d.setDate(d.getDate()+7); return d.toISOString().slice(0,10); }
    for (const [name, num] of Object.entries(this.DAY_MAP)) {
      if (t.includes(name)) {
        const d = new Date(today);
        let diff = num - d.getDay(); if (diff <= 0) diff += 7;
        d.setDate(d.getDate() + diff);
        return d.toISOString().slice(0,10);
      }
    }
    const patterns = [
      /le\s+(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)/i,
      /(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)/i,
      /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/,
    ];
    for (const pat of patterns) {
      const m = t.normalize('NFD').replace(/[̀-ͯ]/g,'').match(pat);
      if (m) {
        if (m[2] && isNaN(m[2])) {
          const monthNum = Object.entries(this.MONTH_MAP).find(([k]) => m[2].startsWith(k))?.[1];
          if (monthNum) {
            const year = today.getFullYear() + (monthNum < today.getMonth()+1 ? 1 : 0);
            return `${year}-${String(monthNum).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
          }
        } else if (m[2]) {
          const year = m[3] ? (m[3].length===2?'20'+m[3]:m[3]) : today.getFullYear();
          return `${year}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
        }
      }
    }
    return null;
  },

  _extractTime(text) {
    const m = text.match(/\b(\d{1,2})[h:](\d{2})?\b/i);
    if (!m) return '';
    return `${String(m[1]).padStart(2,'0')}:${m[2] || '00'}`;
  },

  _formatDateLabel(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
  },

  _fmt(n) {
    return typeof fmtCurrency === 'function' ? fmtCurrency(n) : n.toFixed(2) + ' €';
  },

  /* ════════════════════════════════════════
     RECONNAISSANCE VOCALE
  ════════════════════════════════════════ */
  _initSpeech() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    this.recognition = new SR();
    this.recognition.lang = 'fr-FR';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onstart = () => {
      this.listening = true;
      this._setStatus('Écoute…');
      document.getElementById('assistant-mic')?.classList.add('listening');
    };
    this.recognition.onresult = e => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      const input = document.getElementById('assistant-input');
      if (input) input.value = t;
      if (e.results[e.results.length-1].isFinal) this._setStatus('Traitement…');
    };
    this.recognition.onerror = e => {
      this._stopVoice();
      if (e.error !== 'no-speech') this._reply(`Erreur micro : ${e.error}. Vérifiez les permissions.`);
      else this._setStatus('Prêt');
    };
    this.recognition.onend = () => {
      this._stopVoice();
      const input = document.getElementById('assistant-input');
      if (input?.value?.trim()) this._submit();
    };
  },

  _toggleVoice() {
    if (!this.recognition) return this._reply('Reconnaissance vocale non disponible. Utilisez Chrome.');
    if (this.listening) { this._stopVoice(); return; }
    try { this.recognition.start(); } catch(e) {}
  },

  _stopVoice() {
    this.listening = false;
    try { this.recognition?.stop(); } catch(e) {}
    document.getElementById('assistant-mic')?.classList.remove('listening');
    this._setStatus('Prêt');
  },
};
