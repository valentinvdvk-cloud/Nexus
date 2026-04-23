/* ═══════════════════════════════════════════════════════════
   NEXUS APP — notes.js
   Rich text editor · Categories · Search · Export
═══════════════════════════════════════════════════════════ */

const Notes = {
  notes: [],
  activeId: null,
  searchQuery: '',
  filterCategory: 'all',

  CATEGORIES: [
    { key: 'all',       label: 'Toutes',    color: 'var(--accent-purple)' },
    { key: 'personnel', label: 'Personnel', color: '#7C3AED' },
    { key: 'travail',   label: 'Travail',   color: '#06B6D4' },
    { key: 'idees',     label: 'Idées',     color: '#F59E0B' },
    { key: 'sante',     label: 'Santé',     color: '#10B981' },
  ],

  init() {
    this.notes = Store.get('notes', []);
    this._render();
    Bus.on('moduleActivated', ({ module }) => { if (module === 'notes') { this.notes = Store.get('notes', []); this._render(); } });
    Bus.on('openNote', id => { Router.navigate('notes'); setTimeout(() => this._openNote(id), 100); });
  },

  _render() {
    const c = document.getElementById('notes-container');
    if (!c) return;
    c.innerHTML = `
      <div class="notes-layout">
        <div class="notes-list-panel">
          ${this._renderListPanel()}
        </div>
        <div class="notes-editor-panel" id="notes-editor-panel">
          ${this.activeId ? this._renderEditor() : this._renderEditorEmpty()}
        </div>
      </div>
    `;
    this._bindList();
    if (this.activeId) this._bindEditor();
  },

  _renderListPanel() {
    const filtered = this._filteredNotes();
    return `
      <div class="notes-list-header">
        <div class="notes-search-wrap">
          <span class="notes-search-icon">${Icons.search}</span>
          <input type="text" id="notes-search" class="notes-search-input" placeholder="Rechercher…" value="${this.searchQuery}"/>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-new-note">${Icons.plus}</button>
      </div>
      <div class="notes-cat-tabs">
        ${this.CATEGORIES.map(cat => `
          <button class="notes-cat-tab ${this.filterCategory === cat.key ? 'active' : ''}" data-cat="${cat.key}">${cat.label}</button>
        `).join('')}
      </div>
      <div class="notes-list" id="notes-list">
        ${filtered.length ? filtered.map(n => this._renderNoteItem(n)).join('') : `
          <div class="notes-empty">
            <p>Aucune note.</p>
            <button class="btn btn-outline btn-sm" id="btn-new-note-empty">${Icons.plus} Créer une note</button>
          </div>
        `}
      </div>
    `;
  },

  _renderNoteItem(n) {
    const cat = this.CATEGORIES.find(c => c.key === n.category) || this.CATEGORIES[1];
    const preview = this._stripHtml(n.content || '').slice(0, 80);
    const isActive = n.id === this.activeId;
    return `
      <div class="note-item ${isActive ? 'active' : ''}" data-id="${n.id}" style="border-top-color:${cat.color}">
        <div class="note-item-header">
          <span class="note-item-title">${n.title || 'Sans titre'}</span>
          <button class="btn-icon btn-icon-xs note-delete" data-id="${n.id}">${Icons.trash}</button>
        </div>
        <p class="note-item-preview">${preview || 'Vide'}</p>
        <div class="note-item-footer">
          <span class="note-item-date">${DateUtils.relative(n.updatedAt || n.createdAt)}</span>
          <span class="note-item-cat">${cat.label}</span>
        </div>
      </div>
    `;
  },

  _renderEditor() {
    const note = this.notes.find(n => n.id === this.activeId);
    if (!note) return this._renderEditorEmpty();
    const cat = this.CATEGORIES.find(c => c.key === note.category) || this.CATEGORIES[1];
    return `
      <div class="notes-editor-wrap">
        <div class="notes-editor-header">
          <input type="text" id="note-title" class="note-title-input" placeholder="Titre de la note" value="${note.title || ''}"/>
          <div class="notes-editor-meta">
            <select id="note-category" class="form-select form-select-sm">
              ${this.CATEGORIES.filter(c => c.key !== 'all').map(c => `
                <option value="${c.key}" ${c.key === note.category ? 'selected' : ''}>${c.label}</option>
              `).join('')}
            </select>
            <span class="text-muted text-sm">${DateUtils.format(note.updatedAt || note.createdAt)}</span>
            <button class="btn btn-outline btn-sm" id="btn-export-note" data-tip="Exporter">${Icons.download}</button>
            <button class="btn btn-primary btn-sm" id="btn-save-note">Enregistrer</button>
          </div>
        </div>
        <div class="notes-toolbar" id="notes-toolbar">
          ${this._renderToolbar()}
        </div>
        <div id="note-editor" class="note-editor" contenteditable="true" spellcheck="true">${note.content || ''}</div>
      </div>
    `;
  },

  _renderEditorEmpty() {
    return `
      <div class="notes-editor-empty">
        ${Icons.notes}
        <p>Sélectionne une note ou crée-en une nouvelle.</p>
        <button class="btn btn-primary" id="btn-new-note-main">${Icons.plus} Nouvelle note</button>
      </div>
    `;
  },

  _renderToolbar() {
    const tools = [
      { cmd: 'bold',          icon: 'B',          tip: 'Gras (Ctrl+B)',    style: 'font-weight:bold' },
      { cmd: 'italic',        icon: '<i>I</i>',   tip: 'Italique (Ctrl+I)' },
      { cmd: 'underline',     icon: '<u>U</u>',   tip: 'Souligné (Ctrl+U)' },
      { cmd: 'strikeThrough', icon: '<s>S</s>',   tip: 'Barré' },
      { sep: true },
      { cmd: 'insertUnorderedList', icon: '≡', tip: 'Liste' },
      { cmd: 'insertOrderedList',   icon: '1.', tip: 'Liste numérotée' },
      { sep: true },
      { cmd: 'formatBlock', val: 'h2', icon: 'H2', tip: 'Titre 2' },
      { cmd: 'formatBlock', val: 'h3', icon: 'H3', tip: 'Titre 3' },
      { cmd: 'formatBlock', val: 'p',  icon: '¶',  tip: 'Paragraphe' },
      { sep: true },
      { cmd: 'createLink', icon: '🔗', tip: 'Lien' },
      { cmd: 'removeFormat', icon: '✗', tip: 'Supprimer le format' },
    ];
    return tools.map(t => t.sep
      ? '<span class="toolbar-sep"></span>'
      : `<button class="toolbar-btn" data-cmd="${t.cmd}" ${t.val ? `data-val="${t.val}"` : ''} data-tip="${t.tip || ''}">${t.icon}</button>`
    ).join('');
  },

  _bindList() {
    document.getElementById('notes-search')?.addEventListener('input', e => {
      this.searchQuery = e.target.value;
      this._refreshList();
    });
    document.querySelectorAll('.notes-cat-tab').forEach(btn => {
      btn.addEventListener('click', () => { this.filterCategory = btn.dataset.cat; this._refreshList(); });
    });
    document.getElementById('btn-new-note')?.addEventListener('click', () => this._newNote());
    document.getElementById('btn-new-note-empty')?.addEventListener('click', () => this._newNote());
    document.getElementById('btn-new-note-main')?.addEventListener('click', () => this._newNote());

    document.querySelectorAll('.note-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.note-delete')) return;
        this._openNote(item.dataset.id);
      });
    });
    document.querySelectorAll('.note-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm('Supprimer cette note ?')) return;
        this.notes = this.notes.filter(n => n.id !== btn.dataset.id);
        Store.set('notes', this.notes);
        if (this.activeId === btn.dataset.id) this.activeId = null;
        this._render();
        Toast.success('Note supprimée');
      });
    });
  },

  _bindEditor() {
    const editor = document.getElementById('note-editor');
    if (!editor) return;

    let saveTimer;
    const autosave = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => this._saveCurrentNote(false), 1200);
    };
    editor.addEventListener('input', autosave);
    editor.addEventListener('paste', e => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    });

    document.getElementById('btn-save-note')?.addEventListener('click', () => this._saveCurrentNote(true));

    document.getElementById('btn-export-note')?.addEventListener('click', () => this._exportNote());

    document.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        const val = btn.dataset.val || null;
        if (cmd === 'createLink') {
          const url = prompt('URL du lien :');
          if (url) document.execCommand('createLink', false, url);
        } else {
          document.execCommand(cmd, false, val);
        }
        editor.focus();
      });
    });

    document.getElementById('note-title')?.addEventListener('input', () => autosave());
    document.getElementById('note-category')?.addEventListener('change', () => this._saveCurrentNote(false));
  },

  _refreshList() {
    const listEl = document.getElementById('notes-list');
    if (!listEl) return;
    const filtered = this._filteredNotes();
    listEl.innerHTML = filtered.length
      ? filtered.map(n => this._renderNoteItem(n)).join('')
      : '<div class="notes-empty"><p>Aucune note trouvée.</p></div>';
    document.querySelectorAll('.note-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.note-delete')) return;
        this._openNote(item.dataset.id);
      });
    });
    document.querySelectorAll('.note-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm('Supprimer cette note ?')) return;
        this.notes = this.notes.filter(n => n.id !== btn.dataset.id);
        Store.set('notes', this.notes);
        if (this.activeId === btn.dataset.id) { this.activeId = null; this._render(); }
        else this._refreshList();
        Toast.success('Note supprimée');
      });
    });
    document.querySelectorAll('.notes-cat-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.cat === this.filterCategory));
  },

  _openNote(id) {
    this.activeId = id;
    const editorPanel = document.getElementById('notes-editor-panel');
    if (editorPanel) editorPanel.innerHTML = this._renderEditor();
    document.querySelectorAll('.note-item').forEach(item => item.classList.toggle('active', item.dataset.id === id));
    this._bindEditor();
  },

  _newNote() {
    const note = {
      id: uid(),
      title: '',
      content: '',
      category: this.filterCategory === 'all' ? 'personnel' : this.filterCategory,
      createdAt: DateUtils.now(),
      updatedAt: DateUtils.now(),
    };
    this.notes.unshift(note);
    Store.set('notes', this.notes);
    this.activeId = note.id;
    this._render();
    setTimeout(() => document.getElementById('note-title')?.focus(), 100);
  },

  _saveCurrentNote(showToast = false) {
    const note = this.notes.find(n => n.id === this.activeId);
    if (!note) return;
    note.title    = document.getElementById('note-title')?.value?.trim() || 'Sans titre';
    note.content  = document.getElementById('note-editor')?.innerHTML || '';
    note.category = document.getElementById('note-category')?.value || 'personnel';
    note.updatedAt = DateUtils.now();
    Store.set('notes', this.notes);
    this._refreshList();
    if (showToast) Toast.success('Note enregistrée');
  },

  _exportNote() {
    const note = this.notes.find(n => n.id === this.activeId);
    if (!note) return;
    const content = `# ${note.title}\n\n${this._stripHtml(note.content)}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = (note.title || 'note') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Note exportée');
  },

  _filteredNotes() {
    return this.notes
      .filter(n => {
        if (this.filterCategory !== 'all' && n.category !== this.filterCategory) return false;
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          return (n.title || '').toLowerCase().includes(q) || this._stripHtml(n.content || '').toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  },

  _stripHtml(html) {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  },
};

Bus.on('appReady', () => Notes.init());
