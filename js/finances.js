/* ═══════════════════════════════════════════════════════════
   NEXUS APP — finances.js
   Transactions · Budget · Categories · Charts
═══════════════════════════════════════════════════════════ */

const Finances = {
  transactions: [],
  budgets: [],
  accounts: [],
  subscriptions: [],
  filterType: 'all',
  filterMonth: null,
  editId: null,
  editAccountId: null,
  editSubId: null,
  activeTab: 'transactions',

  CATEGORIES: [
    { key: 'alimentation', label: 'Alimentation', emoji: '🍔', color: '#F59E0B' },
    { key: 'transport',    label: 'Transport',    emoji: '🚗', color: '#06B6D4' },
    { key: 'logement',     label: 'Logement',     emoji: '🏠', color: '#8B5CF6' },
    { key: 'sante',        label: 'Santé',        emoji: '🏥', color: '#10B981' },
    { key: 'sport',        label: 'Sport',        emoji: '💪', color: '#EF4444' },
    { key: 'loisirs',      label: 'Loisirs',      emoji: '🎮', color: '#EC4899' },
    { key: 'shopping',     label: 'Shopping',     emoji: '🛍️', color: '#F97316' },
    { key: 'education',    label: 'Éducation',    emoji: '📚', color: '#06B6D4' },
    { key: 'salaire',      label: 'Salaire',      emoji: '💼', color: '#10B981' },
    { key: 'freelance',    label: 'Freelance',    emoji: '💻', color: '#7C3AED' },
    { key: 'autre',        label: 'Autre',        emoji: '📦', color: '#6B7280' },
  ],

  init() {
    this.transactions  = Store.get('transactions', []);
    this.budgets       = Store.get('budgets', []);
    this.accounts      = Store.get('accounts', []);
    this.subscriptions = Store.get('subscriptions', []);
    this.filterMonth   = new Date().toISOString().slice(0, 7);
    /* seed default account if none */
    if (!this.accounts.length) {
      this.accounts = [{ id: uid(), name: 'Compte principal', type: 'courant', balance: 0, color: '#7C3AED', icon: '💳' }];
      Store.set('accounts', this.accounts);
    }
    this._render();
    Bus.on('moduleActivated', ({ module }) => { if (module === 'finances') this._render(); });
  },

  _render() {
    this.transactions  = Store.get('transactions', []);
    this.accounts      = Store.get('accounts', []);
    this.subscriptions = Store.get('subscriptions', []);
    const c = document.getElementById('finances-container');
    if (!c) return;

    const monthTx = this.transactions.filter(t => t.date.startsWith(this.filterMonth));
    const income   = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense  = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance  = this.transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);

    c.innerHTML = `
      <div class="finances-tabs-bar anim-fade-up">
        <button class="fin-tab ${this.activeTab==='transactions'?'active':''}" data-tab="transactions">💳 Transactions</button>
        <button class="fin-tab ${this.activeTab==='comptes'?'active':''}" data-tab="comptes">🏦 Comptes</button>
        <button class="fin-tab ${this.activeTab==='abonnements'?'active':''}" data-tab="abonnements">🔁 Abonnements</button>
        <button class="fin-tab ${this.activeTab==='stats'?'active':''}" data-tab="stats">📊 Stats</button>
      </div>
      ${this.activeTab === 'transactions' ? `
      <div class="finances-layout anim-fade-up">
        <div class="finances-main">
          ${this._renderBalanceHero(balance, income, expense)}
          ${this._renderFilters()}
          ${this._renderTransactionsList()}
        </div>
        <div class="finances-sidebar">
          ${this._renderDonutChart(monthTx)}
          ${this._renderBudgets()}
        </div>
      </div>` : ''}
      ${this.activeTab === 'comptes' ? this._renderAccountsTab() : ''}
      ${this.activeTab === 'abonnements' ? this._renderSubscriptionsTab() : ''}
      ${this.activeTab === 'stats' ? this._renderStatsTab() : ''}
      ${this._renderTransactionModal()}
      ${this._renderBudgetModal()}
      ${this._renderAccountModal()}
      ${this._renderSubscriptionModal()}
    `;

    this._bindEvents();
    if (this.activeTab === 'transactions') this._renderCharts(monthTx);
    if (this.activeTab === 'stats') this._renderStatsCharts();
  },

  _renderBalanceHero(balance, income, expense) {
    const isPos = balance >= 0;
    return `
      <div class="balance-hero widget anim-fade-up">
        <div class="balance-main">
          <span class="balance-label">Solde total</span>
          <span class="balance-amount ${isPos ? 'text-success' : 'text-danger'}" style="font-family:'Fraunces',serif">
            ${fmtCurrency(balance)}
          </span>
        </div>
        <div class="balance-stats">
          <div class="balance-stat">
            <span class="balance-stat-icon text-success">${Icons.trendUp}</span>
            <div>
              <span class="balance-stat-val text-success">+${fmtCurrency(income)}</span>
              <span class="balance-stat-label">Revenus (mois)</span>
            </div>
          </div>
          <div class="balance-stat">
            <span class="balance-stat-icon text-danger">${Icons.trendDown}</span>
            <div>
              <span class="balance-stat-val text-danger">-${fmtCurrency(expense)}</span>
              <span class="balance-stat-label">Dépenses (mois)</span>
            </div>
          </div>
        </div>
        <button class="btn btn-primary" id="btn-new-transaction">
          ${Icons.plus} Ajouter
        </button>
      </div>
    `;
  },

  _renderFilters() {
    return `
      <div class="finances-filters">
        <div class="filter-chips">
          <button class="filter-chip ${this.filterType === 'all' ? 'active' : ''}" data-filter="all">Tout</button>
          <button class="filter-chip ${this.filterType === 'income' ? 'active' : ''}" data-filter="income">Revenus</button>
          <button class="filter-chip ${this.filterType === 'expense' ? 'active' : ''}" data-filter="expense">Dépenses</button>
        </div>
        <input type="month" id="finance-month" class="form-input form-input-sm" value="${this.filterMonth}"/>
      </div>
    `;
  },

  _renderTransactionsList() {
    const monthTx = this.transactions.filter(t => t.date.startsWith(this.filterMonth));
    const filtered = this.filterType === 'all' ? monthTx : monthTx.filter(t => t.type === this.filterType);
    const sorted   = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    return `
      <div class="section-header">
        <h3 class="section-title">Transactions (${sorted.length})</h3>
      </div>
      <div class="transactions-list">
        ${sorted.length ? sorted.map(t => this._renderTransactionItem(t)).join('')
          : '<p class="empty-state">Aucune transaction ce mois-ci.</p>'}
      </div>
    `;
  },

  _renderTransactionItem(t) {
    const cat = this.CATEGORIES.find(c => c.key === t.category) || this.CATEGORIES.at(-1);
    const isIncome = t.type === 'income';
    return `
      <div class="transaction-item hover-lift" data-id="${t.id}">
        <div class="tx-cat-icon" style="background:${cat.color}22;color:${cat.color}">
          <span>${cat.emoji}</span>
        </div>
        <div class="tx-body">
          <span class="tx-desc">${t.description || cat.label}</span>
          <span class="tx-meta">${cat.label} · ${DateUtils.format(t.date)}</span>
        </div>
        <span class="tx-amount ${isIncome ? 'text-success' : 'text-danger'}">
          ${isIncome ? '+' : '-'}${fmtCurrency(t.amount)}
        </span>
        <div class="tx-actions">
          <button class="btn-icon btn-icon-sm tx-edit" data-id="${t.id}">${Icons.edit}</button>
          <button class="btn-icon btn-icon-sm btn-danger-ghost tx-delete" data-id="${t.id}">${Icons.trash}</button>
        </div>
      </div>
    `;
  },

  _renderDonutChart(monthTx) {
    const expenseTx = monthTx.filter(t => t.type === 'expense');
    const byCategory = {};
    expenseTx.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });
    const segments = Object.entries(byCategory).map(([key, value]) => {
      const cat = this.CATEGORIES.find(c => c.key === key) || this.CATEGORIES.at(-1);
      return { label: cat.label, value, color: cat.color };
    }).sort((a, b) => b.value - a.value).slice(0, 6);

    return `
      <div class="widget" style="margin-bottom:1.25rem">
        <div class="widget-header"><span class="widget-title">Répartition dépenses</span></div>
        <div class="donut-wrap">
          <div id="finances-donut"></div>
          <div class="donut-legend">
            ${segments.map(s => `
              <div class="donut-legend-item">
                <span class="donut-dot" style="background:${s.color}"></span>
                <span class="donut-label">${s.label}</span>
                <span class="donut-val">${fmtCurrency(s.value)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  _renderBudgets() {
    return `
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">Budgets</span>
          <button class="btn-icon btn-icon-sm" id="btn-new-budget" data-tip="Nouveau budget">${Icons.plus}</button>
        </div>
        <div id="budgets-list">
          ${this.budgets.length ? this.budgets.map(b => this._renderBudgetRow(b)).join('')
            : '<p class="empty-state-sm">Aucun budget défini.</p>'}
        </div>
      </div>
    `;
  },

  _renderBudgetRow(b) {
    const cat  = this.CATEGORIES.find(c => c.key === b.category) || this.CATEGORIES.at(-1);
    const spent = this.transactions
      .filter(t => t.type === 'expense' && t.category === b.category && t.date.startsWith(this.filterMonth))
      .reduce((s, t) => s + t.amount, 0);
    const pct = Math.min(spent / (b.amount || 1) * 100, 100);
    const color = pct >= 100 ? 'var(--accent-red)' : pct > 80 ? 'var(--accent-orange)' : cat.color;
    return `
      <div class="budget-row">
        <div class="budget-row-header">
          <span>${cat.emoji} ${cat.label}</span>
          <span>${fmtCurrency(spent)} / ${fmtCurrency(b.amount)}</span>
          <button class="btn-icon btn-icon-xs btn-danger-ghost budget-delete" data-id="${b.id}">${Icons.trash}</button>
        </div>
        <div class="macro-bar-track">
          <div class="macro-bar-fill" style="width:${pct}%;background:${color};transition:width 0.8s"></div>
        </div>
      </div>
    `;
  },

  _renderTransactionModal() {
    return `
      <div id="transaction-modal" class="modal hidden">
        <div class="modal-box modal-sm anim-scale-in">
          <div class="modal-header">
            <h3 class="modal-title" id="tx-modal-title">Nouvelle transaction</h3>
            <button class="btn-icon" id="tx-modal-close">${Icons.close}</button>
          </div>
          <div class="modal-body">
            <div class="tx-type-toggle">
              <button class="tx-type-btn active" data-txtype="expense">💸 Dépense</button>
              <button class="tx-type-btn" data-txtype="income">💰 Revenu</button>
            </div>
            <div class="form-group">
              <label class="form-label">Montant (€) *</label>
              <input type="number" id="tx-amount" class="form-input" placeholder="0.00" min="0" step="0.01" data-focus/>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Catégorie</label>
                <select id="tx-category" class="form-select">
                  ${this.CATEGORIES.map(c => `<option value="${c.key}">${c.emoji} ${c.label}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Date</label>
                <input type="date" id="tx-date" class="form-input" value="${DateUtils.today()}"/>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <input type="text" id="tx-desc" class="form-input" placeholder="Détail optionnel"/>
            </div>
            <div class="modal-footer-btns">
              <button class="btn btn-ghost" id="tx-cancel">Annuler</button>
              <button class="btn btn-primary" id="btn-save-tx">Enregistrer</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _renderBudgetModal() {
    return `
      <div id="budget-modal" class="modal hidden">
        <div class="modal-box modal-xs anim-scale-in">
          <div class="modal-header">
            <h3 class="modal-title">Nouveau budget</h3>
            <button class="btn-icon" data-close-modal="budget-modal">${Icons.close}</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Catégorie</label>
              <select id="budget-category" class="form-select">
                ${this.CATEGORIES.filter(c => !['salaire','freelance'].includes(c.key))
                  .map(c => `<option value="${c.key}">${c.emoji} ${c.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Limite mensuelle (€)</label>
              <input type="number" id="budget-amount" class="form-input" placeholder="500" min="1"/>
            </div>
            <div class="modal-footer-btns">
              <button class="btn btn-ghost" data-close-modal="budget-modal">Annuler</button>
              <button class="btn btn-primary" id="btn-save-budget">Créer</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /* ── STATS TAB ── */
  _renderStatsTab() {
    const now   = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }

    /* Per-month totals */
    const monthData = months.map(m => {
      const txs = this.transactions.filter(t => t.date.startsWith(m));
      const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const label = new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'short' });
      return { month: m, inc, exp, sav: inc - exp, label };
    });

    /* YTD */
    const ytdStart = now.getFullYear() + '-01';
    const ytdTx    = this.transactions.filter(t => t.date >= ytdStart + '-01');
    const ytdInc   = ytdTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const ytdExp   = ytdTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const ytdSav   = ytdInc - ytdExp;
    const savRate  = ytdInc > 0 ? Math.round((ytdSav / ytdInc) * 100) : 0;

    /* This month top categories */
    const thisMonthKey = now.toISOString().slice(0, 7);
    const thisTx = this.transactions.filter(t => t.date.startsWith(thisMonthKey) && t.type === 'expense');
    const catTotals = {};
    thisTx.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    const topCats = Object.entries(catTotals)
      .map(([key, val]) => ({ key, val, cat: this.CATEGORIES.find(c => c.key === key) || this.CATEGORIES.at(-1) }))
      .sort((a, b) => b.val - a.val).slice(0, 5);
    const maxCat = topCats[0]?.val || 1;

    /* Savings streak: consecutive months with positive savings */
    let streak = 0;
    for (let i = monthData.length - 1; i >= 0; i--) {
      if (monthData[i].sav > 0) streak++; else break;
    }

    /* Last vs this month */
    const cur  = monthData.at(-1);
    const prev = monthData.at(-2);
    const expDiff = prev?.exp > 0 ? Math.round(((cur.exp - prev.exp) / prev.exp) * 100) : 0;

    return `
    <div class="stats-tab anim-fade-up">

      <!-- KPI row -->
      <div class="stats-kpi-row">
        <div class="stats-kpi-card hover-lift stagger-1">
          <div class="stats-kpi-icon" style="background:var(--accent-green-dim)">💰</div>
          <div class="stats-kpi-val counter" id="skpi-ytd-inc">${fmtCurrency(ytdInc)}</div>
          <div class="stats-kpi-label">Revenus YTD</div>
        </div>
        <div class="stats-kpi-card hover-lift stagger-2">
          <div class="stats-kpi-icon" style="background:var(--accent-red-dim)">💸</div>
          <div class="stats-kpi-val counter" id="skpi-ytd-exp">${fmtCurrency(ytdExp)}</div>
          <div class="stats-kpi-label">Dépenses YTD</div>
        </div>
        <div class="stats-kpi-card hover-lift stagger-3">
          <div class="stats-kpi-icon" style="background:var(--accent-cyan-dim)">📈</div>
          <div class="stats-kpi-val ${ytdSav >= 0 ? 'text-success' : 'text-danger'}" id="skpi-ytd-sav">${fmtCurrency(ytdSav)}</div>
          <div class="stats-kpi-label">Épargne YTD</div>
        </div>
        <div class="stats-kpi-card hover-lift stagger-4">
          <div class="stats-kpi-icon" style="background:var(--accent-purple-dim)">🎯</div>
          <div class="stats-kpi-val" style="color:var(--accent-purple)">${savRate}%</div>
          <div class="stats-kpi-label">Taux d'épargne</div>
        </div>
      </div>

      <!-- Bar chart: 6-month income vs expense -->
      <div class="widget stats-chart-widget stagger-2">
        <div class="widget-header">
          <span class="widget-title">Revenus vs Dépenses — 6 mois</span>
          ${expDiff !== 0 ? `<span class="stats-trend-badge ${expDiff > 0 ? 'danger' : 'success'}">${expDiff > 0 ? '↑' : '↓'} ${Math.abs(expDiff)}% vs mois préc.</span>` : ''}
        </div>
        <div id="stats-bar-chart" class="stats-bar-chart-wrap">
          ${monthData.map(m => {
            const maxVal = Math.max(...monthData.map(x => Math.max(x.inc, x.exp)), 1);
            const incH = Math.round((m.inc / maxVal) * 80);
            const expH = Math.round((m.exp / maxVal) * 80);
            return `
            <div class="stats-bar-group">
              <div class="stats-bar-col">
                <div class="stats-bar inc" style="height:${incH}px" data-tip="Revenus : ${fmtCurrency(m.inc)}"></div>
                <div class="stats-bar exp" style="height:${expH}px" data-tip="Dépenses : ${fmtCurrency(m.exp)}"></div>
              </div>
              <div class="stats-bar-label">${m.label}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="stats-bar-legend">
          <span class="stats-legend-dot inc"></span><span>Revenus</span>
          <span class="stats-legend-dot exp" style="margin-left:16px"></span><span>Dépenses</span>
        </div>
      </div>

      <!-- Savings rate ring + streak -->
      <div class="stats-row-2">
        <div class="widget stats-ring-widget stagger-3">
          <div class="widget-title" style="margin-bottom:12px">Taux d'épargne</div>
          <div class="stats-ring-wrap">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10"/>
              <circle cx="50" cy="50" r="40" fill="none"
                stroke="${savRate >= 20 ? 'var(--accent-green)' : savRate >= 10 ? 'var(--accent-orange)' : 'var(--accent-red)'}"
                stroke-width="10" stroke-linecap="round"
                stroke-dasharray="${Math.round(savRate / 100 * 251.2)} 251.2"
                stroke-dashoffset="0" transform="rotate(-90 50 50)"
                style="transition:stroke-dasharray 1.2s var(--ease-out)"/>
            </svg>
            <div class="stats-ring-label">${savRate}%</div>
          </div>
          <div class="stats-ring-sub">${savRate >= 20 ? '🏆 Excellent' : savRate >= 10 ? '✅ Bien' : savRate >= 0 ? '⚠️ À améliorer' : '🔴 Déficit'}</div>
        </div>
        <div class="widget stats-streak-widget stagger-4">
          <div class="widget-title" style="margin-bottom:12px">Série d'épargne</div>
          <div class="stats-streak-num">${streak}</div>
          <div class="stats-streak-sub">mois consécutifs avec épargne positive</div>
          <div style="font-size:1.5rem;margin-top:8px">${streak >= 3 ? '🔥' : streak >= 1 ? '✨' : '💤'}</div>
        </div>
      </div>

      <!-- Top categories this month -->
      <div class="widget stagger-5">
        <div class="widget-header">
          <span class="widget-title">Top dépenses ce mois</span>
          <span style="font-size:0.75rem;color:var(--text-muted)">${new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}</span>
        </div>
        ${topCats.length ? topCats.map(({cat, val}) => `
          <div class="stats-cat-row">
            <span class="stats-cat-icon" style="background:${cat.color}22;color:${cat.color}">${cat.emoji}</span>
            <div class="stats-cat-body">
              <div class="stats-cat-label">${cat.label}</div>
              <div class="stats-cat-bar-track">
                <div class="stats-cat-bar-fill" style="width:${Math.round(val/maxCat*100)}%;background:${cat.color}"></div>
              </div>
            </div>
            <span class="stats-cat-val">${fmtCurrency(val)}</span>
          </div>
        `).join('') : '<p class="empty-state-sm">Aucune dépense ce mois.</p>'}
      </div>

      <!-- Monthly savings line -->
      <div class="widget stagger-6">
        <div class="widget-header"><span class="widget-title">Épargne mensuelle</span></div>
        <div id="stats-savings-line"></div>
        <div class="stats-months-labels">
          ${monthData.map(m => `<span>${m.label}</span>`).join('')}
        </div>
      </div>

    </div>`;
  },

  _renderStatsCharts() {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }
    const savingsPoints = months.map(m => {
      const txs = this.transactions.filter(t => t.date.startsWith(m));
      const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return inc - exp;
    });
    const el = document.getElementById('stats-savings-line');
    if (el && savingsPoints.some(v => v !== 0)) {
      Charts.line(el, savingsPoints, { width: 500, height: 70, color: 'var(--accent-cyan)', fill: true });
    } else if (el) {
      el.innerHTML = '<p class="empty-state-sm">Pas assez de données.</p>';
    }
  },

  _bindEvents() {
    /* Tab switching */
    document.querySelectorAll('.fin-tab').forEach(btn => {
      btn.addEventListener('click', () => { this.activeTab = btn.dataset.tab; this._render(); });
    });
    if (this.activeTab === 'comptes') { this._bindAccountsEvents(); return; }
    if (this.activeTab === 'abonnements') { this._bindSubscriptionsEvents(); return; }
    if (this.activeTab === 'stats') return;

    document.getElementById('btn-new-transaction')?.addEventListener('click', () => this._openModal());
    document.getElementById('tx-modal-close')?.addEventListener('click', () => this._closeModal());
    document.getElementById('tx-cancel')?.addEventListener('click', () => this._closeModal());
    document.getElementById('transaction-modal')?.addEventListener('click', e => {
      if (e.target.id === 'transaction-modal') this._closeModal();
    });

    document.querySelectorAll('.tx-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tx-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.getElementById('btn-save-tx')?.addEventListener('click', () => this._saveTx());

    document.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => { this.filterType = btn.dataset.filter; this._render(); });
    });
    document.getElementById('finance-month')?.addEventListener('change', e => {
      this.filterMonth = e.target.value;
      this._render();
    });

    document.querySelectorAll('.tx-edit').forEach(btn => {
      btn.addEventListener('click', () => this._openModal(btn.dataset.id));
    });
    document.querySelectorAll('.tx-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Supprimer cette transaction ?')) return;
        this.transactions = this.transactions.filter(t => t.id !== btn.dataset.id);
        Store.set('transactions', this.transactions);
        this._render();
        Toast.success('Transaction supprimée');
      });
    });

    document.getElementById('btn-new-budget')?.addEventListener('click', () => Modal.open('budget-modal'));
    document.getElementById('btn-save-budget')?.addEventListener('click', () => {
      const cat    = document.getElementById('budget-category')?.value;
      const amount = parseFloat(document.getElementById('budget-amount')?.value);
      if (!cat || !amount) return;
      const existing = this.budgets.find(b => b.category === cat);
      if (existing) existing.amount = amount;
      else this.budgets.push({ id: uid(), category: cat, amount });
      Store.set('budgets', this.budgets);
      Modal.close('budget-modal');
      this._render();
      Toast.success('Budget créé');
    });
    document.querySelectorAll('.budget-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        this.budgets = this.budgets.filter(b => b.id !== btn.dataset.id);
        Store.set('budgets', this.budgets);
        this._render();
        Toast.success('Budget supprimé');
      });
    });
  },

  _renderCharts(monthTx) {
    const expenseTx = monthTx.filter(t => t.type === 'expense');
    const byCategory = {};
    expenseTx.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });
    const segments = Object.entries(byCategory).map(([key, value]) => {
      const cat = this.CATEGORIES.find(c => c.key === key) || this.CATEGORIES.at(-1);
      return { label: cat.label, value, color: cat.color };
    }).sort((a, b) => b.value - a.value).slice(0, 6);
    const el = document.getElementById('finances-donut');
    if (el) Charts.donut(el, segments, { size: 120, strokeWidth: 14 });
  },

  _openModal(id = null) {
    this.editId = id;
    const title = document.getElementById('tx-modal-title');
    if (id) {
      const t = this.transactions.find(t => t.id === id);
      if (t) {
        if (title) title.textContent = 'Modifier la transaction';
        document.getElementById('tx-amount').value   = t.amount;
        document.getElementById('tx-category').value = t.category;
        document.getElementById('tx-date').value     = t.date;
        document.getElementById('tx-desc').value     = t.description || '';
        document.querySelectorAll('.tx-type-btn').forEach(b => b.classList.toggle('active', b.dataset.txtype === t.type));
      }
    } else {
      if (title) title.textContent = 'Nouvelle transaction';
      document.getElementById('tx-amount').value = '';
      document.getElementById('tx-date').value   = DateUtils.today();
      document.getElementById('tx-desc').value   = '';
      document.querySelectorAll('.tx-type-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    }
    Modal.open('transaction-modal');
  },

  _closeModal() { Modal.close('transaction-modal'); this.editId = null; },

  _saveTx() {
    const amount = parseFloat(document.getElementById('tx-amount')?.value);
    if (!amount || amount <= 0) { Toast.warning('Montant invalide'); return; }
    const type        = document.querySelector('.tx-type-btn.active')?.dataset.txtype || 'expense';
    const category    = document.getElementById('tx-category')?.value || 'autre';
    const date        = document.getElementById('tx-date')?.value || DateUtils.today();
    const description = document.getElementById('tx-desc')?.value?.trim() || '';
    const tx = { id: this.editId || uid(), type, amount, category, date, description, createdAt: DateUtils.now() };
    const idx = this.transactions.findIndex(t => t.id === tx.id);
    if (idx >= 0) this.transactions[idx] = tx;
    else this.transactions.push(tx);
    Store.set('transactions', this.transactions);
    this._closeModal();
    this._render();
    Toast.success('Transaction enregistrée');
  },

  /* ── COMPTES ── */
  _renderAccountsTab() {
    const total = this.accounts.reduce((s, a) => s + (a.balance || 0), 0);
    return `
      <div class="anim-fade-up">
        <div class="section-header" style="margin-bottom:1.25rem">
          <h3 class="section-title">Mes comptes — Total : <span style="color:var(--accent-cyan)">${fmtCurrency(total)}</span></h3>
          <button class="btn btn-primary btn-sm" id="btn-new-account">${Icons.plus} Ajouter un compte</button>
        </div>
        <div class="accounts-row">
          ${this.accounts.map(a => `
            <div class="account-card" style="border-color:${a.color}44">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
                <span style="font-size:1.5rem">${a.icon || '💳'}</span>
                <div style="display:flex;gap:4px">
                  <button class="btn-icon btn-icon-sm account-edit" data-id="${a.id}">${Icons.edit}</button>
                  <button class="btn-icon btn-icon-sm btn-danger-ghost account-delete" data-id="${a.id}">${Icons.trash}</button>
                </div>
              </div>
              <div class="account-balance" style="color:${a.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${fmtCurrency(a.balance || 0)}</div>
              <div class="account-name">${a.name}</div>
              <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:0.05em">${a.type}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  _renderAccountModal() {
    return `
      <div id="account-modal" class="modal hidden">
        <div class="modal-box modal-xs anim-scale-in">
          <div class="modal-header">
            <h3 class="modal-title" id="account-modal-title">Nouveau compte</h3>
            <button class="btn-icon" data-close-modal="account-modal">${Icons.close}</button>
          </div>
          <div class="modal-body">
            <div class="form-group"><label class="form-label">Nom du compte</label>
              <input type="text" id="account-name" class="form-input" placeholder="Compte courant"/></div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Type</label>
                <select id="account-type" class="form-select">
                  <option value="courant">💳 Courant</option>
                  <option value="epargne">🏦 Épargne</option>
                  <option value="especes">💵 Espèces</option>
                  <option value="investissement">📈 Investissement</option>
                </select></div>
              <div class="form-group"><label class="form-label">Solde initial (€)</label>
                <input type="number" id="account-balance" class="form-input" placeholder="0" step="0.01"/></div>
            </div>
            <div class="form-group"><label class="form-label">Icône</label>
              <div style="display:flex;gap:8px;flex-wrap:wrap" id="account-icon-picker">
                ${['💳','🏦','💵','💰','📈','🏠','✈️','🎯'].map(ic => `<button class="icon-pick-btn" data-icon="${ic}" style="font-size:1.4rem;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-tertiary);cursor:pointer">${ic}</button>`).join('')}
              </div>
            </div>
            <div class="modal-footer-btns">
              <button class="btn btn-ghost" data-close-modal="account-modal">Annuler</button>
              <button class="btn btn-primary" id="btn-save-account">Enregistrer</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /* ── ABONNEMENTS ── */
  _renderSubscriptionsTab() {
    const today = DateUtils.today();
    const totalMonth = this.subscriptions
      .filter(s => s.status === 'actif')
      .reduce((sum, s) => {
        if (s.frequency === 'mensuel') return sum + s.amount;
        if (s.frequency === 'annuel') return sum + s.amount / 12;
        if (s.frequency === 'hebdo') return sum + s.amount * 4.33;
        return sum;
      }, 0);

    const alerts = this.subscriptions.filter(s => {
      if (s.status !== 'actif' || !s.nextDate) return false;
      const diff = Math.round((new Date(s.nextDate) - new Date(today)) / 86400000);
      return diff <= 3 && diff >= 0;
    });

    return `
      <div class="anim-fade-up">
        ${alerts.length ? `<div class="alert-banner" style="background:var(--accent-orange)18;border:1px solid var(--accent-orange)44;border-radius:12px;padding:12px 16px;margin-bottom:16px;color:var(--accent-orange)">
          ⚠️ ${alerts.length} prélèvement(s) dans les 3 prochains jours : ${alerts.map(a => a.name).join(', ')}
        </div>` : ''}
        <div class="section-header" style="margin-bottom:1.25rem">
          <div>
            <h3 class="section-title">Abonnements</h3>
            <p style="color:var(--text-muted);font-size:0.8rem;margin-top:2px">Total actifs : ${fmtCurrency(totalMonth)}/mois · ${fmtCurrency(totalMonth * 12)}/an</p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-new-sub">${Icons.plus} Ajouter</button>
        </div>
        <div class="sub-list">
          ${this.subscriptions.length ? this.subscriptions.map(s => this._renderSubItem(s)).join('')
            : '<p class="empty-state">Aucun abonnement enregistré.</p>'}
        </div>
      </div>
    `;
  },

  _renderSubItem(s) {
    const today = DateUtils.today();
    const daysUntil = s.nextDate ? Math.round((new Date(s.nextDate) - new Date(today)) / 86400000) : null;
    const isAlert = daysUntil !== null && daysUntil <= 3 && daysUntil >= 0;
    const statusColors = { actif: 'var(--accent-green)', suspendu: 'var(--accent-orange)', annulé: 'var(--accent-red)' };
    return `
      <div class="sub-item">
        <div style="display:flex;align-items:center;gap:12px;flex:1">
          <span style="font-size:1.4rem">${s.icon || '🔁'}</span>
          <div>
            <div class="sub-name">${s.name} <span style="width:6px;height:6px;border-radius:50%;background:${statusColors[s.status]||'var(--accent-green)'};display:inline-block;margin-left:4px"></span></div>
            <div class="sub-meta">${s.frequency} · ${s.nextDate ? 'Prochain : ' + DateUtils.format(s.nextDate) : ''}</div>
            ${isAlert ? `<div class="sub-alert">⚠️ Dans ${daysUntil === 0 ? 'aujourd\'hui' : daysUntil + 'j'}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right">
          <div class="sub-amount">${fmtCurrency(s.amount)}</div>
          <div class="sub-next">${s.frequency}</div>
        </div>
        <div style="display:flex;gap:4px;margin-left:12px">
          <button class="btn-icon btn-icon-sm sub-edit" data-id="${s.id}">${Icons.edit}</button>
          <button class="btn-icon btn-icon-sm btn-danger-ghost sub-delete" data-id="${s.id}">${Icons.trash}</button>
        </div>
      </div>
    `;
  },

  _renderSubscriptionModal() {
    return `
      <div id="sub-modal" class="modal hidden">
        <div class="modal-box modal-sm anim-scale-in">
          <div class="modal-header">
            <h3 class="modal-title" id="sub-modal-title">Nouvel abonnement</h3>
            <button class="btn-icon" data-close-modal="sub-modal">${Icons.close}</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group"><label class="form-label">Nom</label>
                <input type="text" id="sub-name" class="form-input" placeholder="Netflix, Spotify…"/></div>
              <div class="form-group"><label class="form-label">Icône</label>
                <input type="text" id="sub-icon" class="form-input" placeholder="🎵" maxlength="2"/></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Montant (€)</label>
                <input type="number" id="sub-amount" class="form-input" placeholder="9.99" step="0.01" min="0"/></div>
              <div class="form-group"><label class="form-label">Fréquence</label>
                <select id="sub-frequency" class="form-select">
                  <option value="mensuel">Mensuel</option>
                  <option value="annuel">Annuel</option>
                  <option value="hebdo">Hebdomadaire</option>
                </select></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Prochain prélèvement</label>
                <input type="date" id="sub-next-date" class="form-input" value="${DateUtils.today()}"/></div>
              <div class="form-group"><label class="form-label">Statut</label>
                <select id="sub-status" class="form-select">
                  <option value="actif">Actif</option>
                  <option value="suspendu">Suspendu</option>
                  <option value="annulé">Annulé</option>
                </select></div>
            </div>
            <div class="modal-footer-btns">
              <button class="btn btn-ghost" data-close-modal="sub-modal">Annuler</button>
              <button class="btn btn-primary" id="btn-save-sub">Enregistrer</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _bindAccountsEvents() {
    document.getElementById('btn-new-account')?.addEventListener('click', () => {
      this.editAccountId = null;
      document.getElementById('account-modal-title').textContent = 'Nouveau compte';
      document.getElementById('account-name').value = '';
      document.getElementById('account-balance').value = '';
      Modal.open('account-modal');
    });
    document.getElementById('btn-save-account')?.addEventListener('click', () => {
      const name    = document.getElementById('account-name')?.value?.trim();
      if (!name) { Toast.warning('Nom requis'); return; }
      const type    = document.getElementById('account-type')?.value || 'courant';
      const balance = parseFloat(document.getElementById('account-balance')?.value) || 0;
      const icon    = document.querySelector('#account-icon-picker .icon-pick-btn.active')?.dataset.icon || '💳';
      const colors  = { courant: '#7C3AED', epargne: '#10B981', especes: '#F59E0B', investissement: '#06B6D4' };
      const acc = { id: this.editAccountId || uid(), name, type, balance, icon, color: colors[type] || '#7C3AED' };
      const idx = this.accounts.findIndex(a => a.id === acc.id);
      if (idx >= 0) this.accounts[idx] = acc;
      else this.accounts.push(acc);
      Store.set('accounts', this.accounts);
      Modal.close('account-modal');
      this._render();
      Toast.success('Compte enregistré');
    });
    document.querySelectorAll('#account-icon-picker .icon-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#account-icon-picker .icon-pick-btn').forEach(b => b.style.background = 'var(--bg-tertiary)');
        btn.style.background = 'var(--accent-purple)44';
      });
    });
    document.querySelectorAll('.account-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = this.accounts.find(a => a.id === btn.dataset.id);
        if (!a) return;
        this.editAccountId = a.id;
        document.getElementById('account-modal-title').textContent = 'Modifier le compte';
        document.getElementById('account-name').value = a.name;
        document.getElementById('account-type').value = a.type || 'courant';
        document.getElementById('account-balance').value = a.balance || 0;
        document.querySelectorAll('#account-icon-picker .icon-pick-btn').forEach(b => {
          b.style.background = b.dataset.icon === a.icon ? 'var(--accent-purple)44' : 'var(--bg-tertiary)';
        });
        Modal.open('account-modal');
      });
    });
    document.querySelectorAll('.account-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.accounts.length <= 1) { Toast.warning('Gardez au moins un compte'); return; }
        if (!confirm('Supprimer ce compte ?')) return;
        this.accounts = this.accounts.filter(a => a.id !== btn.dataset.id);
        Store.set('accounts', this.accounts);
        this._render();
        Toast.success('Compte supprimé');
      });
    });
  },

  _bindSubscriptionsEvents() {
    document.getElementById('btn-new-sub')?.addEventListener('click', () => {
      this.editSubId = null;
      document.getElementById('sub-modal-title').textContent = 'Nouvel abonnement';
      ['sub-name','sub-icon','sub-amount'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      document.getElementById('sub-next-date').value = DateUtils.today();
      Modal.open('sub-modal');
    });
    document.getElementById('btn-save-sub')?.addEventListener('click', () => {
      const name = document.getElementById('sub-name')?.value?.trim();
      const amount = parseFloat(document.getElementById('sub-amount')?.value);
      if (!name || !amount) { Toast.warning('Nom et montant requis'); return; }
      const sub = {
        id: this.editSubId || uid(),
        name,
        amount,
        icon: document.getElementById('sub-icon')?.value || '🔁',
        frequency: document.getElementById('sub-frequency')?.value || 'mensuel',
        nextDate: document.getElementById('sub-next-date')?.value || DateUtils.today(),
        status: document.getElementById('sub-status')?.value || 'actif',
        createdAt: DateUtils.now(),
      };
      const idx = this.subscriptions.findIndex(s => s.id === sub.id);
      if (idx >= 0) this.subscriptions[idx] = sub;
      else this.subscriptions.push(sub);
      Store.set('subscriptions', this.subscriptions);
      Modal.close('sub-modal');
      this._render();
      Toast.success('Abonnement enregistré');
    });
    document.querySelectorAll('.sub-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Supprimer cet abonnement ?')) return;
        this.subscriptions = this.subscriptions.filter(s => s.id !== btn.dataset.id);
        Store.set('subscriptions', this.subscriptions);
        this._render();
        Toast.success('Abonnement supprimé');
      });
    });
    document.querySelectorAll('.sub-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = this.subscriptions.find(s => s.id === btn.dataset.id);
        if (!s) return;
        this.editSubId = s.id;
        document.getElementById('sub-modal-title').textContent = 'Modifier abonnement';
        document.getElementById('sub-name').value = s.name;
        document.getElementById('sub-icon').value = s.icon || '';
        document.getElementById('sub-amount').value = s.amount;
        document.getElementById('sub-frequency').value = s.frequency;
        document.getElementById('sub-next-date').value = s.nextDate || DateUtils.today();
        document.getElementById('sub-status').value = s.status;
        Modal.open('sub-modal');
      });
    });
  },
};

Bus.on('appReady', () => Finances.init());
