/* ═══════════════════════════════════════════════════════════
   NEXUS APP — stats.js
   Global statistics · Charts · Insights
═══════════════════════════════════════════════════════════ */

const Stats = {
  init() {
    this._render();
    Bus.on('moduleActivated', ({ module }) => { if (module === 'stats') this._render(); });
  },

  _render() {
    const c = document.getElementById('stats-container');
    if (!c) return;

    const workoutData  = Store.get('workout_sessions', []);
    const notes        = Store.get('notes', []);
    const transactions = Store.get('transactions', []);
    const meals        = Store.get('nutrition_meals', []);
    const contacts     = Store.get('contacts', []);
    const pomHistory   = Store.get('pomodoro_history', []);
    const events       = Store.get('agenda_events', []);

    c.innerHTML = `
      <div class="stats-layout anim-fade-up">

        <!-- ── OVERVIEW CARDS ── -->
        <div class="stats-overview-grid">
          ${this._statCard('💪', 'Séances sport', workoutData.length, 'Total', 'purple')}
          ${this._statCard('📝', 'Notes créées', notes.length, 'Total', 'cyan')}
          ${this._statCard('💰', 'Transactions', transactions.length, 'Enregistrées', 'green')}
          ${this._statCard('🍽️', 'Repas loggés', meals.length, 'Total', 'orange')}
          ${this._statCard('👥', 'Contacts', contacts.length, 'Dans le carnet', 'pink')}
          ${this._statCard('🍅', 'Pomodoros', pomHistory.length, 'Complétés', 'red')}
          ${this._statCard('📅', 'Événements', events.length, 'Agendés', 'purple')}
          ${this._statCard('⏱️', 'Temps focus', Math.round(pomHistory.length * 25) + ' min', 'Pomodoro total', 'cyan')}
        </div>

        <div class="stats-grid-2col">
          <!-- Workout frequency chart -->
          <div class="widget">
            <div class="widget-header">
              <span class="widget-title">💪 Fréquence d'entraînement</span>
              <span class="text-muted">${this._workoutStreak(workoutData)}🔥 streak</span>
            </div>
            <div id="workout-freq-chart"></div>
            ${this._renderWorkoutMuscleBreakdown(workoutData)}
          </div>

          <!-- Finance trend -->
          <div class="widget">
            <div class="widget-header">
              <span class="widget-title">💸 Tendance financière (6 mois)</span>
            </div>
            <div id="finance-trend-chart"></div>
            ${this._renderFinanceSummary(transactions)}
          </div>

          <!-- Nutrition weekly -->
          <div class="widget">
            <div class="widget-header">
              <span class="widget-title">🍽️ Calories (30 jours)</span>
            </div>
            <div id="nutrition-30d-chart"></div>
            ${this._renderNutritionSummary(meals)}
          </div>

          <!-- Pomodoro productivity -->
          <div class="widget">
            <div class="widget-header">
              <span class="widget-title">🍅 Productivité Pomodoro</span>
            </div>
            <div id="pom-chart"></div>
            ${this._renderPomodoroSummary(pomHistory)}
          </div>
        </div>

        <!-- Full-width: Activity heatmap -->
        <div class="widget" style="margin-bottom:1.5rem">
          <div class="widget-header">
            <span class="widget-title">📊 Activité globale (17 semaines)</span>
          </div>
          <div id="global-heatmap"></div>
          <p class="text-muted text-sm" style="margin-top:0.5rem">Combinaison : sport + notes + pomodoros + repas loggés par jour</p>
        </div>

        <!-- Notes by category -->
        <div class="stats-grid-2col">
          <div class="widget">
            <div class="widget-header"><span class="widget-title">📝 Notes par catégorie</span></div>
            <div id="notes-cat-chart"></div>
            ${this._renderNotesCatList(notes)}
          </div>

          <!-- Contacts by group -->
          <div class="widget">
            <div class="widget-header"><span class="widget-title">👥 Contacts par groupe</span></div>
            <div id="contacts-group-chart"></div>
            ${this._renderContactsGroupList(contacts)}
          </div>
        </div>

        <!-- Insights -->
        <div class="widget">
          <div class="widget-header"><span class="widget-title">💡 Insights</span></div>
          <div class="insights-grid" id="insights-grid">
            ${this._renderInsights(workoutData, notes, transactions, pomHistory, meals)}
          </div>
        </div>

      </div>
    `;

    this._renderCharts(workoutData, transactions, meals, pomHistory, notes, contacts);
  },

  _statCard(emoji, label, value, sub, color) {
    return `
      <div class="stat-overview-card widget hover-lift">
        <span class="stat-overview-emoji">${emoji}</span>
        <div class="stat-overview-info">
          <span class="stat-overview-val" style="font-family:'Fraunces',serif">${value}</span>
          <span class="stat-overview-label">${label}</span>
          <span class="stat-overview-sub text-muted">${sub}</span>
        </div>
      </div>
    `;
  },

  _renderWorkoutMuscleBreakdown(sessions) {
    const groups = {};
    sessions.forEach(s => { groups[s.muscleGroup] = (groups[s.muscleGroup] || 0) + 1; });
    const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const muscleEmoji = { pectoraux:'🫁', dos:'🔙', jambes:'🦵', epaules:'🦾', biceps:'💪', triceps:'💪', abdos:'🎯', fullbody:'⚡', cardio:'🏃' };
    return sorted.length ? `
      <div class="breakdown-list" style="margin-top:1rem">
        ${sorted.map(([k, v]) => `
          <div class="breakdown-row">
            <span>${muscleEmoji[k] || '🏋️'} ${k.charAt(0).toUpperCase() + k.slice(1)}</span>
            <div class="breakdown-bar-wrap">
              <div class="breakdown-bar" style="width:${Math.round(v / sessions.length * 100)}%;background:var(--accent-purple)"></div>
            </div>
            <span class="breakdown-val">${v}</span>
          </div>
        `).join('')}
      </div>
    ` : '<p class="empty-state-sm">Pas encore de données.</p>';
  },

  _renderFinanceSummary(transactions) {
    const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;
    return `
      <div class="finance-summary-row" style="margin-top:1rem">
        <div class="fs-item text-success"><span>+${fmtCurrency(income)}</span><span class="fs-label">Revenus</span></div>
        <div class="fs-item text-danger"><span>-${fmtCurrency(expense)}</span><span class="fs-label">Dépenses</span></div>
        <div class="fs-item ${balance >= 0 ? 'text-success' : 'text-danger'}"><span>${fmtCurrency(balance)}</span><span class="fs-label">Solde</span></div>
      </div>
    `;
  },

  _renderNutritionSummary(meals) {
    const avgCal = meals.length
      ? Math.round(meals.reduce((s, m) => s + (m.calories || 0), 0) / Math.max(1, new Set(meals.map(m => m.date)).size))
      : 0;
    return `
      <div style="margin-top:0.75rem">
        <span class="text-muted">Moyenne : </span>
        <span class="badge badge-purple">${avgCal} kcal/jour</span>
        <span class="text-muted"> sur ${new Set(meals.map(m => m.date)).size} jours loggés</span>
      </div>
    `;
  },

  _renderPomodoroSummary(history) {
    const todayCount = history.filter(h => h.date === DateUtils.today()).length;
    const bestDay    = this._bestPomDay(history);
    return `
      <div style="margin-top:0.75rem;display:flex;gap:1rem;flex-wrap:wrap">
        <span><span class="text-muted">Aujourd'hui :</span> <strong>${todayCount}</strong></span>
        <span><span class="text-muted">Meilleure journée :</span> <strong>${bestDay.count}</strong>${bestDay.date ? ` (${DateUtils.format(bestDay.date)})` : ''}</span>
        <span><span class="text-muted">Streak :</span> <strong>${this._pomStreak(history)}🔥</strong></span>
      </div>
    `;
  },

  _renderNotesCatList(notes) {
    const cats = { personnel: 0, travail: 0, idees: 0, sante: 0 };
    notes.forEach(n => { if (cats[n.category] !== undefined) cats[n.category]++; });
    const catColors = { personnel: '#7C3AED', travail: '#06B6D4', idees: '#F59E0B', sante: '#10B981' };
    return `
      <div class="breakdown-list" style="margin-top:0.75rem">
        ${Object.entries(cats).map(([k, v]) => `
          <div class="breakdown-row">
            <span style="color:${catColors[k]}">${k.charAt(0).toUpperCase() + k.slice(1)}</span>
            <div class="breakdown-bar-wrap">
              <div class="breakdown-bar" style="width:${notes.length ? Math.round(v / notes.length * 100) : 0}%;background:${catColors[k]}"></div>
            </div>
            <span class="breakdown-val">${v}</span>
          </div>
        `).join('')}
      </div>
    `;
  },

  _renderContactsGroupList(contacts) {
    const groups = { famille: 0, amis: 0, pro: 0, sport: 0, autre: 0 };
    contacts.forEach(c => { if (groups[c.group] !== undefined) groups[c.group]++; });
    const groupColors = { famille: '#EC4899', amis: '#06B6D4', pro: '#7C3AED', sport: '#EF4444', autre: '#6B7280' };
    return `
      <div class="breakdown-list" style="margin-top:0.75rem">
        ${Object.entries(groups).map(([k, v]) => `
          <div class="breakdown-row">
            <span>${k.charAt(0).toUpperCase() + k.slice(1)}</span>
            <div class="breakdown-bar-wrap">
              <div class="breakdown-bar" style="width:${contacts.length ? Math.round(v / contacts.length * 100) : 0}%;background:${groupColors[k]}"></div>
            </div>
            <span class="breakdown-val">${v}</span>
          </div>
        `).join('')}
      </div>
    `;
  },

  _renderInsights(workouts, notes, transactions, pomHistory, meals) {
    const insights = [];
    const today = DateUtils.today();
    const weekStart = DateUtils.startOfWeek();

    /* Workout insights */
    const thisWeekWorkouts = workouts.filter(s => s.date >= weekStart);
    if (thisWeekWorkouts.length >= 4) insights.push({ icon: '🏆', text: `Excellent ! ${thisWeekWorkouts.length} séances cette semaine.`, type: 'success' });
    else if (thisWeekWorkouts.length === 0) insights.push({ icon: '💪', text: 'Pas encore de séance cette semaine. C\'est le moment !', type: 'warning' });

    const streak = this._workoutStreak(workouts);
    if (streak >= 7) insights.push({ icon: '🔥', text: `Streak incroyable de ${streak} jours consécutifs !`, type: 'success' });

    /* Notes insights */
    if (notes.length >= 10) insights.push({ icon: '📚', text: `${notes.length} notes créées. Ta base de connaissance grandit !`, type: 'info' });

    /* Finance insights */
    const thisMonthExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(today.slice(0, 7))).reduce((s, t) => s + t.amount, 0);
    const thisMonthIncome  = transactions.filter(t => t.type === 'income'  && t.date.startsWith(today.slice(0, 7))).reduce((s, t) => s + t.amount, 0);
    if (thisMonthExpense > thisMonthIncome && thisMonthIncome > 0) {
      insights.push({ icon: '⚠️', text: `Attention : tes dépenses (${fmtCurrency(thisMonthExpense)}) dépassent tes revenus ce mois-ci.`, type: 'warning' });
    } else if (thisMonthIncome > 0) {
      insights.push({ icon: '✅', text: `Super gestion : ${fmtCurrency(thisMonthIncome - thisMonthExpense)} d'épargne ce mois-ci.`, type: 'success' });
    }

    /* Pomodoro insights */
    const todayPom = pomHistory.filter(h => h.date === today).length;
    if (todayPom >= 4) insights.push({ icon: '⚡', text: `${todayPom} pomodoros aujourd'hui — focus exemplaire !`, type: 'success' });

    /* Nutrition insights */
    const todayMeals = meals.filter(m => m.date === today);
    if (todayMeals.length === 0) insights.push({ icon: '🍽️', text: 'Pense à logger tes repas d\'aujourd\'hui !', type: 'info' });

    if (!insights.length) {
      insights.push({ icon: '👋', text: 'Commence à utiliser NEXUS pour recevoir des insights personnalisés !', type: 'info' });
    }

    return insights.map(i => `
      <div class="insight-card insight-${i.type}">
        <span class="insight-icon">${i.icon}</span>
        <span class="insight-text">${i.text}</span>
      </div>
    `).join('');
  },

  _renderCharts(workouts, transactions, meals, pomHistory, notes, contacts) {
    /* Workout frequency — last 8 weeks */
    const wfEl = document.getElementById('workout-freq-chart');
    if (wfEl) {
      const data = Array.from({ length: 8 }, (_, i) => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (7 - i) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const ws = weekStart.toISOString().slice(0, 10);
        const we = weekEnd.toISOString().slice(0, 10);
        return {
          label: `S${DateUtils.weekNum(weekStart)}`,
          value: workouts.filter(s => s.date >= ws && s.date <= we).length,
        };
      });
      Charts.bar(wfEl, data, { width: 280, height: 100, color: 'var(--accent-purple)' });
    }

    /* Finance trend — last 6 months */
    const ftEl = document.getElementById('finance-trend-chart');
    if (ftEl) {
      const data = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const mo = d.toISOString().slice(0, 7);
        const bal = transactions
          .filter(t => t.date.startsWith(mo))
          .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
        return { label: mo.slice(5), value: Math.max(0, bal) };
      });
      Charts.bar(ftEl, data, { width: 280, height: 100, color: 'var(--accent-green)' });
    }

    /* Nutrition 30 days */
    const n30El = document.getElementById('nutrition-30d-chart');
    if (n30El) {
      const points = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const iso = d.toISOString().slice(0, 10);
        return meals.filter(m => m.date === iso).reduce((s, m) => s + (m.calories || 0), 0);
      });
      Charts.line(n30El, points, { width: 280, height: 80, color: 'var(--accent-orange)' });
    }

    /* Pomodoro 14 days */
    const pomEl = document.getElementById('pom-chart');
    if (pomEl) {
      const data = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        const iso = d.toISOString().slice(0, 10);
        return {
          label: String(d.getDate()).padStart(2, '0'),
          value: pomHistory.filter(h => h.date === iso).length,
        };
      });
      Charts.bar(pomEl, data, { width: 280, height: 80, color: 'var(--accent-red)' });
    }

    /* Global heatmap */
    const hmEl = document.getElementById('global-heatmap');
    if (hmEl) {
      const data = {};
      const add = (dateStr, val = 1) => { data[dateStr] = (data[dateStr] || 0) + val; };
      workouts.forEach(s => add(s.date?.slice(0, 10)));
      notes.forEach(n => add((n.updatedAt || n.createdAt)?.slice(0, 10)));
      pomHistory.forEach(h => add(h.date));
      meals.forEach(m => add(m.date, 0.25));
      Charts.heatmap(hmEl, data);
    }

    /* Notes donut by category */
    const notesCatEl = document.getElementById('notes-cat-chart');
    if (notesCatEl) {
      const cats = { personnel: 0, travail: 0, idees: 0, sante: 0 };
      notes.forEach(n => { if (cats[n.category] !== undefined) cats[n.category]++; });
      const catColors = { personnel: '#7C3AED', travail: '#06B6D4', idees: '#F59E0B', sante: '#10B981' };
      const segs = Object.entries(cats).filter(([,v]) => v > 0).map(([k, v]) => ({ label: k, value: v, color: catColors[k] }));
      if (segs.length) Charts.donut(notesCatEl, segs, { size: 100 });
    }

    /* Contacts donut by group */
    const contGroupEl = document.getElementById('contacts-group-chart');
    if (contGroupEl) {
      const groups = { famille: 0, amis: 0, pro: 0, sport: 0, autre: 0 };
      contacts.forEach(c => { if (groups[c.group] !== undefined) groups[c.group]++; });
      const groupColors = { famille: '#EC4899', amis: '#06B6D4', pro: '#7C3AED', sport: '#EF4444', autre: '#6B7280' };
      const segs = Object.entries(groups).filter(([,v]) => v > 0).map(([k, v]) => ({ label: k, value: v, color: groupColors[k] }));
      if (segs.length) Charts.donut(contGroupEl, segs, { size: 100 });
    }
  },

  _workoutStreak(sessions) {
    const days = [...new Set(sessions.map(s => s.date?.slice(0, 10)))].filter(Boolean).sort().reverse();
    let streak = 0, cur = new Date();
    for (const d of days) {
      const diff = Math.round((cur - new Date(d)) / 86400000);
      if (diff <= 1) { streak++; cur = new Date(d); } else break;
    }
    return streak;
  },

  _pomStreak(history) {
    const days = [...new Set(history.map(h => h.date))].sort().reverse();
    let streak = 0, cur = new Date();
    for (const d of days) {
      const diff = Math.round((cur - new Date(d)) / 86400000);
      if (diff <= 1) { streak++; cur = new Date(d); } else break;
    }
    return streak;
  },

  _bestPomDay(history) {
    const counts = {};
    history.forEach(h => { counts[h.date] = (counts[h.date] || 0) + 1; });
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return best ? { date: best[0], count: best[1] } : { date: null, count: 0 };
  },
};

Bus.on('appReady', () => Stats.init());
