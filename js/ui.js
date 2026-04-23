/* ═══════════════════════════════════════════════════════════
   NEXUS APP — ui.js
   Custom cursor · Notifications · Theme · Keyboard · Misc UI
═══════════════════════════════════════════════════════════ */

/* ── CUSTOM CURSOR ── */
const Cursor = {
  dot: null,
  ring: null,
  pos: { x: 0, y: 0 },
  ring_pos: { x: 0, y: 0 },
  raf: null,
  active: false,

  init() {
    this.dot  = document.getElementById('cursor-dot');
    this.ring = document.getElementById('cursor-ring');
    if (!this.dot || !this.ring) return;
    this.active = true;
    document.addEventListener('mousemove', e => {
      this.pos.x = e.clientX;
      this.pos.y = e.clientY;
    });
    document.addEventListener('mouseenter', () => this._show());
    document.addEventListener('mouseleave', () => this._hide());
    this._loop();
  },

  _loop() {
    if (!this.active) return;
    this.dot.style.transform  = `translate(${this.pos.x}px, ${this.pos.y}px) translate(-50%, -50%)`;
    this.ring_pos.x += (this.pos.x - this.ring_pos.x) * 0.12;
    this.ring_pos.y += (this.pos.y - this.ring_pos.y) * 0.12;
    this.ring.style.transform = `translate(${this.ring_pos.x}px, ${this.ring_pos.y}px) translate(-50%, -50%)`;
    this.raf = requestAnimationFrame(() => this._loop());
  },

  _show() {
    if (this.dot)  this.dot.style.opacity  = '1';
    if (this.ring) this.ring.style.opacity = '1';
  },
  _hide() {
    if (this.dot)  this.dot.style.opacity  = '0';
    if (this.ring) this.ring.style.opacity = '0';
  },
  expand() {
    if (this.dot)  { this.dot.style.width  = '14px'; this.dot.style.height  = '14px'; }
    if (this.ring) { this.ring.style.width = '52px'; this.ring.style.height = '52px'; }
  },
  contract() {
    if (this.dot)  { this.dot.style.width  = '8px';  this.dot.style.height  = '8px'; }
    if (this.ring) { this.ring.style.width = '36px'; this.ring.style.height = '36px'; }
  },
  destroy() {
    this.active = false;
    cancelAnimationFrame(this.raf);
    const wrap = document.getElementById('custom-cursor');
    if (wrap) wrap.style.display = 'none';
  },
};

/* ── CONTEXT MENU ── */
const ContextMenu = {
  el: null,
  init() {
    this.el = document.createElement('div');
    this.el.className = 'context-menu hidden';
    document.body.appendChild(this.el);
    document.addEventListener('click', () => this.hide());
    document.addEventListener('contextmenu', e => {
      const trigger = e.target.closest('[data-context]');
      if (!trigger) return;
      e.preventDefault();
      const items = JSON.parse(trigger.dataset.context || '[]');
      this.show(e.clientX, e.clientY, items);
    });
  },
  show(x, y, items) {
    this.el.innerHTML = items.map(item =>
      item.sep ? `<div class="ctx-sep"></div>` :
      `<button class="ctx-item ${item.danger ? 'danger' : ''}" data-action="${item.action || ''}">
         <span class="ctx-icon">${Icons[item.icon] || ''}</span>
         <span>${item.label}</span>
         ${item.shortcut ? `<span class="ctx-shortcut">${item.shortcut}</span>` : ''}
       </button>`
    ).join('');
    const vw = window.innerWidth, vh = window.innerHeight;
    let lx = x, ly = y;
    this.el.classList.remove('hidden');
    const w = this.el.offsetWidth, h = this.el.offsetHeight;
    if (lx + w > vw) lx = vw - w - 8;
    if (ly + h > vh) ly = vh - h - 8;
    this.el.style.left = lx + 'px';
    this.el.style.top  = ly + 'px';
    this.el.querySelectorAll('.ctx-item').forEach(btn => {
      btn.addEventListener('click', () => {
        Bus.emit('contextAction', btn.dataset.action);
        this.hide();
      });
    });
  },
  hide() { this.el?.classList.add('hidden'); },
};

