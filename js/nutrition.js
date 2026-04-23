/* ═══════════════════════════════════════════════════════════
   NEXUS APP — nutrition.js
   Calories · Macros · Meals · Water · Weekly chart
═══════════════════════════════════════════════════════════ */

const Nutrition = {
  meals: [],
  waterLog: [],
  goals: { calories: 2500, protein: 150, carbs: 300, fat: 80, water: 8 },
  viewDate: DateUtils.today(),

  FOOD_DB: [
    { name: 'Poulet grillé (100g)', cal: 165, p: 31, c: 0, f: 3.6 },
    { name: 'Riz cuit (100g)', cal: 130, p: 2.7, c: 28, f: 0.3 },
    { name: 'Œuf entier', cal: 78, p: 6, c: 0.6, f: 5 },
    { name: 'Flocons d\'avoine (50g)', cal: 189, p: 6.5, c: 33, f: 3.4 },
    { name: 'Whey protéine (30g)', cal: 120, p: 24, c: 3, f: 2 },
    { name: 'Banane', cal: 89, p: 1.1, c: 23, f: 0.3 },
    { name: 'Pain complet (tranche)', cal: 80, p: 4, c: 15, f: 1 },
    { name: 'Thon en boîte (100g)', cal: 116, p: 26, c: 0, f: 1 },
    { name: 'Lait demi-écrémé (200ml)', cal: 92, p: 7, c: 10, f: 3.4 },
    { name: 'Yaourt grec (150g)', cal: 100, p: 17, c: 6, f: 0.7 },
    { name: 'Pomme de terre (100g)', cal: 77, p: 2, c: 17, f: 0.1 },
    { name: 'Saumon (100g)', cal: 208, p: 20, c: 0, f: 13 },
    { name: 'Pâtes cuites (100g)', cal: 131, p: 5, c: 25, f: 1.1 },
    { name: 'Brocoli (100g)', cal: 34, p: 2.8, c: 7, f: 0.4 },
    { name: 'Amandes (30g)', cal: 174, p: 6, c: 6, f: 15 },
  ],

  MEAL_TYPES: ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation'],

  init() {
    this.meals     = Store.get('nutrition_meals', []);
    this.waterLog  = Store.get('nutrition_water', []);
    this.goals     = Store.get('nutrition_goals', this.goals);
    this._render();
    Bus.on('moduleActivated', ({ module }) => { if (module === 'nutrition') this._render(); });
  },

  _render() {
    this.meals    = Store.get('nutrition_meals', []);
    this.waterLog = Store.get('nutrition_water', []);
    const c = document.getElementById('nutrition-container');
    if (!c) return;

    const todayMeals = this.meals.filter(m => m.date === this.viewDate);
    const totals = this._calcTotals(todayMeals);
    const water  = this._waterToday();

    c.innerHTML = `
      <div class="nutrition-layout anim-fade-up">
        <div class="nutrition-main">
          ${this._renderDateNav()}
          ${this._renderSummaryRing(totals)}
          ${this._renderMacrosBars(totals)}
          ${this._renderMealsList(todayMeals)}
        </div>
        <div class="nutrition-sidebar">
          ${this._renderWater(water)}
          ${this._renderWeeklyChart()}
          ${this._renderGoalsWidget()}
        </div>
      </div>
      ${this._renderAddMealModal()}
    `;

    this._bindEvents();
  },

  _renderDateNav() {
    const isToday = this.viewDate === DateUtils.today();
    return `
      <div class="date-nav">
        <button class="btn-icon" id="nutr-prev-day">${Icons.chevronLeft}</button>
        <span class="date-nav-label">${isToday ? 'Aujourd\'hui' : DateUtils.format(this.viewDate)}</span>
        <button class="btn-icon" id="nutr-next-day" ${isToday ? 'disabled' : ''}>${Icons.chevronRight}</button>
        <button class="btn btn-primary btn-sm" id="btn-add-meal">${Icons.plus} Ajouter</button>
      </div>
    `;
  },

  _renderSummaryRing(totals) {
    const pct = Math.min(totals.cal / (this.goals.calories || 1), 1);
    const r = 52, circ = 2 * Math.PI * r;
    const dash = pct * circ;
    const color = pct >= 1 ? 'var(--accent-red)' : pct > 0.75 ? 'var(--accent-orange)' : 'var(--accent-purple)';
    return `
      <div class="widget nutr-summary-widget">
        <div class="nutr-ring-wrap">
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="10"/>
            <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="10"
              stroke-dasharray="${dash} ${circ - dash}" stroke-linecap="round" transform="rotate(-90 60 60)"
              style="transition:stroke-dasharray 0.8s var(--ease-out)"/>
          </svg>
          <div class="nutr-ring-center">
            <span class="nutr-ring-val" style="font-family:'Fraunces',serif">${Math.round(totals.cal)}</span>
            <span class="nutr-ring-label">kcal</span>
          </div>
        </div>
        <div class="nutr-summary-info">
          <div class="nutr-summary-row">
            <span class="nutr-summary-label">Objectif</span>
            <span class="nutr-summary-val">${this.goals.calories} kcal</span>
          </div>
          <div class="nutr-summary-row">
            <span class="nutr-summary-label">Restant</span>
            <span class="nutr-summary-val ${this.goals.calories - totals.cal < 0 ? 'text-danger' : ''}">${Math.round(this.goals.calories - totals.cal)} kcal</span>
          </div>
          <div class="nutr-summary-row">
            <span class="nutr-summary-label">Repas</span>
            <span class="nutr-summary-val">${this.meals.filter(m => m.date === this.viewDate).length}</span>
          </div>
        </div>
      </div>
    `;
  },

  _renderMacrosBars(totals) {
    const macros = [
      { key: 'p', label: 'Protéines',  goal: this.goals.protein, color: '#06B6D4', unit: 'g' },
      { key: 'c', label: 'Glucides',   goal: this.goals.carbs,   color: '#F59E0B', unit: 'g' },
      { key: 'f', label: 'Lipides',    goal: this.goals.fat,     color: '#EF4444', unit: 'g' },
    ];
    return `
      <div class="widget" style="margin-bottom:1.25rem">
        <div class="widget-header"><span class="widget-title">Macronutriments</span></div>
        ${macros.map(m => {
          const val = totals[m.key] || 0;
          const pct = Math.min(val / (m.goal || 1) * 100, 100);
          return `
            <div class="macro-bar-row">
              <div class="macro-bar-header">
                <span class="macro-bar-label">${m.label}</span>
                <span class="macro-bar-val">${Math.round(val)} / ${m.goal}${m.unit}</span>
              </div>
              <div class="macro-bar-track">
                <div class="macro-bar-fill" style="width:${pct}%;background:${m.color};transition:width 0.8s var(--ease-out)"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  _renderMealsList(meals) {
    const grouped = {};
    this.MEAL_TYPES.forEach(t => grouped[t] = []);
    meals.forEach(m => { if (grouped[m.mealType]) grouped[m.mealType].push(m); });
    return `
      <div class="meals-section">
        ${this.MEAL_TYPES.map(type => {
          const items = grouped[type];
          const typeCal = items.reduce((s, m) => s + (m.calories || 0), 0);
          return `
            <div class="meal-group">
              <div class="meal-group-header">
                <span class="meal-group-name">${type}</span>
                <span class="meal-group-cal">${Math.round(typeCal)} kcal</span>
              </div>
              ${items.map(meal => `
                <div class="meal-item">
                  <div class="meal-item-info">
                    <span class="meal-item-name">${meal.foodName}</span>
                    <span class="meal-item-macros">P:${meal.protein}g · G:${meal.carbs}g · L:${meal.fat}g</span>
                  </div>
                  <span class="meal-item-cal">${meal.calories} kcal</span>
                  <button class="btn-icon btn-icon-sm btn-danger-ghost meal-delete" data-id="${meal.id}">${Icons.trash}</button>
                </div>
              `).join('')}
              <button class="btn btn-ghost btn-sm meal-add-btn" data-type="${type}">${Icons.plus} Ajouter à ${type}</button>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  _renderWater(current) {
    const glasses = Array.from({ length: this.goals.water }, (_, i) => i < current);
    return `
      <div class="widget" style="margin-bottom:1.25rem">
        <div class="widget-header">
          <span class="widget-title">Eau 💧</span>
          <span class="text-muted">${current} / ${this.goals.water} verres</span>
        </div>
        <div class="water-glasses">
          ${glasses.map((filled, i) => `
            <button class="water-glass ${filled ? 'filled' : ''}" data-glass="${i}" data-tip="Verre ${i+1}">
              ${Icons.droplet}
            </button>
          `).join('')}
        </div>
        <div class="water-btns">
          <button class="btn btn-outline btn-sm" id="btn-water-add">${Icons.plus} Verre</button>
          <button class="btn btn-ghost btn-sm" id="btn-water-remove">${Icons.minus}</button>
        </div>
      </div>
    `;
  },

  _renderWeeklyChart() {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    const data = days.map(d => {
      const dayMeals = this.meals.filter(m => m.date === d);
      return { label: d.slice(8), value: dayMeals.reduce((s, m) => s + (m.calories || 0), 0) };
    });
    return `
      <div class="widget" style="margin-bottom:1.25rem">
        <div class="widget-header"><span class="widget-title">7 derniers jours</span></div>
        <div id="nutr-weekly-chart"></div>
      </div>
    `;
  },

  _renderGoalsWidget() {
    return `
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">Objectifs</span>
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-sm" id="btn-calc-tdee" style="font-size:0.75rem">🧮 TDEE</button>
            <button class="btn-icon btn-icon-sm" id="btn-edit-goals" data-tip="Modifier">${Icons.edit}</button>
          </div>
        </div>
        <div class="goals-list">
          <div class="goal-row"><span>Calories</span><span class="badge badge-purple">${this.goals.calories} kcal</span></div>
          <div class="goal-row"><span>Protéines</span><span class="badge badge-cyan">${this.goals.protein} g</span></div>
          <div class="goal-row"><span>Glucides</span><span class="badge badge-orange">${this.goals.carbs} g</span></div>
          <div class="goal-row"><span>Lipides</span><span class="badge badge-red">${this.goals.fat} g</span></div>
          <div class="goal-row"><span>Eau</span><span class="badge badge-outline">${this.goals.water} verres</span></div>
        </div>
      </div>
    `;
  },

  _renderAddMealModal() {
    return `
      <div id="add-meal-modal" class="modal hidden">
        <div class="modal-box modal-md anim-scale-in">
          <div class="modal-header">
            <h3 class="modal-title">Ajouter un aliment</h3>
            <button class="btn-icon" id="meal-modal-close">${Icons.close}</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group" style="flex:2">
                <label class="form-label">Aliment</label>
                <input type="text" id="food-name" class="form-input" placeholder="Chercher ou saisir…" autocomplete="off" data-focus/>
                <div id="food-suggestions" class="food-suggestions hidden"></div>
              </div>
              <div class="form-group">
                <label class="form-label">Type de repas</label>
                <select id="meal-type-select" class="form-select">
                  ${this.MEAL_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row macro-inputs">
              <div class="form-group">
                <label class="form-label">Calories</label>
                <input type="number" id="food-cal" class="form-input" placeholder="0" min="0"/>
              </div>
              <div class="form-group">
                <label class="form-label">Protéines (g)</label>
                <input type="number" id="food-protein" class="form-input" placeholder="0" min="0" step="0.1"/>
              </div>
              <div class="form-group">
                <label class="form-label">Glucides (g)</label>
                <input type="number" id="food-carbs" class="form-input" placeholder="0" min="0" step="0.1"/>
              </div>
              <div class="form-group">
                <label class="form-label">Lipides (g)</label>
                <input type="number" id="food-fat" class="form-input" placeholder="0" min="0" step="0.1"/>
              </div>
            </div>
            <div class="modal-footer-btns">
              <button class="btn btn-ghost" id="meal-cancel">Annuler</button>
              <button class="btn btn-primary" id="btn-save-meal">Ajouter</button>
            </div>
          </div>
        </div>
      </div>

      <div id="goals-modal" class="modal hidden">
        <div class="modal-box modal-sm anim-scale-in">
          <div class="modal-header">
            <h3 class="modal-title">Modifier les objectifs</h3>
            <button class="btn-icon" data-close-modal="goals-modal">${Icons.close}</button>
          </div>
          <div class="modal-body">
            ${[['calories','Calories (kcal)',2500],['protein','Protéines (g)',150],['carbs','Glucides (g)',300],['fat','Lipides (g)',80],['water','Eau (verres)',8]].map(([key, label, def]) => `
              <div class="form-group">
                <label class="form-label">${label}</label>
                <input type="number" id="goal-${key}" class="form-input" value="${this.goals[key] ?? def}" min="0"/>
              </div>
            `).join('')}
            <div class="modal-footer-btns">
              <button class="btn btn-ghost" data-close-modal="goals-modal">Annuler</button>
              <button class="btn btn-primary" id="btn-save-goals">Enregistrer</button>
            </div>
          </div>
        </div>
      </div>

      <div id="tdee-modal" class="modal hidden">
        <div class="modal-box modal-md anim-scale-in">
          <div class="modal-header">
            <h3 class="modal-title">🧮 Calculateur TDEE</h3>
            <button class="btn-icon" data-close-modal="tdee-modal">${Icons.close}</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Sexe</label>
                <select id="tdee-sex" class="form-select">
                  <option value="m">Homme</option>
                  <option value="f">Femme</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Âge</label>
                <input type="number" id="tdee-age" class="form-input" placeholder="25" min="10" max="100"/>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Poids (kg)</label>
                <input type="number" id="tdee-weight" class="form-input" placeholder="75" min="30" max="300" step="0.1"/>
              </div>
              <div class="form-group">
                <label class="form-label">Taille (cm)</label>
                <input type="number" id="tdee-height" class="form-input" placeholder="175" min="100" max="250"/>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Niveau d'activité</label>
              <select id="tdee-activity" class="form-select">
                <option value="1.2">Sédentaire (peu ou pas d'exercice)</option>
                <option value="1.375">Légèrement actif (1-3 jours/sem)</option>
                <option value="1.55" selected>Modérément actif (3-5 jours/sem)</option>
                <option value="1.725">Très actif (6-7 jours/sem)</option>
                <option value="1.9">Extrêmement actif (sport + travail physique)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Objectif</label>
              <select id="tdee-goal" class="form-select">
                <option value="-500">Perte de poids (-500 kcal)</option>
                <option value="-250">Perte légère (-250 kcal)</option>
                <option value="0" selected>Maintien</option>
                <option value="250">Prise de masse légère (+250 kcal)</option>
                <option value="500">Prise de masse (+500 kcal)</option>
              </select>
            </div>
            <div id="tdee-result" class="tdee-result-box hidden" style="background:var(--bg-tertiary);border-radius:12px;padding:16px;margin-top:8px"></div>
            <div class="modal-footer-btns">
              <button class="btn btn-outline" id="btn-calc-tdee-result">Calculer</button>
              <button class="btn btn-primary hidden" id="btn-apply-tdee">Appliquer ces objectifs</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _bindEvents() {
    document.getElementById('nutr-prev-day')?.addEventListener('click', () => {
      const d = new Date(this.viewDate);
      d.setDate(d.getDate() - 1);
      this.viewDate = d.toISOString().slice(0, 10);
      this._render();
    });
    document.getElementById('nutr-next-day')?.addEventListener('click', () => {
      const d = new Date(this.viewDate);
      d.setDate(d.getDate() + 1);
      this.viewDate = d.toISOString().slice(0, 10);
      this._render();
    });

    document.getElementById('btn-add-meal')?.addEventListener('click', () => Modal.open('add-meal-modal'));
    document.querySelectorAll('.meal-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('meal-type-select').value = btn.dataset.type;
        Modal.open('add-meal-modal');
      });
    });
    document.getElementById('meal-modal-close')?.addEventListener('click', () => Modal.close('add-meal-modal'));
    document.getElementById('meal-cancel')?.addEventListener('click', () => Modal.close('add-meal-modal'));

    /* Food autocomplete */
    const nameInput = document.getElementById('food-name');
    const suggestEl = document.getElementById('food-suggestions');
    nameInput?.addEventListener('input', () => {
      const q = nameInput.value.toLowerCase();
      if (!q) { suggestEl?.classList.add('hidden'); return; }
      const matches = this.FOOD_DB.filter(f => f.name.toLowerCase().includes(q)).slice(0, 6);
      if (!matches.length) { suggestEl?.classList.add('hidden'); return; }
      suggestEl.innerHTML = matches.map(f => `
        <div class="food-suggest-item" data-name="${f.name}" data-cal="${f.cal}" data-p="${f.p}" data-c="${f.c}" data-f="${f.f}">
          <span class="food-suggest-name">${f.name}</span>
          <span class="food-suggest-cal">${f.cal} kcal</span>
        </div>
      `).join('');
      suggestEl.classList.remove('hidden');
      suggestEl.querySelectorAll('.food-suggest-item').forEach(item => {
        item.addEventListener('click', () => {
          document.getElementById('food-name').value = item.dataset.name;
          document.getElementById('food-cal').value = item.dataset.cal;
          document.getElementById('food-protein').value = item.dataset.p;
          document.getElementById('food-carbs').value = item.dataset.c;
          document.getElementById('food-fat').value = item.dataset.f;
          suggestEl.classList.add('hidden');
        });
      });
    });

    document.getElementById('btn-save-meal')?.addEventListener('click', () => this._saveMeal());

    /* Delete meal */
    document.querySelectorAll('.meal-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        this.meals = this.meals.filter(m => m.id !== btn.dataset.id);
        Store.set('nutrition_meals', this.meals);
        this._render();
        Toast.success('Repas supprimé');
      });
    });

    /* Water */
    document.getElementById('btn-water-add')?.addEventListener('click', () => {
      this._addWater(1);
    });
    document.getElementById('btn-water-remove')?.addEventListener('click', () => {
      this._addWater(-1);
    });
    document.querySelectorAll('.water-glass').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = parseInt(btn.dataset.glass) + 1;
        const current = this._waterToday();
        if (target > current) this._addWater(target - current);
        else this._addWater(-(current - target));
      });
    });

    /* Goals */
    document.getElementById('btn-edit-goals')?.addEventListener('click', () => Modal.open('goals-modal'));
    document.getElementById('btn-calc-tdee')?.addEventListener('click', () => {
      const u = AppState.user;
      if (u.age) document.getElementById('tdee-age').value = u.age;
      if (u.weight) document.getElementById('tdee-weight').value = u.weight;
      if (u.height) document.getElementById('tdee-height').value = u.height;
      if (u.gender) document.getElementById('tdee-sex').value = u.gender === 'female' ? 'f' : 'm';
      Modal.open('tdee-modal');
    });
    document.getElementById('btn-calc-tdee-result')?.addEventListener('click', () => {
      const sex    = document.getElementById('tdee-sex')?.value;
      const age    = parseInt(document.getElementById('tdee-age')?.value);
      const weight = parseFloat(document.getElementById('tdee-weight')?.value);
      const height = parseInt(document.getElementById('tdee-height')?.value);
      const activ  = parseFloat(document.getElementById('tdee-activity')?.value);
      const goal   = parseInt(document.getElementById('tdee-goal')?.value);
      if (!age || !weight || !height) { Toast.warning('Remplis tous les champs'); return; }
      /* Mifflin-St Jeor formula */
      const bmr = sex === 'm'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
      const tdee    = Math.round(bmr * activ);
      const target  = tdee + goal;
      const protein = Math.round(weight * 2);
      const fat     = Math.round(target * 0.25 / 9);
      const carbs   = Math.round((target - protein * 4 - fat * 9) / 4);
      const resEl   = document.getElementById('tdee-result');
      if (resEl) {
        resEl.classList.remove('hidden');
        resEl.innerHTML = `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">BMR</div><div style="font-family:'Fraunces',serif;font-size:1.3rem;font-weight:700">${Math.round(bmr)} kcal</div></div>
            <div><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">TDEE</div><div style="font-family:'Fraunces',serif;font-size:1.3rem;font-weight:700">${tdee} kcal</div></div>
            <div><div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">Objectif calorique</div><div style="font-family:'Fraunces',serif;font-size:1.5rem;font-weight:700;color:var(--accent-purple)">${target} kcal</div></div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <span style="font-size:0.75rem">🥩 Protéines : <b>${protein}g</b></span>
              <span style="font-size:0.75rem">🍞 Glucides : <b>${carbs}g</b></span>
              <span style="font-size:0.75rem">🥑 Lipides : <b>${fat}g</b></span>
            </div>
          </div>
        `;
        resEl._computed = { calories: target, protein, carbs, fat, water: this.goals.water };
      }
      document.getElementById('btn-apply-tdee')?.classList.remove('hidden');
    });
    document.getElementById('btn-apply-tdee')?.addEventListener('click', () => {
      const resEl = document.getElementById('tdee-result');
      if (resEl?._computed) {
        Object.assign(this.goals, resEl._computed);
        Store.set('nutrition_goals', this.goals);
        Modal.close('tdee-modal');
        this._render();
        Toast.success('Objectifs TDEE appliqués !');
      }
    });
    document.getElementById('btn-save-goals')?.addEventListener('click', () => {
      ['calories','protein','carbs','fat','water'].forEach(k => {
        const val = parseFloat(document.getElementById(`goal-${k}`)?.value);
        if (!isNaN(val)) this.goals[k] = val;
      });
      Store.set('nutrition_goals', this.goals);
      Modal.close('goals-modal');
      this._render();
      Toast.success('Objectifs mis à jour');
    });

    /* Weekly chart */
    const chartEl = document.getElementById('nutr-weekly-chart');
    if (chartEl) {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().slice(0, 10);
      });
      const data = days.map(d => ({
        label: d.slice(8),
        value: this.meals.filter(m => m.date === d).reduce((s, m) => s + (m.calories || 0), 0)
      }));
      Charts.bar(chartEl, data, { width: 220, height: 80, color: 'var(--accent-purple)' });
    }
  },

  _saveMeal() {
    const name     = document.getElementById('food-name')?.value?.trim();
    const calories = parseFloat(document.getElementById('food-cal')?.value) || 0;
    const protein  = parseFloat(document.getElementById('food-protein')?.value) || 0;
    const carbs    = parseFloat(document.getElementById('food-carbs')?.value) || 0;
    const fat      = parseFloat(document.getElementById('food-fat')?.value) || 0;
    const mealType = document.getElementById('meal-type-select')?.value || 'Déjeuner';

    if (!name) { Toast.warning('Nom de l\'aliment requis'); return; }

    const meal = { id: uid(), foodName: name, calories, protein, carbs, fat, mealType, date: this.viewDate, createdAt: DateUtils.now() };
    this.meals.push(meal);
    Store.set('nutrition_meals', this.meals);
    Modal.close('add-meal-modal');
    this._render();
    Toast.success('Repas ajouté');
  },

  _waterToday() {
    return this.waterLog.filter(w => w.date === this.viewDate).reduce((s, w) => s + w.glasses, 0);
  },

  _addWater(delta) {
    const existing = this.waterLog.find(w => w.date === this.viewDate);
    if (existing) {
      existing.glasses = Math.max(0, Math.min(this.goals.water, existing.glasses + delta));
    } else if (delta > 0) {
      this.waterLog.push({ id: uid(), date: this.viewDate, glasses: Math.min(delta, this.goals.water) });
    }
    Store.set('nutrition_water', this.waterLog);
    this._render();
  },

  _calcTotals(meals) {
    return meals.reduce((t, m) => ({
      cal: t.cal + (m.calories || 0),
      p: t.p + (m.protein || 0),
      c: t.c + (m.carbs || 0),
      f: t.f + (m.fat || 0),
    }), { cal: 0, p: 0, c: 0, f: 0 });
  },
};

Bus.on('appReady', () => Nutrition.init());
