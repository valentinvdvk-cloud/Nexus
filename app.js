// ============================================================
//  MyLife — Pure JS PWA
// ============================================================

// ---- Utils ----
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const fmt = d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtShort = d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const today = () => new Date().toISOString().slice(0, 10);
const pad = n => String(n).padStart(2, '0');
const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const dayNamesFull = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// ---- Storage ----
const Store = {
  get: (k, def = []) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

// ---- IndexedDB for Documents ----
const DocDB = (() => {
  let db;
  const open = () => new Promise((res, rej) => {
    if (db) return res(db);
    const req = indexedDB.open('mylife-docs', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('files');
    req.onsuccess = e => { db = e.target.result; res(db); };
    req.onerror = () => rej(req.error);
  });
  const tx = async (mode) => { const d = await open(); return d.transaction('files', mode).objectStore('files'); };
  return {
    save: async (id, buf) => { const s = await tx('readwrite'); return new Promise((res,rej) => { const r = s.put(buf,id); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); },
    load: async (id) => { const s = await tx('readonly'); return new Promise((res,rej) => { const r = s.get(id); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); },
    del: async (id) => { const s = await tx('readwrite'); return new Promise((res,rej) => { const r = s.delete(id); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); },
  };
})();

// ---- Toast ----
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ---- Modal ----
const Modal = {
  el: null, overlay: null,
  init() { this.overlay = document.getElementById('modal-overlay'); this.el = document.getElementById('modal'); },
  open(title, html, onSave) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    this.overlay.classList.add('open');
    if (onSave) {
      const btn = document.getElementById('modal-save');
      btn.style.display = '';
      btn.onclick = () => { onSave(); };
    } else {
      document.getElementById('modal-save').style.display = 'none';
    }
    const first = this.el.querySelector('input, textarea, select');
    if (first) setTimeout(() => first.focus(), 300);
  },
  close() { this.overlay.classList.remove('open'); },
};

// ===================================================================
//  AGENDA
// ===================================================================
const Agenda = (() => {
  let year = new Date().getFullYear();
  let month = new Date().getMonth();
  let selDate = today();

  const events = () => Store.get('events');
  const save = e => Store.set('events', e);

  function eventsFor(date) { return events().filter(e => e.date === date); }

  function render() {
    const sec = document.getElementById('sec-agenda');
    const t = today();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDow = (firstDay.getDay() + 6) % 7; // Mon=0

    let days = '';
    // prev month fill
    for (let i = 0; i < startDow; i++) {
      const d = new Date(year, month, -startDow + i + 1);
      days += `<div class="cal-day other-month">${d.getDate()}</div>`;
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${pad(month+1)}-${pad(d)}`;
      const evs = eventsFor(dateStr);
      const cls = [
        'cal-day',
        dateStr === t ? 'today' : '',
        dateStr === selDate && dateStr !== t ? 'selected' : ''
      ].join(' ');
      const dots = evs.slice(0,4).map(e => `<span class="dot dot-${e.color || 'default'}"></span>`).join('');
      days += `<div class="${cls}" data-date="${dateStr}">
        <span>${d}</span>
        ${dots ? `<div class="dots">${dots}</div>` : ''}
      </div>`;
    }

    const selEvs = eventsFor(selDate);
    const selLabel = new Date(selDate + 'T00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });

    sec.innerHTML = `
      <div class="card">
        <div class="cal-header">
          <button class="cal-nav" id="cal-prev">‹</button>
          <h2>${monthNames[month]} ${year}</h2>
          <button class="cal-nav" id="cal-next">›</button>
        </div>
        <div class="cal-grid">
          ${dayNames.map(d => `<div class="cal-day-name">${d}</div>`).join('')}
          ${days}
        </div>
      </div>
      <div class="events-day-title">
        <span>📅</span>
        <span style="text-transform:capitalize">${selLabel}</span>
      </div>
      ${selEvs.length === 0 ? `<div class="empty"><div class="empty-icon">🗓️</div><p>Aucun événement ce jour</p></div>` : ''}
      ${selEvs.map(e => `
        <div class="event-item color-${e.color || 'default'}">
          <div class="event-time">${e.time || '–'}</div>
          <div class="event-content">
            <div class="event-title">${e.title}</div>
            ${e.description ? `<div class="event-desc">${e.description}</div>` : ''}
          </div>
          <button class="event-delete" data-id="${e.id}" title="Supprimer">✕</button>
        </div>
      `).join('')}
    `;

    document.getElementById('cal-prev').onclick = () => { month--; if(month<0){month=11;year--;} render(); };
    document.getElementById('cal-next').onclick = () => { month++; if(month>11){month=0;year++;} render(); };
    sec.querySelectorAll('.cal-day[data-date]').forEach(el => {
      el.onclick = () => { selDate = el.dataset.date; render(); };
    });
    sec.querySelectorAll('.event-delete').forEach(btn => {
      btn.onclick = e => { e.stopPropagation(); const evs = events().filter(x => x.id !== btn.dataset.id); save(evs); render(); showToast('Événement supprimé'); };
    });
  }

  function openAddModal() {
    const html = `
      <div class="form-group"><label>Titre *</label><input id="ev-title" class="form-control" placeholder="Réunion, Rendez-vous..."></div>
      <div class="form-group"><label>Date</label><input id="ev-date" type="date" class="form-control" value="${selDate}"></div>
      <div class="form-group"><label>Heure</label><input id="ev-time" type="time" class="form-control"></div>
      <div class="form-group"><label>Description</label><textarea id="ev-desc" class="form-control" placeholder="Détails..."></textarea></div>
      <div class="form-group"><label>Couleur</label>
        <div class="color-picker">
          <div class="color-opt selected" data-color="purple" style="background:#7c3aed" title="Violet"></div>
          <div class="color-opt" data-color="blue" style="background:#2563eb" title="Bleu"></div>
          <div class="color-opt" data-color="green" style="background:#16a34a" title="Vert"></div>
          <div class="color-opt" data-color="orange" style="background:#ea580c" title="Orange"></div>
          <div class="color-opt" data-color="red" style="background:#dc2626" title="Rouge"></div>
        </div>
      </div>
    `;
    Modal.open('Nouvel événement', html, () => {
      const title = document.getElementById('ev-title').value.trim();
      if (!title) { showToast('Titre requis'); return; }
      const color = document.querySelector('.color-opt.selected')?.dataset.color || 'purple';
      const evs = events();
      evs.push({ id: uid(), title, date: document.getElementById('ev-date').value, time: document.getElementById('ev-time').value, description: document.getElementById('ev-desc').value.trim(), color, createdAt: Date.now() });
      save(evs);
      selDate = document.getElementById('ev-date').value;
      Modal.close();
      render();
      showToast('Événement ajouté ✓');
    });
    // color picker logic
    setTimeout(() => {
      document.querySelectorAll('.color-opt').forEach(opt => {
        opt.onclick = () => { document.querySelectorAll('.color-opt').forEach(o => o.classList.remove('selected')); opt.classList.add('selected'); };
      });
    }, 100);
  }

  return { render, openAddModal };
})();

// ===================================================================
//  PLANNING
// ===================================================================
const Planning = (() => {
  let weekOffset = 0;
  let openDay = null;

  const tasks = () => Store.get('tasks');
  const save = t => Store.set('tasks', t);

  function getWeekDates(offset = 0) {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - dow + offset * 7);
    return Array.from({length:7}, (_,i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return d.toISOString().slice(0,10);
    });
  }

  function render() {
    const sec = document.getElementById('sec-planning');
    const dates = getWeekDates(weekOffset);
    const t = today();
    const allTasks = tasks();
    const weekLabel = `${fmtShort(dates[0])} – ${fmtShort(dates[6])}`;

    let html = `
      <div class="week-nav">
        <button class="cal-nav" id="week-prev">‹</button>
        <h2>Semaine du ${weekLabel}</h2>
        <button class="cal-nav" id="week-next">›</button>
      </div>
    `;

    dates.forEach((date, i) => {
      const dayTasks = allTasks.filter(t => t.date === date);
      const done = dayTasks.filter(t => t.completed).length;
      const isToday = date === t;
      const isOpen = openDay === date;
      html += `
        <div class="day-column">
          <div class="day-header ${isToday ? 'is-today' : ''}" data-date="${date}">
            <div class="day-header-left">
              <span class="day-name">${dayNamesFull[i]}</span>
              <span class="day-date">${new Date(date+'T00:00').getDate()} ${monthNames[new Date(date+'T00:00').getMonth()].slice(0,3)}</span>
            </div>
            <span class="task-count">${done}/${dayTasks.length}</span>
          </div>
          <div class="day-tasks ${isOpen ? 'open' : ''}" id="tasks-${date}">
            ${dayTasks.length === 0 ? '<div style="text-align:center;padding:10px;color:var(--text-2);font-size:.8rem">Aucune tâche</div>' : ''}
            ${dayTasks.map(task => `
              <div class="task-item ${task.completed ? 'done' : ''}" data-id="${task.id}">
                <div class="task-cb ${task.completed ? 'checked' : ''}" data-task="${task.id}">${task.completed ? '✓' : ''}</div>
                <span class="task-text">${task.title}</span>
                <span class="task-prio prio-${task.priority}"></span>
                <button class="task-del" data-del="${task.id}">✕</button>
              </div>
            `).join('')}
            <div style="padding-top:4px">
              <button class="btn btn-ghost btn-sm btn-full" data-addfor="${date}">+ Ajouter une tâche</button>
            </div>
          </div>
        </div>
      `;
    });

    sec.innerHTML = html;

    document.getElementById('week-prev').onclick = () => { weekOffset--; render(); };
    document.getElementById('week-next').onclick = () => { weekOffset++; render(); };

    sec.querySelectorAll('.day-header').forEach(h => {
      h.onclick = () => {
        const d = h.dataset.date;
        openDay = openDay === d ? null : d;
        render();
      };
    });
    sec.querySelectorAll('[data-addfor]').forEach(btn => {
      btn.onclick = e => { e.stopPropagation(); openAddModal(btn.dataset.addfor); };
    });
    sec.querySelectorAll('[data-task]').forEach(cb => {
      cb.onclick = e => {
        e.stopPropagation();
        const ts = tasks();
        const idx = ts.findIndex(t => t.id === cb.dataset.task);
        if (idx >= 0) { ts[idx].completed = !ts[idx].completed; save(ts); render(); }
      };
    });
    sec.querySelectorAll('[data-del]').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        save(tasks().filter(t => t.id !== btn.dataset.del));
        render();
        showToast('Tâche supprimée');
      };
    });
  }

  function openAddModal(date) {
    openDay = date;
    const html = `
      <div class="form-group"><label>Tâche *</label><input id="task-title" class="form-control" placeholder="Nom de la tâche..."></div>
      <div class="form-group"><label>Date</label><input id="task-date" type="date" class="form-control" value="${date}"></div>
      <div class="form-group"><label>Priorité</label>
        <select id="task-prio" class="form-control">
          <option value="medium">Moyenne</option>
          <option value="high">Haute</option>
          <option value="low">Basse</option>
        </select>
      </div>
      <div class="form-group"><label>Catégorie</label><input id="task-cat" class="form-control" placeholder="Personnel, Travail..."></div>
    `;
    Modal.open('Nouvelle tâche', html, () => {
      const title = document.getElementById('task-title').value.trim();
      if (!title) { showToast('Titre requis'); return; }
      const ts = tasks();
      ts.push({ id: uid(), title, date: document.getElementById('task-date').value, priority: document.getElementById('task-prio').value, category: document.getElementById('task-cat').value.trim(), completed: false, createdAt: Date.now() });
      save(ts);
      Modal.close();
      render();
      showToast('Tâche ajoutée ✓');
    });
  }

  return { render, openAddModal: () => openAddModal(today()) };
})();

// ===================================================================
//  NOTES
// ===================================================================
const Notes = (() => {
  let filter = 'all';
  let search = '';
  let editId = null;

  const notes = () => Store.get('notes');
  const save = n => Store.set('notes', n);
  const cats = ['all','personal','work','ideas','other'];
  const catLabels = { all:'Toutes', personal:'Personnel', work:'Travail', ideas:'Idées', other:'Autre' };
  const catColors = { personal:'purple', work:'blue', ideas:'orange', other:'gray' };

  function render() {
    const sec = document.getElementById('sec-notes');
    if (editId !== null) { renderEditor(); return; }

    let ns = notes();
    if (filter !== 'all') ns = ns.filter(n => n.category === filter);
    if (search) ns = ns.filter(n => (n.title+n.content).toLowerCase().includes(search.toLowerCase()));
    ns.sort((a,b) => b.updatedAt - a.updatedAt);

    sec.innerHTML = `
      <div class="search-bar"><input id="note-search" placeholder="Rechercher..." value="${search}"></div>
      <div class="filter-tabs">
        ${cats.map(c => `<button class="tab-btn ${filter===c?'active':''}" data-cat="${c}">${catLabels[c]}</button>`).join('')}
      </div>
      ${ns.length === 0 ? '<div class="empty"><div class="empty-icon">📝</div><p>Aucune note</p></div>' : ''}
      <div class="notes-grid">
        ${ns.map(n => `
          <div class="note-card note-${n.category}" data-note="${n.id}">
            <div class="note-card-title">${n.title || 'Sans titre'}</div>
            <div class="note-card-preview">${n.content || ''}</div>
            <div class="note-card-footer">
              <span class="note-date">${fmtShort(n.updatedAt)}</span>
              <span class="badge badge-${catColors[n.category]||'gray'}">${catLabels[n.category]}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('note-search').oninput = e => { search = e.target.value; render(); };
    sec.querySelectorAll('[data-cat]').forEach(btn => { btn.onclick = () => { filter = btn.dataset.cat; render(); }; });
    sec.querySelectorAll('[data-note]').forEach(card => { card.onclick = () => { editId = card.dataset.note; render(); }; });
  }

  function renderEditor() {
    const sec = document.getElementById('sec-notes');
    const n = editId === 'new' ? { id:'new', title:'', content:'', category:'personal', createdAt:Date.now(), updatedAt:Date.now() } : notes().find(x => x.id === editId);
    if (!n) { editId = null; render(); return; }
    const catLabels2 = { personal:'Personnel', work:'Travail', ideas:'Idées', other:'Autre' };

    sec.innerHTML = `
      <button class="back-btn" id="note-back">← Retour</button>
      <div class="form-group">
        <input id="note-title-input" class="form-control" placeholder="Titre de la note" value="${n.title}" style="font-size:1.1rem;font-weight:700">
      </div>
      <div class="form-group">
        <select id="note-cat-input" class="form-control">
          ${Object.entries(catLabels2).map(([v,l]) => `<option value="${v}" ${n.category===v?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <textarea id="note-content-input" class="form-control" placeholder="Écrivez votre note ici..." style="min-height:280px">${n.content}</textarea>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-primary" id="note-save-btn" style="flex:1">💾 Sauvegarder</button>
        ${n.id !== 'new' ? `<button class="btn btn-danger" id="note-del-btn">🗑️</button>` : ''}
      </div>
    `;
    document.getElementById('note-back').onclick = () => { editId = null; render(); };
    document.getElementById('note-save-btn').onclick = () => {
      const title = document.getElementById('note-title-input').value.trim();
      const content = document.getElementById('note-content-input').value;
      const category = document.getElementById('note-cat-input').value;
      const ns = notes().filter(x => x.id !== editId);
      const now = Date.now();
      ns.push({ id: editId === 'new' ? uid() : editId, title: title || 'Sans titre', content, category, createdAt: n.createdAt, updatedAt: now });
      save(ns);
      editId = null;
      render();
      showToast('Note sauvegardée ✓');
    };
    const delBtn = document.getElementById('note-del-btn');
    if (delBtn) delBtn.onclick = () => {
      save(notes().filter(x => x.id !== editId));
      editId = null;
      render();
      showToast('Note supprimée');
    };
    // update header action
    App.updateHeaderAction();
  }

  function openNewNote() { editId = 'new'; render(); }

  return { render, openNewNote };
})();

// ===================================================================
//  SPORT
// ===================================================================
const Sport = (() => {
  const sessions = () => Store.get('sport');
  const save = s => Store.set('sport', s);
  const typeIcons = { gym:'🏋️', running:'🏃', cycling:'🚴', swimming:'🏊', yoga:'🧘', hiking:'🥾', other:'⚡' };
  const typeLabels = { gym:'Salle', running:'Course', cycling:'Vélo', swimming:'Natation', yoga:'Yoga', hiking:'Randonnée', other:'Autre' };

  function getStreak() {
    const s = sessions().map(s => s.date).sort().reverse();
    if (!s.length) return 0;
    let streak = 0, cur = today();
    for (const d of [...new Set(s)]) {
      if (d === cur) { streak++; const dt = new Date(cur); dt.setDate(dt.getDate()-1); cur = dt.toISOString().slice(0,10); }
      else if (d < cur) break;
    }
    return streak;
  }

  function thisWeekCount() {
    const dates = Array.from({length:7}, (_,i) => { const d = new Date(); d.setDate(d.getDate()-i); return d.toISOString().slice(0,10); });
    return sessions().filter(s => dates.includes(s.date)).length;
  }

  function render() {
    const sec = document.getElementById('sec-sport');
    const all = sessions().sort((a,b) => b.date.localeCompare(a.date));

    sec.innerHTML = `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-value">${getStreak()}</div><div class="stat-label">🔥 Série</div></div>
        <div class="stat-card"><div class="stat-value">${thisWeekCount()}</div><div class="stat-label">📅 Cette semaine</div></div>
        <div class="stat-card"><div class="stat-value">${all.length}</div><div class="stat-label">🏆 Total</div></div>
      </div>
      ${all.length === 0 ? '<div class="empty"><div class="empty-icon">💪</div><p>Enregistre ta première séance !</p></div>' : ''}
      ${all.map(s => `
        <div class="sport-session" data-sid="${s.id}">
          <div class="sport-icon">${typeIcons[s.type] || '⚡'}</div>
          <div class="sport-info">
            <div class="sport-type">${typeLabels[s.type] || s.type}</div>
            <div class="sport-meta">
              ${s.duration ? `⏱ ${s.duration} min` : ''}
              ${s.distance ? ` · 📍 ${s.distance} km` : ''}
              ${s.calories ? ` · 🔥 ${s.calories} kcal` : ''}
            </div>
            ${s.notes ? `<div class="sport-meta" style="margin-top:2px;font-style:italic">"${s.notes.slice(0,60)}${s.notes.length>60?'…':''}"</div>` : ''}
          </div>
          <div style="text-align:right">
            <div class="sport-date-badge">${fmtShort(s.date+'T00:00')}</div>
            <button class="btn-icon" data-sdel="${s.id}" style="margin-top:4px;width:28px;height:28px;background:#fee2e2;color:#ef4444;font-size:.85rem">✕</button>
          </div>
        </div>
      `).join('')}
    `;

    sec.querySelectorAll('[data-sdel]').forEach(btn => {
      btn.onclick = e => { e.stopPropagation(); save(sessions().filter(s => s.id !== btn.dataset.sdel)); render(); showToast('Séance supprimée'); };
    });
  }

  function openAddModal() {
    const html = `
      <div class="form-group"><label>Type de sport *</label>
        <select id="sp-type" class="form-control">
          <option value="gym">🏋️ Salle de sport</option>
          <option value="running">🏃 Course à pied</option>
          <option value="cycling">🚴 Vélo</option>
          <option value="swimming">🏊 Natation</option>
          <option value="yoga">🧘 Yoga</option>
          <option value="hiking">🥾 Randonnée</option>
          <option value="other">⚡ Autre</option>
        </select>
      </div>
      <div class="form-group"><label>Date</label><input id="sp-date" type="date" class="form-control" value="${today()}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div class="form-group"><label>Durée (min)</label><input id="sp-dur" type="number" class="form-control" placeholder="45"></div>
        <div class="form-group"><label>Distance (km)</label><input id="sp-dist" type="number" step="0.1" class="form-control" placeholder="5"></div>
        <div class="form-group"><label>Calories</label><input id="sp-cal" type="number" class="form-control" placeholder="300"></div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="sp-notes" class="form-control" placeholder="Comment s'est passée la séance ?"></textarea></div>
      <div class="form-group">
        <label>Exercices (optionnel)</label>
        <div id="exercises-list"></div>
        <button class="add-exercise-btn" id="add-ex-btn">+ Ajouter un exercice</button>
      </div>
    `;
    Modal.open('Nouvelle séance', html, () => {
      const type = document.getElementById('sp-type').value;
      const exercises = [];
      document.querySelectorAll('.ex-row').forEach(row => {
        const name = row.querySelector('.ex-name')?.value.trim();
        if (name) exercises.push({ name, sets: row.querySelector('.ex-sets')?.value, reps: row.querySelector('.ex-reps')?.value, weight: row.querySelector('.ex-weight')?.value });
      });
      const ss = sessions();
      ss.push({ id: uid(), type, date: document.getElementById('sp-date').value, duration: +document.getElementById('sp-dur').value || null, distance: +document.getElementById('sp-dist').value || null, calories: +document.getElementById('sp-cal').value || null, notes: document.getElementById('sp-notes').value.trim(), exercises, createdAt: Date.now() });
      save(ss);
      Modal.close();
      render();
      showToast('Séance enregistrée ✓');
    });
    setTimeout(() => {
      document.getElementById('add-ex-btn').onclick = () => addExerciseRow();
    }, 100);
  }

  function addExerciseRow() {
    const list = document.getElementById('exercises-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'exercise-row ex-row';
    row.innerHTML = `
      <input class="form-control ex-name" placeholder="Exercice" style="flex:2">
      <input class="form-control ex-sets sm" type="number" placeholder="Séries" style="flex:1">
      <input class="form-control ex-reps sm" type="number" placeholder="Reps" style="flex:1">
      <input class="form-control ex-weight sm" type="number" placeholder="Kg" style="flex:1">
      <button class="btn-icon" onclick="this.parentElement.remove()" style="background:#fee2e2;color:#ef4444;width:32px;height:32px;flex-shrink:0">✕</button>
    `;
    list.appendChild(row);
  }

  return { render, openAddModal };
})();

// ===================================================================
//  DOCUMENTS
// ===================================================================
const Docs = (() => {
  let folder = 'Tous';

  const meta = () => Store.get('docs-meta');
  const saveMeta = m => Store.set('docs-meta', m);
  const folders = () => ['Tous', ...new Set(meta().map(d => d.folder).filter(Boolean))];

  function fileIcon(type) {
    if (!type) return '📄';
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📕';
    if (type.includes('word') || type.includes('document')) return '📘';
    if (type.includes('sheet') || type.includes('excel')) return '📗';
    if (type.includes('presentation') || type.includes('powerpoint')) return '📙';
    if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return '🗜️';
    if (type.includes('text')) return '📃';
    return '📄';
  }

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' Ko';
    return (bytes/1048576).toFixed(1) + ' Mo';
  }

  function render() {
    const sec = document.getElementById('sec-docs');
    let docs = meta();
    if (folder !== 'Tous') docs = docs.filter(d => d.folder === folder);
    docs.sort((a,b) => b.createdAt - a.createdAt);
    const fols = folders();

    sec.innerHTML = `
      <div class="folder-bar">
        ${fols.map(f => `<div class="folder-chip ${folder===f?'active':''}" data-folder="${f}">${f === 'Tous' ? '📁 Tous' : '📂 '+f}</div>`).join('')}
        <div class="folder-chip" id="new-folder-btn">+ Nouveau dossier</div>
      </div>
      <div class="upload-zone" id="upload-zone">
        <div class="upload-icon">☁️</div>
        <p>Cliquez ou déposez des fichiers ici</p>
        <p style="font-size:.75rem;margin-top:4px;opacity:.7">Images, PDF, documents...</p>
      </div>
      <input type="file" id="file-input" multiple>
      ${docs.length === 0 ? '<div class="empty"><div class="empty-icon">📁</div><p>Aucun document dans ce dossier</p></div>' : ''}
      ${docs.map(d => `
        <div class="doc-item">
          <div class="doc-icon">${fileIcon(d.type)}</div>
          <div class="doc-info">
            <div class="doc-name">${d.name}</div>
            <div class="doc-meta">${fmtSize(d.size)} · ${fmt(d.createdAt)} ${d.folder ? '· 📂 '+d.folder : ''}</div>
          </div>
          <div class="doc-actions">
            <button class="btn-icon" data-download="${d.id}" title="Télécharger" style="font-size:1rem">⬇️</button>
            <button class="btn-icon" data-ddel="${d.id}" title="Supprimer" style="background:#fee2e2;color:#ef4444;font-size:1rem">✕</button>
          </div>
        </div>
      `).join('')}
    `;

    sec.querySelector('#upload-zone').onclick = () => document.getElementById('file-input').click();
    document.getElementById('file-input').onchange = e => handleFiles(e.target.files);
    sec.querySelectorAll('[data-folder]').forEach(el => { el.onclick = () => { folder = el.dataset.folder; render(); }; });
    document.getElementById('new-folder-btn')?.addEventListener('click', e => { e.stopPropagation(); openFolderModal(); });

    sec.querySelectorAll('[data-download]').forEach(btn => {
      btn.onclick = async () => {
        const doc = meta().find(d => d.id === btn.dataset.download);
        if (!doc) return;
        try {
          const buf = await DocDB.load(doc.id);
          const blob = new Blob([buf], { type: doc.type });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = doc.name; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch { showToast('Erreur de téléchargement'); }
      };
    });
    sec.querySelectorAll('[data-ddel]').forEach(btn => {
      btn.onclick = async () => {
        await DocDB.del(btn.dataset.ddel);
        saveMeta(meta().filter(d => d.id !== btn.dataset.ddel));
        render();
        showToast('Document supprimé');
      };
    });

    // Drag & drop
    const zone = sec.querySelector('#upload-zone');
    if (zone) {
      zone.ondragover = e => { e.preventDefault(); zone.classList.add('drag'); };
      zone.ondragleave = () => zone.classList.remove('drag');
      zone.ondrop = e => { e.preventDefault(); zone.classList.remove('drag'); handleFiles(e.dataTransfer.files); };
    }
  }

  async function handleFiles(files) {
    if (!files.length) return;
    const curFolder = folder !== 'Tous' ? folder : '';
    let count = 0;
    for (const file of files) {
      const id = uid();
      const buf = await file.arrayBuffer();
      await DocDB.save(id, buf);
      const ms = meta();
      ms.push({ id, name: file.name, size: file.size, type: file.type, folder: curFolder, createdAt: Date.now() });
      saveMeta(ms);
      count++;
    }
    render();
    showToast(`${count} fichier${count>1?'s':''} importé${count>1?'s':''} ✓`);
  }

  function openFolderModal() {
    Modal.open('Nouveau dossier', `
      <div class="form-group"><label>Nom du dossier</label><input id="folder-name" class="form-control" placeholder="Travail, Personnel, Photos..."></div>
    `, () => {
      const name = document.getElementById('folder-name').value.trim();
      if (!name) { showToast('Nom requis'); return; }
      folder = name;
      Modal.close();
      render();
    });
  }

  function openAddModal() { document.getElementById('file-input')?.click(); }

  return { render, openAddModal };
})();

// ===================================================================
//  APP CONTROLLER
// ===================================================================
const App = {
  current: 'agenda',
  sections: {
    agenda: { label: 'Agenda', icon: '📅', module: Agenda },
    planning: { label: 'Planning', icon: '📋', module: Planning },
    notes: { label: 'Notes', icon: '📝', module: Notes },
    sport: { label: 'Sport', icon: '💪', module: Sport },
    docs: { label: 'Documents', icon: '📁', module: Docs },
  },

  init() {
    Modal.init();
    this.buildNav();
    this.navigate('agenda');
    this.registerSW();
    this.installPrompt();
  },

  buildNav() {
    const nav = document.getElementById('bottom-nav');
    nav.innerHTML = Object.entries(this.sections).map(([id, s]) => `
      <button class="nav-item" data-nav="${id}">
        <span class="nav-icon">${s.icon}</span>
        <span>${s.label}</span>
      </button>
    `).join('');
    nav.querySelectorAll('[data-nav]').forEach(btn => {
      btn.onclick = () => this.navigate(btn.dataset.nav);
    });
  },

  navigate(id) {
    this.current = id;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.nav === id));
    document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === 'sec-' + id));
    document.getElementById('header-title').textContent = this.sections[id].label;
    this.sections[id].module.render();
    this.updateHeaderAction();
    document.getElementById('content').scrollTop = 0;
  },

  updateHeaderAction() {
    const addBtn = document.getElementById('header-add');
    addBtn.style.display = ['notes'].includes(this.current) ? 'none' : '';
    // For notes editor view, hide add button
    const notesSec = document.getElementById('sec-notes');
    if (this.current === 'notes' && notesSec.querySelector('.back-btn')) {
      addBtn.style.display = 'none';
    } else if (this.current !== 'notes') {
      addBtn.style.display = '';
    } else {
      addBtn.style.display = '';
    }
  },

  handleAdd() {
    const actions = {
      agenda: () => Agenda.openAddModal(),
      planning: () => Planning.openAddModal(),
      notes: () => Notes.openNewNote(),
      sport: () => Sport.openAddModal(),
      docs: () => Docs.openAddModal(),
    };
    actions[this.current]?.();
  },

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  },

  installPrompt() {
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      const btn = document.getElementById('install-btn');
      if (btn) {
        btn.style.display = '';
        btn.onclick = () => {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(() => { deferredPrompt = null; btn.style.display = 'none'; });
        };
      }
    });
    window.addEventListener('appinstalled', () => {
      const btn = document.getElementById('install-btn');
      if (btn) btn.style.display = 'none';
    });
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