/* ── TOOLTIP ── */
const Tooltip = {
  el: null,
  timer: null,
  init() {
    this.el = document.createElement('div');
    this.el.className = 'tooltip hidden';
    document.body.appendChild(this.el);

    document.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-tip]');
      if (!t) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this._show(t), 400);
    });
    document.addEventListener('mouseout', e => {
      if (!e.target.closest('[data-tip]')) return;
      clearTimeout(this.timer);
      this.el.classList.add('hidden');
    });
  },
  _show(el) {
    const text = el.dataset.tip;
    if (!text) return;
    this.el.textContent = text;
    this.el.classList.remove('hidden');
    const r = el.getBoundingClientRect();
    const tw = this.el.offsetWidth;
    let left = r.left + r.width / 2 - tw / 2;
    let top  = r.top - this.el.offsetHeight - 8;
    if (left < 8) left = 8;
    if (left + tw > window.innerWidth - 8) left = window.innerWidth - tw - 8;
    if (top < 8) top = r.bottom + 8;
    this.el.style.left = left + 'px';
    this.el.style.top  = top  + 'px';
  },
};

/* ── SETTINGS MODAL ── */
const Settings = {
  init() {
    const btn = document.getElementById('settings-btn');
    if (btn) btn.addEventListener('click', () => Modal.open('settings-modal'));
    this._bindControls();
  },
  _bindControls() {
    /* Theme chips */
    document.querySelectorAll('[data-set-theme]').forEach(el => {
      el.addEventListener('click', () => {
        AppState.setTheme(el.dataset.setTheme);
        document.querySelectorAll('[data-set-theme]').forEach(e => e.classList.toggle('active', e.dataset.setTheme === el.dataset.setTheme));
        Toast.success('Thème : ' + el.textContent.trim());
      });
    });
    /* Sync active theme chip on open */
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      document.querySelectorAll('[data-set-theme]').forEach(e => e.classList.toggle('active', e.dataset.setTheme === AppState.theme));
      this._loadProfileFields();
    });
    /* User profile fields */
    const nameInput = document.getElementById('setting-username');
    if (nameInput) {
      nameInput.value = AppState.user.name;
      nameInput.addEventListener('change', () => {
        AppState.user.name = nameInput.value.trim() || 'Valentin';
        AppState.save();
        Toast.success('Profil mis à jour');
      });
    }
    /* Export */
    document.getElementById('btn-export')?.addEventListener('click', () => exportData());
    document.getElementById('btn-import')?.addEventListener('click', () => document.getElementById('import-file')?.click());
    document.getElementById('import-file')?.addEventListener('change', e => importData(e.target.files[0]));
    document.getElementById('btn-reset')?.addEventListener('click', () => {
      if (confirm('Supprimer TOUTES les données NEXUS ? Cette action est irréversible.')) {
        Store.clear();
        Toast.success('Données supprimées');
        setTimeout(() => location.reload(), 1000);
      }
    });
    /* Cursor toggle */
    document.getElementById('setting-cursor')?.addEventListener('change', e => {
      if (e.target.checked) Cursor.init(); else Cursor.destroy();
      Store.set('cursorEnabled', e.target.checked);
    });
    const cursorSetting = document.getElementById('setting-cursor');
    if (cursorSetting) cursorSetting.checked = Store.get('cursorEnabled', true);

    /* Save profile fields */
    ['setting-email','setting-age','setting-weight','setting-height','setting-gender'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => this._saveProfileFields());
    });
  },
  _loadProfileFields() {
    const p = AppState.user;
    const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    set('setting-username', p.name);
    set('setting-email', p.email);
    set('setting-age', p.age);
    set('setting-weight', p.weight);
    set('setting-height', p.height);
    set('setting-gender', p.gender);
  },
  _saveProfileFields() {
    const get = id => document.getElementById(id)?.value;
    AppState.user = {
      ...AppState.user,
      name:   get('setting-username')?.trim() || AppState.user.name,
      email:  get('setting-email'),
      age:    parseInt(get('setting-age')) || undefined,
      weight: parseFloat(get('setting-weight')) || undefined,
      height: parseInt(get('setting-height')) || undefined,
      gender: get('setting-gender') || 'm',
    };
    AppState.save();
  },
};

/* ══════════════════════════════════════
   TRANSFERT DE DONNÉES (export / import)
══════════════════════════════════════ */

function _getDataSummary() {
  return {
    seances:      (Store.get('workout_sessions') || []).length,
    evenements:   (Store.get('agenda_events')    || []).length,
    transactions: (Store.get('transactions')     || []).length,
    notes:        (Store.get('notes')            || []).length,
    contacts:     (Store.get('contacts')         || []).length,
    repas:        (Store.get('nutrition_meals')  || []).length,
  };
}

