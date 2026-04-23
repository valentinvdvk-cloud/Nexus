/* ═══════════════════════════════════════════════════════════
   NEXUS APP — agenda.js
   Calendar · Events · Week view · Drag & drop
═══════════════════════════════════════════════════════════ */

const Agenda = {
  events: [],
  viewDate: new Date(),
  viewMode: 'month',
  selectedDate: null,
  editId: null,

  EVENT_COLORS: [
    { key: 'purple', label: 'Violet',  hex: '#7C3AED' },
    { key: 'cyan',   label: 'Cyan',    hex: '#06B6D4' },
    { key: 'green',  label: 'Vert',    hex: '#10B981' },
    { key: 'orange', label: 'Orange',  hex: '#F59E0B' },
    { key: 'red',    label: 'Rouge',   hex: '#EF4444' },
    { key: 'pink',   label: 'Rose',    hex: '#EC4899' },
  ],

  init() {
    this.events = Store.get('agenda_events', []);
    this.selectedDate = DateUtils.today();
    this._render();
    Bus.on('moduleActivated', ({ module }) => { if (module === 'agenda') this._render(); });
  },

  _render() {
    this.events = Store.get('agenda_events', []);
    const c = document.getElementById('agenda-container');
    if (!c) return;
    c.innerHTML = `
      <div class="agenda-layout anim-fade-up">
        <div class="agenda-main">
          ${this._renderCalendarHeader()}
          ${this.viewMode === 'month' ? this._renderMonthGrid() : this._renderWeekView()}
          <div id="day-events-panel" class="day-events-panel">
            ${this._renderDayEvents(this.selectedDate)}
          </div>
        </div>
        <div class="agenda-sidebar">
          ${this._renderUpcoming()}
        </div>
      </div>
      ${this._renderEventModal()}
    `;
    this._bindCalendar();
    this._bindModal();
  },

  _renderCalendarHeader() {
    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const label = this.viewMode === 'month'
      ? `${months[this.viewDate.getMonth()]} ${this.viewDate.getFullYear()}`
      : `Semaine du ${DateUtils.format(DateUtils.startOfWeek(this.viewDate))}`;
    return `
      <div class="cal-header">
        <div class="cal-nav">
          <button class="btn-icon" id="cal-prev">${Icons.chevronLeft}</button>
          <span class="cal-title">${label}</span>
          <button class="btn-icon" id="cal-next">${Icons.chevronRight}</button>
        </div>
        <div class="cal-view-btns">
          <button class="btn btn-sm ${this.viewMode === 'month' ? 'btn-primary' : 'btn-outline'}" id="cal-view-month">Mois</button>
          <button class="btn btn-sm ${this.viewMode === 'week' ? 'btn-primary' : 'btn-outline'}" id="cal-view-week">Semaine</button>
          <button class="btn btn-primary btn-sm" id="btn-new-event">${Icons.plus} Événement</button>
        </div>
      </div>
    `;
  },

  _renderMonthGrid() {
    const year = this.viewDate.getFullYear(), month = this.viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7;
    const today    = DateUtils.today();
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    let cells = '';
    let d = 1 - startDow;
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++, d++) {
        const date = new Date(year, month, d);
        const iso  = date.toISOString().slice(0, 10);
        const isCurrentMonth = date.getMonth() === month;
        const isToday = iso === today;
        const isSelected = iso === this.selectedDate;
        const dayEvents = this.events.filter(e => e.date === iso);
        cells += `
          <div class="cal-cell ${isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${iso}">
            <span class="cal-day-num">${date.getDate()}</span>
            <div class="cal-dots">
              ${dayEvents.slice(0, 3).map(ev => {
                const col = this.EVENT_COLORS.find(c => c.key === ev.color) || this.EVENT_COLORS[0];
                return `<span class="cal-dot" style="background:${col.hex}" data-tip="${ev.title}"></span>`;
              }).join('')}
              ${dayEvents.length > 3 ? `<span class="cal-dot-more">+${dayEvents.length - 3}</span>` : ''}
            </div>
          </div>
        `;
      }
    }
    return `
      <div class="cal-grid-wrap">
        <div class="cal-days-header">
          ${days.map(d => `<div class="cal-day-head">${d}</div>`).join('')}
        </div>
        <div class="cal-grid" id="cal-grid">${cells}</div>
      </div>
    `;
  },

  _renderWeekView() {
    const weekStart = new Date(this.viewDate);
    const dow = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - dow);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const days  = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
    const today = DateUtils.today();

    const columns = days.map(d => {
      const iso = d.toISOString().slice(0, 10);
      const dayEvs = this.events.filter(e => e.date === iso && e.time);
      const isToday = iso === today;
      const evHtml = dayEvs.map(ev => {
        const [h, m] = (ev.time || '09:00').split(':').map(Number);
        const top = (h * 60 + m) * (60 / 60);
        const colObj = this.EVENT_COLORS.find(c => c.key === ev.color) || this.EVENT_COLORS[0];
        return `
          <div class="week-event" style="top:${top}px;background:${colObj.hex}20;border-left:3px solid ${colObj.hex}" data-id="${ev.id}">
            <span class="week-event-time">${ev.time}</span>
            <span class="week-event-title">${ev.title}</span>
          </div>
        `;
      }).join('');
      return `
        <div class="week-col ${isToday ? 'today-col' : ''}">
          <div class="week-col-header ${isToday ? 'today-head' : ''}">
            <span class="week-col-dow">${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'][i]}</span>
            <span class="week-col-date">${d.getDate()}</span>
          </div>
          <div class="week-col-body" data-date="${iso}" style="position:relative;height:${24*60}px">
            ${hours.map(h => `<div class="week-hour-line" style="top:${h*60}px"></div>`).join('')}
            ${evHtml}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="week-timeline-wrap">
        <div class="week-time-labels">
          ${hours.map(h => `<div class="week-time-label" style="top:${h*60}px">${String(h).padStart(2,'0')}:00</div>`).join('')}
        </div>
        <div class="week-columns" id="week-columns">${columns}</div>
      </div>
    `;
  },

  _renderDayEvents(date) {
    if (!date) return '';
    const dayEvs = this.events.filter(e => e.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const fmtDate = DateUtils.format(date, { weekday: 'long', day: 'numeric', month: 'long' });
    return `
      <div class="day-events-header">
        <h4 class="day-events-title">${fmtDate}</h4>
        <button class="btn btn-primary btn-sm" id="btn-add-day-event">${Icons.plus} Ajouter</button>
      </div>
      <div class="day-events-list">
        ${dayEvs.length ? dayEvs.map(ev => this._renderEventItem(ev)).join('') : '<p class="empty-state-sm">Aucun événement ce jour.</p>'}
      </div>
    `;
  },

  _renderEventItem(ev) {
    const col = this.EVENT_COLORS.find(c => c.key === ev.color) || this.EVENT_COLORS[0];
    return `
      <div class="agenda-event-item" style="border-left-color:${col.hex}" data-id="${ev.id}">
        <div class="aei-dot" style="background:${col.hex}"></div>
        <div class="aei-body">
          <span class="aei-title">${ev.title}</span>
          ${ev.time ? `<span class="aei-time">${ev.time}</span>` : ''}
          ${ev.desc ? `<span class="aei-desc">${ev.desc}</span>` : ''}
        </div>
        <div class="aei-actions">
          <button class="btn-icon btn-icon-sm aei-edit" data-id="${ev.id}" data-tip="Modifier">${Icons.edit}</button>
          <button class="btn-icon btn-icon-sm btn-danger-ghost aei-delete" data-id="${ev.id}" data-tip="Supprimer">${Icons.trash}</button>
        </div>
      </div>
    `;
  },

  _renderUpcoming() {
    const today = DateUtils.today();
    const upcoming = this.events
      .filter(e => e.date >= today)
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
      .slice(0, 8);
    return `
      <div class="widget">
        <div class="widget-header"><span class="widget-title">À venir</span></div>
        <div class="upcoming-list">
          ${upcoming.length ? upcoming.map(ev => {
            const col = this.EVENT_COLORS.find(c => c.key === ev.color) || this.EVENT_COLORS[0];
            return `
              <div class="upcoming-item" data-date="${ev.date}">
                <span class="upcoming-dot" style="background:${col.hex}"></span>
                <div class="upcoming-body">
                  <span class="upcoming-title">${ev.title}</span>
                  <span class="upcoming-date">${DateUtils.format(ev.date, { day: 'numeric', month: 'short' })}${ev.time ? ' · ' + ev.time : ''}</span>
                </div>
              </div>
            `;
          }).join('') : '<p class="empty-state-sm">Aucun événement à venir.</p>'}
        </div>
      </div>
    `;
  },

  _renderEventModal() {
    return `
      <div id="event-modal" class="modal hidden">
        <div class="modal-box modal-sm anim-scale-in">
          <div class="modal-header">
            <h3 class="modal-title" id="event-modal-title">Nouvel événement</h3>
            <button class="btn-icon" id="event-modal-close">${Icons.close}</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Titre *</label>
              <input type="text" id="event-title" class="form-input" placeholder="Nom de l'événement" data-focus/>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Date *</label>
                <input type="date" id="event-date" class="form-input"/>
              </div>
              <div class="form-group">
                <label class="form-label">Heure</label>
                <input type="time" id="event-time" class="form-input"/>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea id="event-desc" class="form-textarea" rows="2" placeholder="Détails…"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Couleur</label>
              <div class="color-picker" id="event-color-picker">
                ${this.EVENT_COLORS.map(c => `
                  <button class="color-dot ${c.key === 'purple' ? 'active' : ''}" data-color="${c.key}" style="background:${c.hex}" data-tip="${c.label}"></button>
                `).join('')}
              </div>
            </div>
            <div class="modal-footer-btns">
              <button class="btn btn-ghost" id="btn-cancel-event">Annuler</button>
              <button class="btn btn-primary" id="btn-save-event">Enregistrer</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _bindCalendar() {
    document.getElementById('cal-prev')?.addEventListener('click', () => {
      if (this.viewMode === 'month') this.viewDate.setMonth(this.viewDate.getMonth() - 1);
      else this.viewDate.setDate(this.viewDate.getDate() - 7);
      this._render();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
      if (this.viewMode === 'month') this.viewDate.setMonth(this.viewDate.getMonth() + 1);
      else this.viewDate.setDate(this.viewDate.getDate() + 7);
      this._render();
    });
    document.getElementById('cal-view-month')?.addEventListener('click', () => { this.viewMode = 'month'; this._render(); });
    document.getElementById('cal-view-week')?.addEventListener('click', () => { this.viewMode = 'week'; this._render(); });
    document.getElementById('btn-new-event')?.addEventListener('click', () => this._openModal());
    document.getElementById('btn-add-day-event')?.addEventListener('click', () => this._openModal(null, this.selectedDate));

    document.getElementById('cal-grid')?.addEventListener('click', e => {
      const cell = e.target.closest('.cal-cell');
      if (!cell) return;
      this.selectedDate = cell.dataset.date;
      document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      const panel = document.getElementById('day-events-panel');
      if (panel) panel.innerHTML = this._renderDayEvents(this.selectedDate);
      this._bindDayEvents();
    });

    document.querySelectorAll('[data-date]').forEach(el => {
      el.addEventListener('click', e => {
        const item = e.target.closest('.upcoming-item');
        if (item) { this.selectedDate = item.dataset.date; this._render(); }
      });
    });

    this._bindDayEvents();
  },

  _bindDayEvents() {
    document.querySelectorAll('.aei-edit').forEach(btn => {
      btn.addEventListener('click', () => this._openModal(btn.dataset.id));
    });
    document.querySelectorAll('.aei-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Supprimer cet événement ?')) return;
        this.events = this.events.filter(e => e.id !== btn.dataset.id);
        Store.set('agenda_events', this.events);
        this._render();
        Toast.success('Événement supprimé');
      });
    });
    document.getElementById('btn-add-day-event')?.addEventListener('click', () => this._openModal(null, this.selectedDate));
  },

  _bindModal() {
    document.getElementById('event-modal-close')?.addEventListener('click', () => this._closeModal());
    document.getElementById('btn-cancel-event')?.addEventListener('click', () => this._closeModal());
    document.getElementById('event-modal')?.addEventListener('click', e => {
      if (e.target.id === 'event-modal') this._closeModal();
    });

    document.getElementById('event-color-picker')?.addEventListener('click', e => {
      const dot = e.target.closest('.color-dot');
      if (!dot) return;
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
    });

    document.getElementById('btn-save-event')?.addEventListener('click', () => this._saveEvent());
  },

  _openModal(id = null, defaultDate = null) {
    this.editId = id;
    const titleEl = document.getElementById('event-modal-title');
    const titleIn = document.getElementById('event-title');
    const dateIn  = document.getElementById('event-date');
    const timeIn  = document.getElementById('event-time');
    const descIn  = document.getElementById('event-desc');

    if (id) {
      const ev = this.events.find(e => e.id === id);
      if (ev) {
        if (titleEl) titleEl.textContent = 'Modifier l\'événement';
        if (titleIn) titleIn.value = ev.title;
        if (dateIn)  dateIn.value  = ev.date;
        if (timeIn)  timeIn.value  = ev.time || '';
        if (descIn)  descIn.value  = ev.desc || '';
        document.querySelectorAll('.color-dot').forEach(d => {
          d.classList.toggle('active', d.dataset.color === ev.color);
        });
      }
    } else {
      if (titleEl) titleEl.textContent = 'Nouvel événement';
      if (titleIn) titleIn.value = '';
      if (dateIn)  dateIn.value  = defaultDate || DateUtils.today();
      if (timeIn)  timeIn.value  = '';
      if (descIn)  descIn.value  = '';
      document.querySelectorAll('.color-dot').forEach((d, i) => d.classList.toggle('active', i === 0));
    }
    Modal.open('event-modal');
  },

  _closeModal() {
    Modal.close('event-modal');
    this.editId = null;
  },

  _saveEvent() {
    const title = document.getElementById('event-title')?.value?.trim();
    if (!title) { Toast.warning('Le titre est obligatoire'); return; }
    const date  = document.getElementById('event-date')?.value || DateUtils.today();
    const time  = document.getElementById('event-time')?.value || '';
    const desc  = document.getElementById('event-desc')?.value?.trim() || '';
    const color = document.querySelector('.color-dot.active')?.dataset.color || 'purple';

    const ev = { id: this.editId || uid(), title, date, time, desc, color, createdAt: DateUtils.now() };
    const idx = this.events.findIndex(e => e.id === ev.id);
    if (idx >= 0) this.events[idx] = ev;
    else this.events.push(ev);

    Store.set('agenda_events', this.events);
    this._closeModal();
    this.selectedDate = date;
    this._render();
    Toast.success('Événement enregistré');
  },
};

Bus.on('appReady', () => Agenda.init());
