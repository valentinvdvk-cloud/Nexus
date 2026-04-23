/* ═══════════════════════════════════════════════════════════
   NEXUS APP — pomodoro.js
   Timer · Sessions · Web Audio · Stats
═══════════════════════════════════════════════════════════ */

const Pomodoro = {
  MODES: {
    work:       { label: 'Travail',       duration: 25 * 60, color: '#7C3AED' },
    shortBreak: { label: 'Pause courte',  duration:  5 * 60, color: '#06B6D4' },
    longBreak:  { label: 'Pause longue',  duration: 15 * 60, color: '#10B981' },
  },

  state: {
    mode: 'work',
    running: false,
    remaining: 25 * 60,
    session: 0,
    completedToday: 0,
    totalCompleted: 0,
  },

  settings: {
    work: 25, shortBreak: 5, longBreak: 15,
    longBreakInterval: 4,
    autoStart: false, sound: true, volume: 0.5,
  },

  timer: null,
  audioCtx: null,
  history: [],

  init() {
    this.settings = Store.get('pomodoro_settings', this.settings);
    this.history  = Store.get('pomodoro_history', []);
    this.state.totalCompleted = this.history.length;
    this.state.completedToday = this.history.filter(h => h.date === DateUtils.today()).length;
    this._applySettings();
    this._render();
    Bus.on('moduleActivated', ({ module }) => { if (module === 'pomodoro') this._render(); });
  },

  _applySettings() {
    this.MODES.work.duration       = this.settings.work * 60;
    this.MODES.shortBreak.duration = this.settings.shortBreak * 60;
    this.MODES.longBreak.duration  = this.settings.longBreak * 60;
    if (!this.state.running) {
      this.state.remaining = this.MODES[this.state.mode].duration;
    }
  },

  _render() {
    const c = document.getElementById('pomodoro-container');
    if (!c) return;

    const mode   = this.MODES[this.state.mode];
    const total  = mode.duration;
    const pct    = 1 - this.state.remaining / total;
    const r      = 90;
    const circ   = 2 * Math.PI * r;
    const dash   = pct * circ;
    const mins   = Math.floor(this.state.remaining / 60);
    const secs   = this.state.remaining % 60;
    const label  = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    c.innerHTML = `
      <div class="pomodoro-layout anim-fade-up">
        <div class="pomodoro-main">
          <!-- Mode selector -->
          <div class="pom-mode-tabs">
            ${Object.entries(this.MODES).map(([key, m]) => `
              <button class="pom-mode-tab ${this.state.mode === key ? 'active' : ''}" data-mode="${key}">${m.label}</button>
            `).join('')}
          </div>

          <!-- Ring timer -->
          <div class="pomodoro-svg-wrap">
            <svg viewBox="0 0 220 220" width="220" height="220">
              <circle cx="110" cy="110" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="12"/>
              <circle id="pom-ring-fill" cx="110" cy="110" r="${r}" fill="none" stroke="${mode.color}" stroke-width="12"
                stroke-dasharray="${dash} ${circ - dash}" stroke-linecap="round" transform="rotate(-90 110 110)"
                style="transition:stroke-dasharray ${this.state.running ? '1s' : '0.3s'} linear"/>
            </svg>
            <div class="pomodoro-digits-wrap">
              <div id="pom-digits" class="pomodoro-digits">${label}</div>
              <div class="pom-mode-label">${mode.label}</div>
              <div class="pom-session-label">Session #${this.state.session + 1}</div>
            </div>
          </div>

          <!-- Controls -->
          <div class="pom-controls">
            <button class="pom-btn pom-btn-reset" id="pom-reset" data-tip="Réinitialiser">${Icons.refresh}</button>
            <button class="pom-btn pom-btn-primary ${this.state.running ? 'running' : ''}" id="pom-toggle">
              ${this.state.running ? Icons.pause : Icons.play}
            </button>
            <button class="pom-btn pom-btn-skip" id="pom-skip" data-tip="Passer">${Icons.skipForward}</button>
          </div>

          <!-- Stats row -->
          <div class="pom-stats-row">
            <div class="pom-stat">
              <span class="pom-stat-val">${this.state.completedToday}</span>
              <span class="pom-stat-label">Aujourd'hui</span>
            </div>
            <div class="pom-stat">
              <span class="pom-stat-val">${this.state.totalCompleted}</span>
              <span class="pom-stat-label">Total</span>
            </div>
            <div class="pom-stat">
              <span class="pom-stat-val">${this._calcStreak()}</span>
              <span class="pom-stat-label">Jours streak</span>
            </div>
            <div class="pom-stat">
              <span class="pom-stat-val">${Math.round(this.state.totalCompleted * (this.settings.work || 25))} min</span>
              <span class="pom-stat-label">Temps total</span>
            </div>
          </div>
        </div>

        <div class="pomodoro-sidebar">
          ${this._renderSettingsWidget()}
          ${this._renderHistoryWidget()}
        </div>
      </div>
    `;

    this._bindControls();
  },

  _renderSettingsWidget() {
    return `
      <div class="widget" style="margin-bottom:1.25rem">
        <div class="widget-header"><span class="widget-title">Paramètres</span></div>
        <div class="pom-settings">
          ${[['work','Travail (min)',1,120],['shortBreak','Pause courte (min)',1,30],['longBreak','Pause longue (min)',1,60]].map(([k, label, min, max]) => `
            <div class="pom-setting-row">
              <label class="form-label">${label}</label>
              <input type="number" class="form-input form-input-sm pom-setting-input" data-key="${k}" value="${this.settings[k]}" min="${min}" max="${max}"/>
            </div>
          `).join('')}
          <div class="pom-setting-row">
            <label class="form-label">Pause longue tous les</label>
            <input type="number" class="form-input form-input-sm pom-setting-input" data-key="longBreakInterval" value="${this.settings.longBreakInterval}" min="1" max="10"/>
          </div>
          <label class="toggle-row">
            <span>Son</span>
            <input type="checkbox" class="toggle" id="pom-sound" ${this.settings.sound ? 'checked' : ''}/>
          </label>
          <label class="toggle-row">
            <span>Démarrage auto</span>
            <input type="checkbox" class="toggle" id="pom-autostart" ${this.settings.autoStart ? 'checked' : ''}/>
          </label>
          <button class="btn btn-primary btn-sm" id="btn-apply-pom-settings" style="margin-top:0.5rem">Appliquer</button>
        </div>
      </div>
    `;
  },

  _renderHistoryWidget() {
    const today = this.history.filter(h => h.date === DateUtils.today());
    const recent = [...this.history].reverse().slice(0, 10);
    return `
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">Historique</span>
          <span class="text-muted">${today.length} aujourd'hui</span>
        </div>
        <div class="pom-history-list">
          ${recent.length ? recent.map(h => `
            <div class="pom-history-item">
              <span class="pom-history-mode" style="color:${this.MODES[h.mode]?.color || '#7C3AED'}">${this.MODES[h.mode]?.label || h.mode}</span>
              <span class="pom-history-dur">${h.duration} min</span>
              <span class="pom-history-time">${DateUtils.relative(h.completedAt)}</span>
            </div>
          `).join('') : '<p class="empty-state-sm">Aucune session.</p>'}
        </div>
      </div>
    `;
  },

  _bindControls() {
    document.getElementById('pom-toggle')?.addEventListener('click', () => this._toggle());
    document.getElementById('pom-reset')?.addEventListener('click', () => this._reset());
    document.getElementById('pom-skip')?.addEventListener('click', () => this._skip());

    document.querySelectorAll('.pom-mode-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this._stopTimer();
        this.state.mode = btn.dataset.mode;
        this.state.running = false;
        this.state.remaining = this.MODES[btn.dataset.mode].duration;
        this._render();
      });
    });

    document.getElementById('btn-apply-pom-settings')?.addEventListener('click', () => {
      document.querySelectorAll('.pom-setting-input').forEach(input => {
        const k = input.dataset.key;
        const v = parseInt(input.value);
        if (!isNaN(v)) this.settings[k] = v;
      });
      this.settings.sound     = document.getElementById('pom-sound')?.checked ?? true;
      this.settings.autoStart = document.getElementById('pom-autostart')?.checked ?? false;
      Store.set('pomodoro_settings', this.settings);
      this._applySettings();
      this._render();
      Toast.success('Paramètres appliqués');
    });
  },

  _toggle() {
    if (this.state.running) this._pause();
    else this._start();
  },

  _start() {
    this.state.running = true;
    this._updateToggleBtn();
    PomodoroMini.show();
    this.timer = setInterval(() => this._tick(), 1000);
  },

  _pause() {
    this.state.running = false;
    this._stopTimer();
    this._updateToggleBtn();
  },

  _reset() {
    this._stopTimer();
    this.state.running   = false;
    this.state.remaining = this.MODES[this.state.mode].duration;
    this._updateDisplay();
    this._updateToggleBtn();
    PomodoroMini.hide();
  },

  _skip() {
    this._stopTimer();
    this._complete(false);
  },

  _tick() {
    if (this.state.remaining <= 0) { this._complete(true); return; }
    this.state.remaining--;
    this._updateDisplay();
  },

  _complete(playSound = true) {
    this._stopTimer();
    this.state.running = false;

    if (this.state.mode === 'work') {
      this.state.session++;
      this.state.completedToday++;
      this.state.totalCompleted++;
      this.history.push({
        id: uid(), mode: 'work',
        duration: this.settings.work,
        date: DateUtils.today(),
        completedAt: DateUtils.now(),
      });
      Store.set('pomodoro_history', this.history);
      if (playSound) this._playSound('complete');
      Notifications.add(`Session Pomodoro terminée ! (#${this.state.session})`, 'success');
      if (this.state.session % this.settings.longBreakInterval === 0) {
        this._switchMode('longBreak');
      } else {
        this._switchMode('shortBreak');
      }
    } else {
      if (playSound) this._playSound('break');
      this._switchMode('work');
    }
  },

  _switchMode(mode) {
    this.state.mode = mode;
    this.state.remaining = this.MODES[mode].duration;
    this._render();
    if (this.settings.autoStart) setTimeout(() => this._start(), 800);
  },

  _stopTimer() {
    clearInterval(this.timer);
    this.timer = null;
  },

  _updateDisplay() {
    const mins  = Math.floor(this.state.remaining / 60);
    const secs  = this.state.remaining % 60;
    const label = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const el    = document.getElementById('pom-digits');
    if (el) el.textContent = label;

    const mode  = this.MODES[this.state.mode];
    const total = mode.duration;
    const pct   = 1 - this.state.remaining / total;
    const r     = 90, circ = 2 * Math.PI * r;
    const fill  = document.getElementById('pom-ring-fill');
    if (fill) fill.setAttribute('stroke-dasharray', `${pct * circ} ${circ - pct * circ}`);

    PomodoroMini.update(label, pct);
    document.title = `${label} — NEXUS`;
  },

  _updateToggleBtn() {
    const btn = document.getElementById('pom-toggle');
    if (btn) {
      btn.innerHTML = this.state.running ? Icons.pause : Icons.play;
      btn.classList.toggle('running', this.state.running);
    }
    const miniBtn = document.getElementById('mini-pom-toggle');
    if (miniBtn) miniBtn.innerHTML = this.state.running ? Icons.pause : Icons.play;
  },

  _playSound(type) {
    if (!this.settings.sound) return;
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = this.audioCtx;
      const notes = type === 'complete'
        ? [{ f: 440, t: 0 }, { f: 554, t: 0.15 }, { f: 659, t: 0.3 }]
        : [{ f: 523, t: 0 }, { f: 440, t: 0.2 }];
      notes.forEach(({ f, t }) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = f;
        osc.type = 'sine';
        gain.gain.setValueAtTime(this.settings.volume * 0.4, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.4);
      });
    } catch (e) { /* AudioContext not available */ }
  },

  _calcStreak() {
    const days = [...new Set(this.history.map(h => h.date))].sort().reverse();
    let streak = 0, cur = new Date();
    for (const d of days) {
      const diff = Math.round((cur - new Date(d)) / 86400000);
      if (diff <= 1) { streak++; cur = new Date(d); } else break;
    }
    return streak;
  },
};

/* Mini player toggle */
document.addEventListener('click', e => {
  if (e.target.id === 'mini-pom-toggle' || e.target.closest('#mini-pom-toggle')) {
    Pomodoro._toggle();
  }
});

Bus.on('appReady', () => Pomodoro.init());