function exportData() {
  const payload = { _nexus: true, _version: '2', _exported: new Date().toISOString(), _summary: _getDataSummary() };
  Store.keys().forEach(k => { payload[k] = Store.get(k); });
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `nexus-backup-${DateUtils.today()}.nexus`;
  a.click();
  URL.revokeObjectURL(url);
  Toast.success('Backup téléchargé ✓');
}

function importData(file, mode = 'replace') {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data._nexus) { Toast.error('Fichier non reconnu — choisissez un fichier .nexus NEXUS'); return; }
      const keys = Object.keys(data).filter(k => !k.startsWith('_'));
      if (mode === 'merge') {
        // Fusion : ajoute les entrées sans écraser les existantes
        keys.forEach(k => {
          const existing = Store.get(k);
          const incoming = data[k];
          if (Array.isArray(existing) && Array.isArray(incoming)) {
            const existingIds = new Set(existing.map(x => x.id).filter(Boolean));
            const merged = [...existing, ...incoming.filter(x => !existingIds.has(x.id))];
            Store.set(k, merged);
          } else if (existing === null || existing === undefined) {
            Store.set(k, incoming);
          }
        });
        Toast.success('Données fusionnées ✓ — rechargement…');
      } else {
        keys.forEach(k => Store.set(k, data[k]));
        Toast.success('Données restaurées ✓ — rechargement…');
      }
      setTimeout(() => location.reload(), 1200);
    } catch { Toast.error('Fichier invalide ou corrompu'); }
  };
  reader.readAsText(file);
}

/* ── Panel transfert (modal dédié) ── */
const Transfert = {
  open() {
    const s = _getDataSummary();
    const existing = document.getElementById('transfert-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'transfert-modal';
    modal.className = 'transfert-modal-overlay';
    modal.innerHTML = `
      <div class="transfert-modal">
        <button class="btn-close" id="transfert-close" aria-label="Fermer">✕</button>
        <div class="transfert-header">
          <div class="transfert-icon">📦</div>
          <h2 class="transfert-title">Transfert de données</h2>
          <p class="transfert-sub">Sauvegardez vos données ou restaurez-les sur un autre appareil</p>
        </div>

        <div class="transfert-summary">
          <div class="transfert-stat"><span class="ts-val">${s.seances}</span><span class="ts-label">Séances</span></div>
          <div class="transfert-stat"><span class="ts-val">${s.evenements}</span><span class="ts-label">Événements</span></div>
          <div class="transfert-stat"><span class="ts-val">${s.transactions}</span><span class="ts-label">Transactions</span></div>
          <div class="transfert-stat"><span class="ts-val">${s.notes}</span><span class="ts-label">Notes</span></div>
          <div class="transfert-stat"><span class="ts-val">${s.contacts}</span><span class="ts-label">Contacts</span></div>
          <div class="transfert-stat"><span class="ts-val">${s.repas}</span><span class="ts-label">Repas</span></div>
        </div>

        <div class="transfert-section">
          <h3>📤 Exporter</h3>
          <p>Télécharge un fichier <code>.nexus</code> avec toutes vos données. Ouvrez-le ensuite sur l'autre appareil.</p>
          <button class="btn btn-primary transfert-btn" id="transfert-export-btn">
            Télécharger le backup
          </button>
        </div>

        <div class="transfert-section">
          <h3>📥 Importer</h3>
          <p>Choisissez un fichier <code>.nexus</code> précédemment exporté depuis NEXUS.</p>
          <div class="transfert-import-options">
            <label class="transfert-radio">
              <input type="radio" name="import-mode" value="replace" checked>
              <span><b>Remplacer</b> — écrase toutes les données actuelles</span>
            </label>
            <label class="transfert-radio">
              <input type="radio" name="import-mode" value="merge">
              <span><b>Fusionner</b> — ajoute sans écraser l'existant</span>
            </label>
          </div>
          <label class="btn btn-outline transfert-btn" for="transfert-import-file">
            Choisir un fichier .nexus
          </label>
          <input type="file" id="transfert-import-file" accept=".nexus,.json" style="display:none"/>
          <div id="transfert-file-name" class="transfert-filename"></div>
        </div>
      </div>`;

    document.body.appendChild(modal);

    modal.addEventListener('click', e => { if (e.target === modal) this.close(); });
    document.getElementById('transfert-close').addEventListener('click', () => this.close());
    document.getElementById('transfert-export-btn').addEventListener('click', () => exportData());
    document.getElementById('transfert-import-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const mode = modal.querySelector('input[name="import-mode"]:checked')?.value || 'replace';
      document.getElementById('transfert-file-name').textContent = `📄 ${file.name}`;
      if (confirm(`${mode === 'merge' ? 'Fusionner' : 'Restaurer'} depuis "${file.name}" ?`)) {
        importData(file, mode);
      }
    });

    requestAnimationFrame(() => modal.classList.add('open'));
  },

  close() {
    const modal = document.getElementById('transfert-modal');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 300);
  },
};

