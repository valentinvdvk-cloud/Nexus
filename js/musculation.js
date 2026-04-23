/* ═══════════════════════════════════════════════════════════
   NEXUS APP — musculation.js
   Workout sessions · Exercises · Stats · PRs
═══════════════════════════════════════════════════════════ */

const Musculation = {
  MUSCLE_GROUPS: [
    { key: 'pectoraux',  label: 'Pectoraux',  emoji: '🫁', templates: ['Développé couché', 'Écarté haltères', 'Dips', 'Pompes lestées', 'Câbles croisés'] },
    { key: 'dos',        label: 'Dos',         emoji: '🔙', templates: ['Tractions', 'Rowing barre', 'Tirage poitrine', 'Rowing haltère', 'Soulevé de terre'] },
    { key: 'jambes',     label: 'Jambes',      emoji: '🦵', templates: ['Squat barre', 'Presse à cuisses', 'Fentes', 'Leg curl', 'Extension cuisses'] },
    { key: 'epaules',    label: 'Épaules',     emoji: '🦾', templates: ['Développé militaire', 'Élévations latérales', 'Élévations frontales', 'Oiseau', 'Shrugs'] },
    { key: 'biceps',     label: 'Biceps',      emoji: '💪', templates: ['Curl barre', 'Curl haltères', 'Curl concentré', 'Curl marteau', 'Curl câble'] },
    { key: 'triceps',    label: 'Triceps',     emoji: '💪', templates: ['Dips triceps', 'Extension poulie', 'Barre front', 'Kickback', 'Pushdown'] },
    { key: 'abdos',      label: 'Abdos',       emoji: '🎯', templates: ['Crunchs', 'Planche', 'Relevé de jambes', 'Bicycle', 'Gainage latéral'] },
    { key: 'fullbody',   label: 'Full Body',   emoji: '⚡', templates: ['Burpees', 'Kettlebell swing', 'Thruster', 'Clean & press', 'Turkish get-up'] },
    { key: 'cardio',     label: 'Cardio',      emoji: '🏃', templates: ['Course à pied', 'Vélo', 'Elliptique', 'Rameur', 'Corde à sauter'] },
  ],

  sessions: [],
  editId: null,
  step: 1,
  currentExercises: [],

  init() {
    this.sessions = Store.get('workout_sessions', []);
    this._render();
    Bus.on('moduleActivated', ({ module }) => { if (module === 'musculation') this._render(); });
  },

  _render() {
    const c = document.getElementById('muscu-container');
    if (!c) return;
    this.sessions = Store.get('workout_sessions', []);
    const sorted = [...this.sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const streak = this._calcStreak();
    const thisWeek = this._sessionsThisWeek();
    const totalVol = this.sessions.reduce((s, se) => s + this._sessionVolume(se), 0);

    c.innerHTML = `
      <div class="muscu-header anim-fade-up">
        <div class="muscu-stats-bar">
          <div class="muscu-stat">
            <span class="muscu-stat-val">${streak}🔥</span>
            <span class="muscu-stat-label">Streak</span>
          </div>
          <div class="muscu-stat">
            <span class="muscu-stat-val">${this.sessions.length}</span>
            <span class="muscu-stat-label">Séances</span>
          </div>
          <div class="muscu-stat">
            <span class="muscu-stat-val">${thisWeek}</span>
            <span class="muscu-stat-label">Cette semaine</span>
          </div>
          <div class="muscu-stat">
            <span class="muscu-stat-val">${this._fmtVol(totalVol)}</span>
            <span class="muscu-stat-label">Volume total</span>
          </div>
        </div>
        <button class="btn btn-primary" id="btn-new-session">
          ${Icons.plus} Nouvelle séance
        </button>
      </div>

      ${this._renderHeatmap()}

      <div class="section-header">
        <h3 class="section-title">Séances (${sorted.length})</h3>
        <div class="section-actions">
          <select class="form-select form-select-sm" id="muscu-filter">
            <option value="">Tous les groupes</option>
            ${this.MUSCLE_GROUPS.map(g => `<option value="${g.key}">${g.emoji} ${g.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div id="sessions-list" class="sessions-list">
        ${sorted.length ? sorted.map(s => this._renderSessionCard(s)).join('') : '<p class="empty-state">Aucune séance. Lance toi ! 💪</p>'}
      </div>

      ${this._renderSessionModal()}
    `;

    document.getElementById('btn-new-session')?.addEventListener('click', () => this._openModal());
    document.getElementById('muscu-filter')?.addEventListener('change', e => this._filterSessions(e.target.value));
    this._bindSessionCards();
    this._bindModal();
  },

  _renderHeatmap() {
    const data = {};
    this.sessions.forEach(s => { const d = s.date?.slice(0, 10); if (d) data[d] = (data[d] || 0) + 1; });
    return `
      <div class="widget anim-fade-up stagger-1" style="margin-bottom:1.5rem">
        <div class="widget-header"><span class="widget-title">Activité (17 semaines)</span></div>
        <div id="muscu-heatmap" style="overflow-x:auto;padding:4px 0"></div>
      </div>
    `;
  },

  _renderSessionCard(s) {
    const mg = this.MUSCLE_GROUPS.find(g => g.key === s.muscleGroup);
    const vol = this._sessionVolume(s);
    const sets = s.exercises?.reduce((sum, e) => sum + (parseInt(e.sets) || 0), 0) || 0;
    return `
      <div class="workout-session-card hover-lift anim-fade-up" data-id="${s.id}">
        <div class="wsc-header">
          <div class="wsc-group">
            <span class="wsc-emoji">${mg?.emoji || '🏋️'}</span>
            <div>
              <span class="wsc-group-name">${mg?.label || s.muscleGroup || 'Séance'}</span>
              <span class="wsc-date">${DateUtils.format(s.date)}</span>
            </div>
          </div>
          <div class="wsc-meta">
            <span class="badge badge-purple">${fmtDuration(s.duration || 0)}</span>
            <span class="badge badge-outline">${vol > 0 ? this._fmtVol(vol) : sets + ' séries'}</span>
            <button class="btn-icon btn-icon-sm wsc-expand" data-id="${s.id}" data-tip="Détails">${Icons.chevronDown}</button>
            <button class="btn-icon btn-icon-sm btn-danger-ghost wsc-delete" data-id="${s.id}" data-tip="Supprimer">${Icons.trash}</button>
          </div>
        </div>
        <div class="wsc-exercises hidden" id="wsc-detail-${s.id}">
          ${s.notes ? `<p class="wsc-notes">${s.notes}</p>` : ''}
          ${s.exercises?.length ? `
            <div class="exercise-table">
              <div class="exercise-table-head">
                <span>Exercice</span><span>Séries</span><span>Reps</span><span>Poids</span><span>Volume</span>
              </div>
              ${s.exercises.map(ex => {
                const exVol = (parseInt(ex.sets) || 0) * (parseInt(ex.reps) || 0) * (parseFloat(ex.weight) || 0);
                const isPR = this._isPR(ex.name, ex.weight, s.id);
                return `
                  <div class="exercise-table-row">
                    <span class="ex-name">${ex.name}${isPR ? ' <span class="badge badge-gold badge-sm">PR 🏆</span>' : ''}</span>
                    <span>${ex.sets}</span>
                    <span>${ex.reps}</span>
                    <span>${ex.weight ? ex.weight + ' kg' : '—'}</span>
                    <span>${exVol > 0 ? this._fmtVol(exVol) : '—'}</span>
                  </div>
                `;
              }).join('')}
            </div>
          ` : '<p class="text-muted">Aucun exercice enregistré.</p>'}
        </div>
      </div>
    `;
  },

  _renderSessionModal() {
    return `
      <div id="session-modal" class="modal hidden">
        <div class="modal-box modal-lg anim-scale-in">
          <div class="modal-header">
            <h3 class="modal-title" id="session-modal-title">Nouvelle séance</h3>
            <button class="btn-icon" id="session-modal-close">${Icons.close}</button>
          </div>
          <div class="modal-body">
            <!-- Step 1: Group selection -->
            <div id="session-step-1">
              <p class="form-hint" style="margin-bottom:1rem">Choisis le groupe musculaire :</p>
              <div class="muscle-group-grid" id="muscle-group-grid">
                ${this.MUSCLE_GROUPS.map(g => `
                  <button class="muscle-chip" data-group="${g.key}">
                    <span class="muscle-chip-emoji">${g.emoji}</span>
                    <span class="muscle-chip-label">${g.label}</span>
                  </button>
                `).join('')}
              </div>
              <div class="form-row" style="margin-top:1.5rem">
                <div class="form-group">
                  <label class="form-label">Date</label>
                  <input type="date" id="session-date" class="form-input" value="${DateUtils.today()}"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Durée (min)</label>
                  <input type="number" id="session-duration" class="form-input" placeholder="60" min="1" max="360"/>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Notes (optionnel)</label>
                <textarea id="session-notes" class="form-textarea" rows="2" placeholder="Ressenti, observations…"></textarea>
              </div>
              <div style="display:flex;justify-content:flex-end;margin-top:1rem">
                <button class="btn btn-primary" id="session-step-next">Exercices →</button>
              </div>
            </div>

            <!-- Step 2: Exercises -->
            <div id="session-step-2" class="hidden">
              <div class="session-step2-header">
                <button class="btn btn-ghost btn-sm" id="session-step-back">← Retour</button>
                <span id="session-group-label" class="badge badge-purple"></span>
              </div>
              <p class="form-hint" style="margin:0.75rem 0">Suggestions : <span id="exercise-suggestions"></span></p>
              <div id="exercise-rows"></div>
              <button class="btn btn-outline btn-sm" id="btn-add-exercise" style="margin-top:0.75rem">
                ${Icons.plus} Ajouter un exercice
              </button>
              <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.5rem">
                <button class="btn btn-ghost" id="btn-cancel-session">Annuler</button>
                <button class="btn btn-outline" id="btn-active-session">⚡ Mode Actif</button>
                <button class="btn btn-primary" id="btn-save-session">Terminer la séance ✓</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _bindModal() {
    document.getElementById('session-modal-close')?.addEventListener('click', () => this._closeModal());
    document.getElementById('session-modal')?.addEventListener('click', e => {
      if (e.target.id === 'session-modal') this._closeModal();
    });

    document.getElementById('muscle-group-grid')?.addEventListener('click', e => {
      const chip = e.target.closest('.muscle-chip');
      if (!chip) return;
      document.querySelectorAll('.muscle-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });

    document.getElementById('session-step-next')?.addEventListener('click', () => {
      const activeChip = document.querySelector('.muscle-chip.active');
      if (!activeChip) { Toast.warning('Choisis un groupe musculaire'); return; }
      this._goToStep2(activeChip.dataset.group);
    });

    document.getElementById('session-step-back')?.addEventListener('click', () => {
      document.getElementById('session-step-1').classList.remove('hidden');
      document.getElementById('session-step-2').classList.add('hidden');
    });

    document.getElementById('btn-add-exercise')?.addEventListener('click', () => this._addExerciseRow());
    document.getElementById('btn-save-session')?.addEventListener('click', () => this._saveSession());
    document.getElementById('btn-cancel-session')?.addEventListener('click', () => this._closeModal());
    document.getElementById('btn-active-session')?.addEventListener('click', () => this._launchActiveMode());
  },

  _goToStep2(groupKey) {
    const group = this.MUSCLE_GROUPS.find(g => g.key === groupKey);
    document.getElementById('session-step-1').classList.add('hidden');
    document.getElementById('session-step-2').classList.remove('hidden');
    const labelEl = document.getElementById('session-group-label');
    if (labelEl) labelEl.textContent = `${group?.emoji} ${group?.label}`;
    const suggestEl = document.getElementById('exercise-suggestions');
    if (suggestEl && group?.templates) {
      suggestEl.innerHTML = group.templates.map(t =>
        `<span class="suggestion-chip" data-name="${t}">${t}</span>`
      ).join('');
      suggestEl.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const rows = document.getElementById('exercise-rows');
          if (rows) {
            const nameInput = rows.querySelector('.exercise-row:last-child .ex-name-input');
            if (nameInput && !nameInput.value) nameInput.value = chip.dataset.name;
            else this._addExerciseRow(chip.dataset.name);
          }
        });
      });
    }
    const rows = document.getElementById('exercise-rows');
    if (rows && !rows.children.length) this._addExerciseRow();
  },

  _addExerciseRow(name = '') {
    const rows = document.getElementById('exercise-rows');
    if (!rows) return;
    const div = document.createElement('div');
    div.className = 'exercise-row';
    div.innerHTML = `
      <input type="text" class="form-input ex-name-input" placeholder="Exercice" value="${name}"/>
      <input type="number" class="form-input ex-sets-input" placeholder="Séries" min="1" max="20" value="3"/>
      <input type="number" class="form-input ex-reps-input" placeholder="Reps" min="1" max="100" value="10"/>
      <input type="number" class="form-input ex-weight-input" placeholder="Kg" min="0" step="0.5"/>
      <button class="btn-icon btn-icon-sm btn-danger-ghost ex-delete-btn">${Icons.trash}</button>
    `;
    div.querySelector('.ex-delete-btn').addEventListener('click', () => div.remove());
    rows.appendChild(div);
    div.querySelector('.ex-name-input')?.focus();
  },

  _saveSession() {
    const activeChip = document.querySelector('.muscle-chip.active');
    const groupKey = activeChip?.dataset.group || 'fullbody';
    const date = document.getElementById('session-date')?.value || DateUtils.today();
    const duration = parseInt(document.getElementById('session-duration')?.value) || 0;
    const notes = document.getElementById('session-notes')?.value || '';
    const exercises = [];

    document.querySelectorAll('#exercise-rows .exercise-row').forEach(row => {
      const name = row.querySelector('.ex-name-input')?.value?.trim();
      if (!name) return;
      exercises.push({
        name,
        sets: parseInt(row.querySelector('.ex-sets-input')?.value) || 0,
        reps: parseInt(row.querySelector('.ex-reps-input')?.value) || 0,
        weight: parseFloat(row.querySelector('.ex-weight-input')?.value) || 0,
      });
    });

    const session = {
      id: this.editId || uid(),
      date, duration, notes, exercises,
      muscleGroup: groupKey,
      createdAt: DateUtils.now(),
    };

    const idx = this.sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) this.sessions[idx] = session;
    else this.sessions.push(session);

    Store.set('workout_sessions', this.sessions);
    this._closeModal();
    this._render();
    Toast.success('Séance enregistrée !');
    Notifications.add(`Séance ${this.MUSCLE_GROUPS.find(g => g.key === groupKey)?.label || ''} ajoutée`, 'success');
    if (this._calcStreak() >= 3) Confetti.burst();
  },

  _closeModal() {
    Modal.close('session-modal');
    this.editId = null;
    const rows = document.getElementById('exercise-rows');
    if (rows) rows.innerHTML = '';
    document.getElementById('session-step-1')?.classList.remove('hidden');
    document.getElementById('session-step-2')?.classList.add('hidden');
    document.querySelectorAll('.muscle-chip').forEach(c => c.classList.remove('active'));
  },

  _openModal(id = null) {
    this.editId = id;
    if (id) {
      const s = this.sessions.find(s => s.id === id);
      if (s) {
        document.getElementById('session-date').value = s.date;
        document.getElementById('session-duration').value = s.duration || '';
        document.getElementById('session-notes').value = s.notes || '';
        const chip = document.querySelector(`.muscle-chip[data-group="${s.muscleGroup}"]`);
        if (chip) { document.querySelectorAll('.muscle-chip').forEach(c => c.classList.remove('active')); chip.classList.add('active'); }
      }
    }
    Modal.open('session-modal');
  },

  _bindSessionCards() {
    /* Expand */
    document.querySelectorAll('.wsc-expand').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const detail = document.getElementById(`wsc-detail-${id}`);
        detail?.classList.toggle('hidden');
        btn.innerHTML = detail?.classList.contains('hidden') ? Icons.chevronDown : Icons.chevronUp;
      });
    });
    /* Delete */
    document.querySelectorAll('.wsc-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm('Supprimer cette séance ?')) return;
        this.sessions = this.sessions.filter(s => s.id !== btn.dataset.id);
        Store.set('workout_sessions', this.sessions);
        this._render();
        Toast.success('Séance supprimée');
      });
    });

    /* Heatmap */
    const heatmapEl = document.getElementById('muscu-heatmap');
    if (heatmapEl) {
      const data = {};
      this.sessions.forEach(s => { const d = s.date?.slice(0, 10); if (d) data[d] = (data[d] || 0) + 1; });
      Charts.heatmap(heatmapEl, data);
    }
  },

  _filterSessions(groupKey) {
    const list = document.getElementById('sessions-list');
    if (!list) return;
    const filtered = groupKey
      ? this.sessions.filter(s => s.muscleGroup === groupKey)
      : this.sessions;
    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    list.innerHTML = sorted.length
      ? sorted.map(s => this._renderSessionCard(s)).join('')
      : '<p class="empty-state">Aucune séance pour ce groupe.</p>';
    this._bindSessionCards();
  },

  _sessionVolume(session) {
    return (session.exercises || []).reduce((sum, ex) =>
      sum + (parseInt(ex.sets) || 0) * (parseInt(ex.reps) || 0) * (parseFloat(ex.weight) || 0), 0
    );
  },

  _fmtVol(kg) {
    if (kg >= 1000) return (kg / 1000).toFixed(1) + ' t';
    return Math.round(kg) + ' kg';
  },

  _calcStreak() {
    const days = [...new Set(this.sessions.map(s => s.date?.slice(0, 10)))].filter(Boolean).sort().reverse();
    let streak = 0, cur = new Date();
    for (const d of days) {
      const day = new Date(d);
      const diff = Math.round((cur - day) / 86400000);
      if (diff <= 1) { streak++; cur = day; } else break;
    }
    return streak;
  },

  _sessionsThisWeek() {
    const weekStart = DateUtils.startOfWeek();
    return this.sessions.filter(s => s.date >= weekStart).length;
  },

  /* ── SÉANCE ACTIVE ── */
  _activeState: null,

  _launchActiveMode() {
    const rows = document.querySelectorAll('#exercise-rows .exercise-row');
    const exercises = [];
    rows.forEach(row => {
      const name = row.querySelector('.ex-name-input')?.value?.trim();
      if (!name) return;
      const sets = parseInt(row.querySelector('.ex-sets-input')?.value) || 3;
      const reps = parseInt(row.querySelector('.ex-reps-input')?.value) || 10;
      const weight = parseFloat(row.querySelector('.ex-weight-input')?.value) || 0;
      exercises.push({ name, sets, reps, weight, done: [] });
    });
    if (!exercises.length) { Toast.warning('Ajoute au moins un exercice'); return; }
    const activeChip = document.querySelector('.muscle-chip.active');
    const groupKey = activeChip?.dataset.group || 'fullbody';
    const group = this.MUSCLE_GROUPS.find(g => g.key === groupKey);
    this._closeModal();
    this._startActiveSession(exercises, group);
  },

  _startActiveSession(exercises, group) {
    this._activeState = {
      exercises,
      group,
      currentIdx: 0,
      startTime: Date.now(),
      timerInterval: null,
      restInterval: null,
    };
    const overlay = document.createElement('div');
    overlay.id = 'seance-active-overlay';
    overlay.className = 'seance-active-overlay';
    overlay.innerHTML = this._buildActiveHTML(exercises, group);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
    this._bindActiveSession();
    this._activeState.timerInterval = setInterval(() => this._tickTimer(), 1000);
    this._renderActiveExercise();
  },

  _buildActiveHTML(exercises, group) {
    return `
      <div class="sa-topbar">
        <div class="sa-topbar-left">
          <span class="sa-group-badge">${group?.emoji || '🏋️'} ${group?.label || 'Séance'}</span>
          <span class="sa-timer" id="sa-timer">00:00</span>
        </div>
        <div class="sa-progress-text" id="sa-progress-text">Exercice 1/${exercises.length}</div>
        <button class="btn btn-danger btn-sm" id="sa-finish-btn">Terminer ✓</button>
      </div>
      <div class="sa-progress-bar"><div class="sa-progress-fill" id="sa-progress-fill" style="width:0%"></div></div>
      <div class="sa-body" id="sa-body"></div>
      <div class="sa-footnav">
        <button class="btn btn-ghost btn-sm" id="sa-prev-btn">← Précédent</button>
        <div class="sa-dots" id="sa-dots">
          ${exercises.map((_, i) => `<span class="sa-dot" data-idx="${i}"></span>`).join('')}
        </div>
        <button class="btn btn-primary btn-sm" id="sa-next-btn">Suivant →</button>
      </div>
    `;
  },

  _renderActiveExercise() {
    const { exercises, currentIdx } = this._activeState;
    const ex = exercises[currentIdx];
    const body = document.getElementById('sa-body');
    if (!body) return;

    const setsArr = Array.from({ length: ex.sets }, (_, i) => ({
      idx: i,
      done: ex.done.includes(i),
    }));

    body.innerHTML = `
      <div class="sa-exercise-name">${ex.name}</div>
      ${ex.weight ? `<div class="sa-exercise-meta">${ex.weight} kg × ${ex.reps} reps</div>` : `<div class="sa-exercise-meta">${ex.reps} reps</div>`}
      <div class="sa-sets-table">
        ${setsArr.map(s => `
          <div class="sa-set-row ${s.done ? 'done' : ''}" data-set="${s.idx}">
            <span class="sa-set-num">Série ${s.idx + 1}</span>
            <span class="sa-set-info">${ex.weight ? ex.weight + ' kg' : ''} × ${ex.reps}</span>
            <button class="sa-set-check ${s.done ? 'checked' : ''}" data-set="${s.idx}">
              ${s.done ? '✓' : '○'}
            </button>
          </div>
        `).join('')}
      </div>
      <div class="sa-rest-timer hidden" id="sa-rest-timer">
        <div class="sa-rest-label">Repos</div>
        <div class="sa-rest-time" id="sa-rest-countdown">60</div>
        <button class="btn btn-ghost btn-sm" id="sa-skip-rest">Passer le repos</button>
      </div>
    `;

    /* dots */
    document.querySelectorAll('.sa-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIdx);
      dot.classList.toggle('done', exercises[i]?.done?.length >= exercises[i]?.sets);
    });

    /* progress */
    const pct = (currentIdx / exercises.length) * 100;
    const fillEl = document.getElementById('sa-progress-fill');
    if (fillEl) fillEl.style.width = pct + '%';
    const progText = document.getElementById('sa-progress-text');
    if (progText) progText.textContent = `Exercice ${currentIdx + 1}/${exercises.length}`;

    /* bind set checks */
    body.querySelectorAll('.sa-set-check').forEach(btn => {
      btn.addEventListener('click', () => {
        const setIdx = parseInt(btn.dataset.set);
        const doneArr = exercises[currentIdx].done;
        if (doneArr.includes(setIdx)) {
          exercises[currentIdx].done = doneArr.filter(x => x !== setIdx);
        } else {
          exercises[currentIdx].done.push(setIdx);
          this._startRestTimer();
        }
        this._renderActiveExercise();
      });
    });
  },

  _startRestTimer(seconds = 60) {
    const restEl = document.getElementById('sa-rest-timer');
    const countEl = document.getElementById('sa-rest-countdown');
    if (!restEl || !countEl) return;
    restEl.classList.remove('hidden');
    let remaining = seconds;
    countEl.textContent = remaining;
    clearInterval(this._activeState.restInterval);
    this._activeState.restInterval = setInterval(() => {
      remaining--;
      if (countEl) countEl.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(this._activeState.restInterval);
        if (restEl) restEl.classList.add('hidden');
        this._playBeep();
      }
    }, 1000);
  },

  _bindActiveSession() {
    document.getElementById('sa-next-btn')?.addEventListener('click', () => {
      const { exercises, currentIdx } = this._activeState;
      if (currentIdx < exercises.length - 1) {
        this._activeState.currentIdx++;
        this._renderActiveExercise();
      } else {
        this._finishActiveSession();
      }
    });
    document.getElementById('sa-prev-btn')?.addEventListener('click', () => {
      if (this._activeState.currentIdx > 0) {
        this._activeState.currentIdx--;
        this._renderActiveExercise();
      }
    });
    document.getElementById('sa-finish-btn')?.addEventListener('click', () => {
      if (confirm('Terminer la séance et l\'enregistrer ?')) this._finishActiveSession();
    });
    document.getElementById('sa-body')?.addEventListener('click', e => {
      if (e.target.id === 'sa-skip-rest') {
        clearInterval(this._activeState.restInterval);
        document.getElementById('sa-rest-timer')?.classList.add('hidden');
      }
    });
  },

  _tickTimer() {
    const el = document.getElementById('sa-timer');
    if (!el || !this._activeState) return;
    const elapsed = Math.floor((Date.now() - this._activeState.startTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    el.textContent = `${m}:${s}`;
  },

  _finishActiveSession() {
    const { exercises, group, startTime } = this._activeState;
    const duration = Math.round((Date.now() - startTime) / 60000);
    clearInterval(this._activeState.timerInterval);
    clearInterval(this._activeState.restInterval);

    const session = {
      id: uid(),
      date: DateUtils.today(),
      muscleGroup: group?.key || 'fullbody',
      duration,
      exercises: exercises.map(ex => ({
        name: ex.name,
        sets: ex.done.length || ex.sets,
        reps: ex.reps,
        weight: ex.weight,
      })),
      notes: `Séance active — ${duration} min`,
      createdAt: DateUtils.now(),
    };

    this.sessions.push(session);
    Store.set('workout_sessions', this.sessions);

    const overlay = document.getElementById('seance-active-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 400);
    }
    this._activeState = null;
    this._render();
    Toast.success(`Séance enregistrée ! (${duration} min)`);
    if (this._calcStreak() >= 3) Confetti.burst();
  },

  _playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } catch {}
  },

  _isPR(exName, weight, currentSessionId) {
    if (!exName || !weight) return false;
    const maxPrev = this.sessions
      .filter(s => s.id !== currentSessionId)
      .flatMap(s => s.exercises || [])
      .filter(e => e.name === exName)
      .reduce((max, e) => Math.max(max, parseFloat(e.weight) || 0), 0);
    return parseFloat(weight) > maxPrev && maxPrev > 0;
  },
};

Bus.on('appReady', () => Musculation.init());
