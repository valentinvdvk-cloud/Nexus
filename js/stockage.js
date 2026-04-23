/* ═══════════════════════════════════════════════════════════
   NEXUS APP — stockage.js
   File Manager · IndexedDB · Folders · Upload · Download
═══════════════════════════════════════════════════════════ */

const Stockage = {
  DB_NAME: 'nexus_files',
  DB_VERSION: 1,
  STORE: 'files',
  db: null,

  folders: [],
  files: [],
  currentFolder: null,
  viewMode: 'grid',

  async init() {
    this.folders = Store.get('file_folders', [{ id: 'root', name: 'Tous les fichiers', createdAt: DateUtils.now() }]);
    this.currentFolder = this.currentFolder || 'root';
    await this._openDB();
    await this._loadFiles();
    this._render();
    Bus.on('moduleActivated', async ({ module }) => {
      if (module === 'stockage') {
        await this._loadFiles();
        this._render();
      }
    });
  },

  _openDB() {
    return new Promise((resolve, reject) => {
      if (this.db) { resolve(); return; }
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE)) {
          db.createObjectStore(this.STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = e => { this.db = e.target.result; resolve(); };
      req.onerror   = e => { console.error('IndexedDB error', e); reject(e); };
    });
  },

  _loadFiles() {
    return new Promise((resolve) => {
      if (!this.db) { resolve(); return; }
      const tx = this.db.transaction(this.STORE, 'readonly');
      const store = tx.objectStore(this.STORE);
      const req = store.getAll();
      req.onsuccess = () => { this.files = req.result || []; resolve(); };
      req.onerror   = () => { this.files = []; resolve(); };
    });
  },

  _saveFile(fileObj) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.STORE, 'readwrite');
      const store = tx.objectStore(this.STORE);
      store.put(fileObj).onsuccess = resolve;
      tx.onerror = reject;
    });
  },

  _deleteFile(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.STORE, 'readwrite');
      const store = tx.objectStore(this.STORE);
      store.delete(id).onsuccess = resolve;
      tx.onerror = reject;
    });
  },

  _render() {
    const c = document.getElementById('stockage-container');
    if (!c) return;
    const folderFiles = this.currentFolder === 'root'
      ? this.files
      : this.files.filter(f => f.folderId === this.currentFolder);

    const totalSize = this.files.reduce((s, f) => s + (f.size || 0), 0);

    c.innerHTML = `
      <div class="stockage-layout anim-fade-up">
        <div class="stockage-sidebar">
          <div class="stockage-sidebar-header">
            <span class="widget-title">Dossiers</span>
            <button class="btn-icon btn-icon-sm" id="btn-new-folder" data-tip="Nouveau dossier">${Icons.plus}</button>
          </div>
          <div class="folder-list" id="folder-list">
            <div class="folder-item ${this.currentFolder === 'root' ? 'active' : ''}" data-folder="root">
              <span class="folder-item-icon">${Icons.folder}</span>
              <span class="folder-item-name">Tous les fichiers</span>
              <span class="folder-item-count">${this.files.length}</span>
            </div>
            ${this.folders.filter(f => f.id !== 'root').map(folder => {
              const count = this.files.filter(fi => fi.folderId === folder.id).length;
              return `
                <div class="folder-item ${this.currentFolder === folder.id ? 'active' : ''}" data-folder="${folder.id}">
                  <span class="folder-item-icon">${Icons.folder}</span>
                  <span class="folder-item-name">${folder.name}</span>
                  <span class="folder-item-count">${count}</span>
                  <button class="btn-icon btn-icon-xs folder-delete" data-id="${folder.id}" data-tip="Supprimer">${Icons.trash}</button>
                </div>
              `;
            }).join('')}
          </div>
          <div class="storage-usage">
            <span class="storage-label">Stockage</span>
            <span class="storage-value">${fmtBytes(totalSize)}</span>
          </div>
        </div>

        <div class="stockage-main">
          <div class="stockage-toolbar">
            <div class="upload-zone-mini" id="upload-zone">
              <span>${Icons.upload}</span>
              <span>Déposer des fichiers ici ou <label for="file-input" class="upload-link">parcourir</label></span>
              <input type="file" id="file-input" multiple style="display:none"/>
            </div>
            <div class="stockage-view-btns">
              <button class="btn-icon ${this.viewMode === 'grid' ? 'btn-icon-active' : ''}" id="btn-view-grid" data-tip="Grille">${Icons.grid}</button>
              <button class="btn-icon ${this.viewMode === 'list' ? 'btn-icon-active' : ''}" id="btn-view-list" data-tip="Liste">${Icons.list}</button>
            </div>
          </div>

          <div class="stockage-content-header">
            <h4 class="section-title">${this._currentFolderName()} (${folderFiles.length})</h4>
          </div>

          <div id="file-grid" class="${this.viewMode === 'grid' ? 'file-grid' : 'file-list'}">
            ${folderFiles.length ? folderFiles.map(f => this._renderFileCard(f)).join('') : `
              <div class="upload-zone-big" id="upload-zone-big">
                <div class="upload-zone-icon">${Icons.upload}</div>
                <p class="upload-zone-text">Dépose des fichiers ici</p>
                <p class="upload-zone-sub">ou clique pour parcourir</p>
              </div>
            `}
          </div>
        </div>
      </div>

      ${this._renderNewFolderModal()}
      ${this._renderMoveModal()}
    `;

    this._bindEvents();
  },

  _renderFileCard(f) {
    const icon = this._fileIcon(f.type, f.name);
    if (this.viewMode === 'grid') {
      return `
        <div class="file-card hover-lift" data-id="${f.id}">
          <div class="file-card-icon">${icon}</div>
          <div class="file-card-name" title="${f.name}">${f.name}</div>
          <div class="file-card-meta">${fmtBytes(f.size || 0)} · ${DateUtils.format(f.createdAt)}</div>
          <div class="file-card-actions">
            <button class="btn-icon btn-icon-sm file-download" data-id="${f.id}" data-tip="Télécharger">${Icons.download}</button>
            <button class="btn-icon btn-icon-sm file-move" data-id="${f.id}" data-tip="Déplacer">${Icons.folder}</button>
            <button class="btn-icon btn-icon-sm btn-danger-ghost file-delete" data-id="${f.id}" data-tip="Supprimer">${Icons.trash}</button>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="file-list-row" data-id="${f.id}">
          <span class="file-list-icon">${icon}</span>
          <span class="file-list-name">${f.name}</span>
          <span class="file-list-size">${fmtBytes(f.size || 0)}</span>
          <span class="file-list-date">${DateUtils.format(f.createdAt)}</span>
          <div class="file-list-actions">
            <button class="btn-icon btn-icon-sm file-download" data-id="${f.id}">${Icons.download}</button>
            <button class="btn-icon btn-icon-sm file-move" data-id="${f.id}">${Icons.folder}</button>
            <button class="btn-icon btn-icon-sm btn-danger-ghost file-delete" data-id="${f.id}">${Icons.trash}</button>
          </div>
        </div>
      `;
    }
  },

  _renderNewFolderModal() {
    return `
      <div id="new-folder-modal" class="modal hidden">
        <div class="modal-box modal-xs anim-scale-in">
          <div class="modal-header">
            <h3 class="modal-title">Nouveau dossier</h3>
            <button class="btn-icon" data-close-modal="new-folder-modal">${Icons.close}</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nom du dossier</label>
              <input type="text" id="folder-name-input" class="form-input" placeholder="Mon dossier" data-focus/>
            </div>
            <div class="modal-footer-btns">
              <button class="btn btn-ghost" data-close-modal="new-folder-modal">Annuler</button>
              <button class="btn btn-primary" id="btn-create-folder">Créer</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _renderMoveModal() {
    return `
      <div id="move-file-modal" class="modal hidden">
        <div class="modal-box modal-xs anim-scale-in">
          <div class="modal-header">
            <h3 class="modal-title">Déplacer le fichier</h3>
            <button class="btn-icon" data-close-modal="move-file-modal">${Icons.close}</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Choisir un dossier</label>
              <select id="move-folder-select" class="form-select">
                <option value="root">Tous les fichiers (racine)</option>
                ${this.folders.filter(f => f.id !== 'root').map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
              </select>
            </div>
            <input type="hidden" id="move-file-id"/>
            <div class="modal-footer-btns">
              <button class="btn btn-ghost" data-close-modal="move-file-modal">Annuler</button>
              <button class="btn btn-primary" id="btn-confirm-move">Déplacer</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _bindEvents() {
    /* Folder navigation */
    document.querySelectorAll('.folder-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.folder-delete')) return;
        this.currentFolder = item.dataset.folder;
        this._render();
      });
    });

    /* Folder delete */
    document.querySelectorAll('.folder-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm('Supprimer ce dossier ? Les fichiers seront déplacés à la racine.')) return;
        this.files = this.files.map(f => f.folderId === btn.dataset.id ? { ...f, folderId: null } : f);
        this.files.forEach(f => { if (f.folderId === null) { f.folderId = undefined; this._saveFile(f); } });
        this.folders = this.folders.filter(f => f.id !== btn.dataset.id);
        Store.set('file_folders', this.folders);
        if (this.currentFolder === btn.dataset.id) this.currentFolder = 'root';
        this._render();
        Toast.success('Dossier supprimé');
      });
    });

    /* New folder */
    document.getElementById('btn-new-folder')?.addEventListener('click', () => Modal.open('new-folder-modal'));
    document.getElementById('btn-create-folder')?.addEventListener('click', () => {
      const name = document.getElementById('folder-name-input')?.value?.trim();
      if (!name) return;
      const folder = { id: uid(), name, createdAt: DateUtils.now() };
      this.folders.push(folder);
      Store.set('file_folders', this.folders);
      Modal.close('new-folder-modal');
      this._render();
      Toast.success(`Dossier "${name}" créé`);
    });

    /* Upload */
    const zone   = document.getElementById('upload-zone');
    const input  = document.getElementById('file-input');
    const zoneBig = document.getElementById('upload-zone-big');

    if (zone) {
      zone.addEventListener('click', () => input?.click());
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag-over'); this._uploadFiles(e.dataTransfer.files); });
    }
    if (zoneBig) {
      zoneBig.addEventListener('click', () => input?.click());
      zoneBig.addEventListener('dragover', e => { e.preventDefault(); zoneBig.classList.add('drag-over'); });
      zoneBig.addEventListener('dragleave', () => zoneBig.classList.remove('drag-over'));
      zoneBig.addEventListener('drop', e => { e.preventDefault(); zoneBig.classList.remove('drag-over'); this._uploadFiles(e.dataTransfer.files); });
    }
    input?.addEventListener('change', e => this._uploadFiles(e.target.files));

    /* View mode */
    document.getElementById('btn-view-grid')?.addEventListener('click', () => { this.viewMode = 'grid'; this._render(); });
    document.getElementById('btn-view-list')?.addEventListener('click', () => { this.viewMode = 'list'; this._render(); });

    /* File actions */
    document.querySelectorAll('.file-download').forEach(btn => {
      btn.addEventListener('click', () => this._downloadFile(btn.dataset.id));
    });
    document.querySelectorAll('.file-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer ce fichier ?')) return;
        await this._deleteFile(btn.dataset.id);
        await this._loadFiles();
        this._render();
        Toast.success('Fichier supprimé');
      });
    });
    document.querySelectorAll('.file-move').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('move-file-id').value = btn.dataset.id;
        Modal.open('move-file-modal');
      });
    });
    document.getElementById('btn-confirm-move')?.addEventListener('click', async () => {
      const fileId = document.getElementById('move-file-id')?.value;
      const folderId = document.getElementById('move-folder-select')?.value;
      const file = this.files.find(f => f.id === fileId);
      if (file) {
        file.folderId = folderId === 'root' ? undefined : folderId;
        await this._saveFile(file);
        await this._loadFiles();
        Modal.close('move-file-modal');
        this._render();
        Toast.success('Fichier déplacé');
      }
    });
  },

  async _uploadFiles(fileList) {
    if (!fileList?.length) return;
    LoadingBar.start();
    for (const file of Array.from(fileList)) {
      const buf = await file.arrayBuffer();
      const fileObj = {
        id: uid(),
        name: file.name,
        type: file.type,
        size: file.size,
        folderId: this.currentFolder === 'root' ? undefined : this.currentFolder,
        data: buf,
        createdAt: DateUtils.now(),
      };
      await this._saveFile(fileObj);
    }
    LoadingBar.done();
    await this._loadFiles();
    this._render();
    Toast.success(`${fileList.length} fichier(s) importé(s)`);
  },

  async _downloadFile(id) {
    const file = this.files.find(f => f.id === id);
    if (!file?.data) { Toast.error('Fichier introuvable'); return; }
    const blob = new Blob([file.data], { type: file.type || 'application/octet-stream' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  },

  _fileIcon(type = '', name = '') {
    const ext = name.split('.').pop()?.toLowerCase();
    if (type.startsWith('image/') || ['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return Icons.fileImage;
    if (type === 'application/pdf' || ext === 'pdf') return Icons.filePdf;
    if (type.startsWith('video/') || ['mp4','avi','mkv','mov','webm'].includes(ext)) return Icons.fileVideo;
    if (['js','ts','html','css','json','py','java','go','rb','php','c','cpp'].includes(ext)) return Icons.fileCode;
    return Icons.fileText;
  },

  _currentFolderName() {
    if (this.currentFolder === 'root') return 'Tous les fichiers';
    return this.folders.find(f => f.id === this.currentFolder)?.name || 'Dossier';
  },
};

Bus.on('appReady', () => Stockage.init());