/* ── ABOUT / CREDITS ── */
const About = {
  init() {
    const btn = document.getElementById('about-btn');
    if (btn) btn.addEventListener('click', () => Modal.open('about-modal'));
  },
};

/* ── POMODORO MINI PLAYER ── */
const PomodoroMini = {
  init() {
    const mini = document.getElementById('pomodoro-mini');
    if (!mini) return;
    mini.addEventListener('click', () => Router.navigate('pomodoro'));
  },
  update(label, progress) {
    const timeEl = document.getElementById('mini-pom-time');
    const ringFill = document.getElementById('mini-pom-ring');
    if (timeEl) timeEl.textContent = label;
    if (ringFill) {
      const r = 16, circ = 2 * Math.PI * r;
      ringFill.style.strokeDashoffset = circ * (1 - progress);
    }
  },
  show() { document.getElementById('pomodoro-mini')?.classList.remove('hidden'); },
  hide() { document.getElementById('pomodoro-mini')?.classList.add('hidden'); },
};

/* ── DRAG & DROP HELPER ── */
const DnD = {
  init(containerSelector, itemSelector, onReorder) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    let dragging = null;
    container.addEventListener('dragstart', e => {
      dragging = e.target.closest(itemSelector);
      if (!dragging) return;
      dragging.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    container.addEventListener('dragend', () => {
      dragging?.classList.remove('dragging');
      container.querySelectorAll('.drag-over-item').forEach(el => el.classList.remove('drag-over-item'));
      dragging = null;
    });
    container.addEventListener('dragover', e => {
      e.preventDefault();
      const target = e.target.closest(itemSelector);
      if (!target || target === dragging) return;
      target.classList.add('drag-over-item');
      const rect = target.getBoundingClientRect();
      const mid  = rect.top + rect.height / 2;
      container.insertBefore(dragging, e.clientY < mid ? target : target.nextSibling);
    });
    container.addEventListener('dragleave', e => {
      e.target.closest(itemSelector)?.classList.remove('drag-over-item');
    });
    container.addEventListener('drop', e => {
      e.preventDefault();
      if (onReorder) {
        const ids = [...container.querySelectorAll(itemSelector)].map(el => el.dataset.id);
        onReorder(ids);
      }
    });
  },
};

/* ── INTERSECTION OBSERVER (lazy animations) ── */
const LazyAnim = {
  observer: null,
  init() {
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('anim-fade-up');
          this.observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
  },
  observe(el) { this.observer?.observe(el); },
};

/* ── CONFETTI (celebrate PRs / streaks) ── */
const Confetti = {
  burst(x = window.innerWidth / 2, y = window.innerHeight / 3) {
    const colors = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      el.style.cssText = `
        position:fixed;z-index:9999;pointer-events:none;
        width:${4 + Math.random() * 6}px;height:${4 + Math.random() * 10}px;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        left:${x}px;top:${y}px;
        transition:none;
      `;
      document.body.appendChild(el);
      const angle = (Math.random() * 360) * Math.PI / 180;
      const velocity = 4 + Math.random() * 8;
      const vx = Math.cos(angle) * velocity;
      let vy = Math.sin(angle) * velocity - 4;
      let px = x, py = y, opacity = 1;
      const tick = () => {
        vy += 0.25;
        px += vx; py += vy;
        opacity -= 0.02;
        el.style.left = px + 'px';
        el.style.top  = py + 'px';
        el.style.opacity = opacity;
        if (opacity > 0) requestAnimationFrame(tick);
        else el.remove();
      };
      requestAnimationFrame(tick);
    }
  },
};

/* ── SVG CHARTS ── */
const Charts = {
  bar(container, data, opts = {}) {
    const { width = 300, height = 120, color = 'var(--accent-purple)', label = true } = opts;
    if (!data.length) return;
    const max = Math.max(...data.map(d => d.value), 1);
    const bw  = (width - (data.length - 1) * 6) / data.length;
    const bars = data.map((d, i) => {
      const bh  = (d.value / max) * (height - 24);
      const x   = i * (bw + 6);
      const y   = height - 24 - bh;
      return `
        <rect class="chart-bar" x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="${color}" data-tip="${d.label}: ${d.value}"/>
        ${label ? `<text x="${x + bw/2}" y="${height - 4}" text-anchor="middle" fill="var(--text-muted)" font-size="9">${d.label}</text>` : ''}
      `;
    }).join('');
    container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${bars}</svg>`;
  },

  donut(container, segments, opts = {}) {
    const { size = 120, strokeWidth = 12 } = opts;
    const r     = (size - strokeWidth) / 2;
    const circ  = 2 * Math.PI * r;
    const cx    = size / 2, cy = size / 2;
    const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
    let offset  = 0;
    const arcs  = segments.map(seg => {
      const dash = (seg.value / total) * circ;
      const gap  = circ - dash;
      const arc  = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}"
        stroke-width="${strokeWidth}" stroke-dasharray="${dash} ${gap}"
        stroke-dashoffset="${-offset}" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += dash;
      return arc;
    }).join('');
    container.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="${strokeWidth}"/>
      ${arcs}
    </svg>`;
  },

  line(container, points, opts = {}) {
    const { width = 300, height = 80, color = 'var(--accent-cyan)', fill = true } = opts;
    if (points.length < 2) return;
    const minV = Math.min(...points), maxV = Math.max(...points, minV + 1);
    const xs = points.map((_, i) => (i / (points.length - 1)) * width);
    const ys = points.map(v => height - 8 - ((v - minV) / (maxV - minV)) * (height - 16));
    const pathD = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ');
    const areaD = pathD + ` L ${width} ${height} L 0 ${height} Z`;
    container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none">
      ${fill ? `<path d="${areaD}" fill="${color}" opacity="0.12"/>` : ''}
      <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chart-line"/>
      ${xs.map((x, i) => `<circle cx="${x}" cy="${ys[i]}" r="3" fill="${color}"/>`).join('')}
    </svg>`;
  },

  heatmap(container, data, opts = {}) {
    const { weeks = 17, colors = ['rgba(124,58,237,0.1)', 'rgba(124,58,237,0.3)', 'rgba(124,58,237,0.6)', 'rgba(124,58,237,0.85)', 'rgba(124,58,237,1)'] } = opts;
    const cellSize = 12, gap = 3;
    const totalW = weeks * (cellSize + gap);
    const cells = [];
    const today = new Date();
    for (let w = weeks - 1; w >= 0; w--) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (w * 7 + (6 - d)));
        const dateStr = date.toISOString().slice(0, 10);
        const val = data[dateStr] || 0;
        const maxVal = Math.max(...Object.values(data), 1);
        const intensity = val > 0 ? Math.min(4, Math.ceil((val / maxVal) * 4)) : 0;
        const x = ((weeks - 1 - w)) * (cellSize + gap);
        const y = d * (cellSize + gap);
        cells.push(`<rect class="heatmap-cell" x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${colors[intensity]}" data-tip="${dateStr}: ${val}"/>`);
      }
    }
    container.innerHTML = `<svg viewBox="0 0 ${totalW} ${7 * (cellSize + gap)}" width="${totalW}">${cells.join('')}</svg>`;
  },
};

/* ── SWIPE GESTURES (mobile) ── */
const SwipeGestures = {
  startX: 0, startY: 0,
  THRESHOLD: 80,

  init() {
    document.addEventListener('touchstart', e => {
      this.startX = e.touches[0].clientX;
      this.startY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - this.startX;
      const dy = e.changedTouches[0].clientY - this.startY;
      if (Math.abs(dx) < this.THRESHOLD) return;
      if (Math.abs(dy) > Math.abs(dx) * 0.5) return;
      if (e.target.closest('.scroll-x, .sa-body, .auth-card, .modal-box, .horizontal-scroll')) return;

      const modules = AppState.modules || [];
      const current = modules.indexOf(AppState.currentModule);
      if (current === -1) return;
      if (dx < 0 && current < modules.length - 1) Router.navigate(modules[current + 1]);
      else if (dx > 0 && current > 0)             Router.navigate(modules[current - 1]);
    }, { passive: true });
  },

  initModalSwipe(modal) {
    let startY = 0;
    modal.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
    modal.addEventListener('touchend', e => {
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 80) Modal.close(modal.id);
    }, { passive: true });
  },
};

/* ── AVATAR MENU & PROFILE MODAL ── */
const ProfileMenu = {
  open: false,

  init() {
    const wrap = document.getElementById('avatar-wrap');
    const btn  = document.getElementById('avatar-btn');
    const dd   = document.getElementById('avatar-dropdown');
    if (!btn || !dd) return;

    btn.addEventListener('click', e => {
      e.stopPropagation();
      this.open = !this.open;
      dd.classList.toggle('hidden', !this.open);
      if (this.open) this._populateDropdown();
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#avatar-wrap')) {
        dd.classList.add('hidden');
        this.open = false;
      }
    });

    /* Dropdown actions */
    document.getElementById('avatar-dd-profile')?.addEventListener('click', () => {
      dd.classList.add('hidden');
      this.open = false;
      this._openProfileModal();
    });
    document.getElementById('avatar-dd-sync')?.addEventListener('click', () => {
      dd.classList.add('hidden');
      this.open = false;
      if (window.Sync?.enabled) Sync.forceSync();
      else Toast.info('Firebase non configuré — mode local');
    });
    document.getElementById('avatar-dd-export')?.addEventListener('click', () => {
      dd.classList.add('hidden'); this.open = false; exportData();
    });
    document.getElementById('avatar-import-file')?.addEventListener('change', e => {
      importData(e.target.files[0]);
      e.target.value = '';
    });
    document.getElementById('avatar-dd-signout')?.addEventListener('click', async () => {
      dd.classList.add('hidden'); this.open = false;
      if (!confirm('Se déconnecter ?')) return;
      await this._signout();
    });
    document.querySelectorAll('[data-dd-theme]').forEach(chip => {
      chip.addEventListener('click', e => {
        e.stopPropagation();
        const t = chip.dataset.ddTheme;
        AppState.setTheme(t);
        document.querySelectorAll('[data-dd-theme]').forEach(c => c.classList.toggle('active', c.dataset.ddTheme === t));
        document.querySelectorAll('[data-set-theme]').forEach(c => c.classList.toggle('active', c.dataset.setTheme === t));
      });
    });

    /* Profile modal bindings */
    this._bindProfileModal();

    /* Initial avatar render */
    this._refreshAvatar();
    Bus.on('appReady', () => this._refreshAvatar());
  },

  _populateDropdown() {
    const u = AppState.user;
    document.getElementById('avatar-dd-name').textContent  = u.name  || 'Utilisateur';
    document.getElementById('avatar-dd-email').textContent = u.email || (Auth?.localMode ? 'Mode local' : '—');
    /* Theme chips */
    const t = AppState.theme;
    document.querySelectorAll('[data-dd-theme]').forEach(c => c.classList.toggle('active', c.dataset.ddTheme === t));
    /* Avatar in header */
    const av = Store.get('nexus_avatar');
    const ddImg = document.getElementById('avatar-dd-img');
    const ddIni = document.getElementById('avatar-dd-initials');
    if (av && ddImg) {
      ddImg.src = av; ddImg.classList.remove('hidden');
      if (ddIni) ddIni.style.display = 'none';
    } else {
      if (ddImg) ddImg.classList.add('hidden');
      if (ddIni) { ddIni.style.display = ''; ddIni.textContent = (u.name || 'V')[0].toUpperCase(); }
    }
  },

  _refreshAvatar() {
    const u  = AppState.user;
    const av = Store.get('nexus_avatar');
    const img = document.getElementById('avatar-img');
    const ini = document.getElementById('avatar-initials');
    if (av && img) {
      img.src = av; img.classList.remove('hidden');
      if (ini) ini.style.display = 'none';
    } else {
      if (img) img.classList.add('hidden');
      if (ini) { ini.style.display = ''; ini.textContent = (u.name || 'V')[0].toUpperCase(); }
    }
  },

  _openProfileModal() {
    const u = AppState.user;
    /* Populate fields */
    const set = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
    set('profile-display-name', u.name);
    set('profile-email-display', u.email || (Auth?.localMode ? 'Mode local' : ''));
    set('profile-age',    u.age);
    set('profile-weight', u.weight);
    set('profile-height', u.height);
    set('profile-gender', u.gender || 'm');

    /* Avatar preview */
    const av = Store.get('nexus_avatar');
    const prev = document.getElementById('profile-avatar-preview');
    const letter = document.getElementById('profile-avatar-letter');
    if (av && prev) {
      prev.src = av; prev.classList.remove('hidden');
      if (letter) letter.style.display = 'none';
      document.getElementById('btn-remove-avatar').style.display = '';
    } else {
      if (prev) prev.classList.add('hidden');
      if (letter) { letter.style.display = ''; letter.textContent = (u.name || 'V')[0].toUpperCase(); }
      document.getElementById('btn-remove-avatar').style.display = 'none';
    }
    Modal.open('profile-modal');
  },

  _bindProfileModal() {
    /* Avatar upload */
    document.getElementById('profile-avatar-input')?.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      if (file.size > 2 * 1024 * 1024) { Toast.error('Image trop lourde (max 2 Mo)'); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        const b64 = ev.target.result;
        Store.set('nexus_avatar', b64);
        const prev = document.getElementById('profile-avatar-preview');
        const letter = document.getElementById('profile-avatar-letter');
        if (prev) { prev.src = b64; prev.classList.remove('hidden'); }
        if (letter) letter.style.display = 'none';
        document.getElementById('btn-remove-avatar').style.display = '';
        this._refreshAvatar();
        /* Sync to Firestore if online */
        if (window.Sync?.enabled && window.firebaseDb && AppState.user.uid) {
          const { doc, setDoc } = window.fbFunctions || {};
          if (doc && setDoc) {
            setDoc(doc(window.firebaseDb, 'users', AppState.user.uid, 'profile', 'avatar'), { b64, updatedAt: Date.now() }, { merge: true }).catch(() => {});
          }
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });

    /* Remove avatar */
    document.getElementById('btn-remove-avatar')?.addEventListener('click', () => {
      Store.remove('nexus_avatar');
      const prev = document.getElementById('profile-avatar-preview');
      const letter = document.getElementById('profile-avatar-letter');
      if (prev) prev.classList.add('hidden');
      if (letter) { letter.style.display = ''; letter.textContent = (AppState.user.name || 'V')[0].toUpperCase(); }
      document.getElementById('btn-remove-avatar').style.display = 'none';
      this._refreshAvatar();
      Toast.success('Photo supprimée');
    });

    /* Save profile */
    document.getElementById('btn-save-profile')?.addEventListener('click', () => {
      const get = id => document.getElementById(id)?.value;
      AppState.user = {
        ...AppState.user,
        name:   get('profile-display-name')?.trim() || AppState.user.name,
        age:    parseInt(get('profile-age'))    || undefined,
        weight: parseFloat(get('profile-weight')) || undefined,
        height: parseInt(get('profile-height')) || undefined,
        gender: get('profile-gender') || 'm',
      };
      AppState.save();
      this._refreshAvatar();
      /* Sync profile to Firestore */
      if (window.Sync?.enabled && window.firebaseDb && AppState.user.uid) {
        const { doc, setDoc } = window.fbFunctions || {};
        if (doc && setDoc) {
          setDoc(doc(window.firebaseDb, 'users', AppState.user.uid, 'profile', 'info'), {
            displayName: AppState.user.name,
            age:    AppState.user.age,
            weight: AppState.user.weight,
            height: AppState.user.height,
            gender: AppState.user.gender,
            updatedAt: Date.now()
          }, { merge: true }).catch(() => {});
        }
      }
      Toast.success('Profil enregistré');
      Modal.close('profile-modal');
    });

    /* Change password */
    document.getElementById('btn-change-password')?.addEventListener('click', async () => {
      const email = AppState.user.email;
      if (!email) { Toast.error('Aucun email associé à ce compte'); return; }
      if (!window.firebaseAuth || !window.fbFunctions?.sendPasswordResetEmail) {
        Toast.info('Fonctionnalité Firebase requise'); return;
      }
      try {
        await window.fbFunctions.sendPasswordResetEmail(window.firebaseAuth, email);
        Toast.success('Email de réinitialisation envoyé à ' + email);
      } catch (err) {
        Toast.error('Erreur : ' + (err.message || 'inconnue'));
      }
    });

    /* Delete account */
    document.getElementById('btn-delete-account')?.addEventListener('click', async () => {
      const first = confirm('⚠️ Supprimer définitivement ton compte ? Toutes les données seront effacées.');
      if (!first) return;
      const second = confirm('DERNIÈRE CONFIRMATION — cette action est irréversible.');
      if (!second) return;
      if (!window.firebaseAuth?.currentUser) {
        /* Local mode — just clear storage */
        Store.clear();
        Toast.success('Données supprimées');
        setTimeout(() => location.reload(), 1000);
        return;
      }
      try {
        /* Delete Firestore data then delete auth user */
        if (window.firebaseDb && AppState.user.uid) {
          const { collection, getDocs, deleteDoc, doc } = window.fbFunctions || {};
          if (collection && getDocs && deleteDoc && doc) {
            const colls = ['workouts','events','transactions','notes','contacts','food_log','pomodoro_log','budgets','subscriptions','accounts','profile'];
            for (const c of colls) {
              const snap = await getDocs(collection(window.firebaseDb, 'users', AppState.user.uid, c));
              for (const d of snap.docs) await deleteDoc(d.ref);
            }
          }
        }
        await window.firebaseAuth.currentUser.delete();
        Store.clear();
        Toast.success('Compte supprimé');
        setTimeout(() => location.reload(), 1200);
      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          Toast.error('Reconnecte-toi d\'abord puis réessaie');
        } else {
          Toast.error('Erreur : ' + (err.message || 'inconnue'));
        }
      }
    });
  },

  async _signout() {
    if (window.firebaseAuth && window.fbFunctions?.signOut) {
      try { await window.fbFunctions.signOut(window.firebaseAuth); } catch {}
    }
    if (window.Sync) {
      Object.values(Sync.syncListeners || {}).forEach(u => { try { u(); } catch {} });
      Sync.syncListeners = {}; Sync.enabled = false;
    }
    Store.remove('auth_uid');
    Store.remove('auth_local_mode');
    Auth.show();
  },
};

/* ── FIREBASE STATUS BAR BINDINGS ── */
const FirebaseStatusBar = {
  init() {
    document.getElementById('btn-force-sync')?.addEventListener('click', () => {
      if (window.Sync?.enabled) Sync.forceSync();
      else Toast.info('Firebase non configuré — mode local');
      document.getElementById('firebase-status')?.classList.remove('open');
    });

    document.getElementById('btn-signout')?.addEventListener('click', async () => {
      if (!confirm('Se déconnecter ?')) return;
      if (window.firebaseAuth && window.fbFunctions?.signOut) {
        try { await window.fbFunctions.signOut(window.firebaseAuth); } catch {}
      }
      /* Détache listeners */
      if (window.Sync) {
        Object.values(Sync.syncListeners).forEach(unsub => { try { unsub(); } catch {} });
        Sync.syncListeners = {};
        Sync.enabled = false;
      }
      Store.remove('auth_uid');
      Store.remove('auth_local_mode');
      Auth.show();
    });

    document.getElementById('firebase-status')?.addEventListener('click', function() {
      this.classList.toggle('open');
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#firebase-status')) {
        document.getElementById('firebase-status')?.classList.remove('open');
      }
    });

    /* Si Firebase non configuré, on cache l'indicateur (mode local silencieux) */
    window.addEventListener('firebase-ready', () => {
      if (!window._firebaseReady) {
        const fs = document.getElementById('firebase-status');
        if (fs) fs.style.display = 'none';
      }
    });
  },
};

/* ── UI INIT (called after DOMContentLoaded) ── */
Bus.on('appReady', () => {
  if (Store.get('cursorEnabled', true) && window.innerWidth >= 768) Cursor.init();
  ContextMenu.init();
  Tooltip.init();
  Settings.init();
  About.init();
  PomodoroMini.init();
  LazyAnim.init();
  SwipeGestures.init();
  FirebaseStatusBar.init();
  ProfileMenu.init();

  /* Init modal swipe on all modals */
  document.querySelectorAll('.modal').forEach(m => SwipeGestures.initModalSwipe(m));

  /* Ripple on all buttons */
  document.querySelectorAll('.btn, .btn-icon, .nav-item').forEach(el => addRipple(el));

  /* Mobile overlay sidebar close */
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.remove('sidebar-mobile-open');
    document.getElementById('sidebar-overlay')?.classList.add('hidden');
  });

  /* Mobile menu toggle */
  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('sidebar-mobile-open');
    document.getElementById('sidebar-overlay')?.classList.toggle('hidden');
  });

  /* Status bar en mode local */
  if (Auth.localMode || !window._firebaseReady) {
    const dot = document.getElementById('status-dot');
    const lbl = document.getElementById('status-label');
    if (dot) dot.className = 'status-dot offline';
    if (lbl) lbl.textContent = 'Mode local';
  }
});

/* ── BOOT SEQUENCE (auth check avant appReady) ── */
document.addEventListener('DOMContentLoaded', async () => {
  /* Attend que Firebase soit prêt (ou timeout 2s) */
  await new Promise(resolve => {
    if (window._firebaseReady !== undefined) return resolve();
    const timeout = setTimeout(resolve, 2000);
    window.addEventListener('firebase-ready', () => { clearTimeout(timeout); resolve(); }, { once: true });
  });

  /* Vérifie la session */
  const isAuth = await Auth.initCheck();
  if (!isAuth) {
    Auth.show();
  } else {
    /* Lance l'app normalement */
    Bus.emit('appReady', {});
  }
});
