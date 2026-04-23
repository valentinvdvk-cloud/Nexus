/* ═══════════════════════════════════════════════════════════
   NEXUS APP — sync.js
   Firestore sync · Offline queue · Realtime listeners
═══════════════════════════════════════════════════════════ */

const Sync = {

  userId: null,
  pendingQueue: [],
  lastSyncTime: null,
  isOnline: navigator.onLine,
  syncListeners: {},
  statusInterval: null,
  enabled: false,

  COLLECTIONS: [
    'workouts', 'events', 'transactions', 'notes',
    'contacts', 'food_log', 'pomodoro_log', 'budgets', 'subscriptions',
    'accounts',
  ],

  /* ── INIT ── */
  async init(userId) {
    if (!userId || !window.firebaseDb) return;
    this.userId  = userId;
    this.enabled = true;

    /* Récupère queue offline sauvegardée */
    this.pendingQueue = Store.get('nexus_sync_queue') || [];

    this.setupOnlineListener();
    this.updateStatusBar('connecting');

    try {
      await this.pullAll();
      this.setupRealtimeListeners();
      this.startAutoSync();
      this.startStatusRefresh();
      this.updateStatusBar('connected');
    } catch(e) {
      console.warn('[Sync] init error:', e);
      this.updateStatusBar('error');
    }
  },

  /* ── LISTENER ONLINE/OFFLINE ── */
  setupOnlineListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateStatusBar('syncing');
      this.flushQueue().then(() => {
        this.pullAll();
        this.updateStatusBar('connected');
        Toast.success('Connexion retrouvée — données synchronisées');
      });
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateStatusBar('offline');
      Toast.warning('Mode hors ligne — données sauvées localement');
    });
  },

  /* ── PUSH (écriture) ── */
  async push(collectionName, data, docId = null) {
    const id = docId || data.id || uid();
    const item = { ...data, id, updatedAt: DateUtils.now(), _userId: this.userId };

    /* Sauvegarde locale immédiate */
    const local = Store.get(collectionName) || [];
    const idx = local.findIndex(x => x.id === id);
    if (idx >= 0) local[idx] = item;
    else local.push(item);
    Store.set(collectionName, local);

    if (!this.enabled || !this.isOnline || !window.firebaseDb) {
      this._enqueue({ action: 'push', collectionName, data: item, id });
      return item;
    }

    try {
      this.updateStatusBar('syncing');
      const { doc, setDoc } = window.fbFunctions;
      const ref = doc(window.firebaseDb, `users/${this.userId}/${collectionName}`, id);
      await setDoc(ref, item, { merge: true });
      this.lastSyncTime = new Date();
      Store.set('nexus_last_sync', this.lastSyncTime.toISOString());
      this.updateStatusBar('connected');
    } catch(e) {
      console.warn('[Sync] push error:', e);
      this._enqueue({ action: 'push', collectionName, data: item, id });
      this.updateStatusBar('error');
    }
    return item;
  },

  /* ── DELETE ── */
  async delete(collectionName, id) {
    /* Supprime en local immédiatement */
    const local = Store.get(collectionName) || [];
    Store.set(collectionName, local.filter(x => x.id !== id));

    if (!this.enabled || !this.isOnline || !window.firebaseDb) {
      this._enqueue({ action: 'delete', collectionName, id });
      return;
    }

    try {
      const { doc, deleteDoc } = window.fbFunctions;
      await deleteDoc(doc(window.firebaseDb, `users/${this.userId}/${collectionName}`, id));
    } catch(e) {
      console.warn('[Sync] delete error:', e);
      this._enqueue({ action: 'delete', collectionName, id });
    }
  },

  /* ── PULL (lecture) ── */
  async pull(collectionName) {
    if (!this.isOnline || !this.userId || !window.firebaseDb) {
      return Store.get(collectionName) || [];
    }
    try {
      const { collection, getDocs } = window.fbFunctions;
      const snap = await getDocs(
        collection(window.firebaseDb, `users/${this.userId}/${collectionName}`)
      );
      const remote = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const local  = Store.get(collectionName) || [];
      const merged = this.mergeData(local, remote);
      Store.set(collectionName, merged);
      return merged;
    } catch(e) {
      console.warn(`[Sync] pull ${collectionName} error:`, e);
      return Store.get(collectionName) || [];
    }
  },

  /* ── PULL ALL ── */
  async pullAll() {
    await Promise.all(this.COLLECTIONS.map(c => this.pull(c)));
    this.lastSyncTime = new Date();
    Store.set('nexus_last_sync', this.lastSyncTime.toISOString());
  },

  /* ── REALTIME LISTENERS ── */
  setupRealtimeListeners() {
    if (!window.firebaseDb || !window.fbFunctions) return;
    const { collection, query, orderBy, onSnapshot } = window.fbFunctions;

    ['workouts', 'events', 'notes'].forEach(col => {
      /* Détache ancien listener si existe */
      if (this.syncListeners[col]) this.syncListeners[col]();

      try {
        const q = query(
          collection(window.firebaseDb, `users/${this.userId}/${col}`),
          orderBy('updatedAt', 'desc')
        );
        this.syncListeners[col] = onSnapshot(q, snap => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const local = Store.get(col) || [];
          const merged = this.mergeData(local, data);
          Store.set(col, merged);
          /* Re-render si module actif */
          if (AppState.currentModule === col) {
            Bus.emit('moduleActivated', { module: col });
          }
        }, err => console.warn(`[Sync] listener ${col} error:`, err));
      } catch(e) {
        console.warn(`[Sync] setup listener ${col} error:`, e);
      }
    });
  },

  /* ── MERGE INTELLIGENT (timestamp gagne) ── */
  mergeData(local, remote) {
    const map = {};
    [...local, ...remote].forEach(item => {
      if (!item?.id) return;
      if (!map[item.id] ||
          new Date(item.updatedAt || 0) > new Date(map[item.id].updatedAt || 0)) {
        map[item.id] = item;
      }
    });
    return Object.values(map);
  },

  /* ── FLUSH QUEUE (offline → online) ── */
  async flushQueue() {
    if (!this.pendingQueue.length) return;
    const queue = [...this.pendingQueue];
    this.pendingQueue = [];
    Store.set('nexus_sync_queue', []);

    let flushed = 0;
    for (const action of queue) {
      try {
        if (action.action === 'push')   await this.push(action.collectionName, action.data, action.id);
        if (action.action === 'delete') await this.delete(action.collectionName, action.id);
        flushed++;
      } catch(e) {
        this._enqueue(action); /* remet en queue si échoue encore */
      }
    }
    if (flushed > 0) Toast.success(`${flushed} modification(s) synchronisée(s) ✓`);
  },

  /* ── AUTO-SYNC (toutes les 5 min) ── */
  startAutoSync() {
    setInterval(() => { if (this.isOnline && this.enabled) this.pullAll(); }, 5 * 60 * 1000);
  },

  /* ── RAFRAÎCHIT "il y a X min" toutes les 30s ── */
  startStatusRefresh() {
    clearInterval(this.statusInterval);
    this.statusInterval = setInterval(() => {
      if (document.getElementById('status-sync')) {
        const state = this.isOnline ? 'connected' : 'offline';
        this.updateStatusBar(state);
      }
    }, 30000);
  },

  /* ── SYNC MANUELLE ── */
  async forceSync() {
    if (!this.isOnline) { Toast.warning('Hors ligne — impossible de synchroniser'); return; }
    this.updateStatusBar('syncing');
    await this.flushQueue();
    await this.pullAll();
    this.updateStatusBar('connected');
    Toast.success('Synchronisation complète ✓');
  },

  /* ── HELPER QUEUE ── */
  _enqueue(action) {
    this.pendingQueue.push(action);
    Store.set('nexus_sync_queue', this.pendingQueue);
    this._updatePendingCount();
  },
  _updatePendingCount() {
    const el = document.getElementById('sd-pending');
    if (el) el.textContent = this.pendingQueue.length;
  },

  /* ── STATUS BAR ── */
  updateStatusBar(state) {
    const dot     = document.getElementById('status-dot');
    const label   = document.getElementById('status-label');
    const sync    = document.getElementById('status-sync');
    const sdConn  = document.getElementById('sd-connection');
    const sdSync  = document.getElementById('sd-lastsync');
    const sdUser  = document.getElementById('sd-user');
    if (!dot) return;

    const states = {
      connecting: { cls: 'connecting', lbl: 'Connexion...',       snc: '—',             conn: '⏳ Connexion' },
      connected:  { cls: 'connected',  lbl: 'Synchronisé',        snc: this.getLastSyncText(), conn: '🟢 En ligne' },
      syncing:    { cls: 'syncing',    lbl: 'Sync en cours...',    snc: 'Actualisation', conn: '🔄 Syncing' },
      offline:    { cls: 'offline',    lbl: 'Hors ligne',          snc: 'En attente',    conn: '🔴 Hors ligne' },
      error:      { cls: 'error',      lbl: 'Erreur sync',         snc: 'Réessayez',     conn: '⚠️ Erreur' },
    };

    const s = states[state] || states.connecting;
    dot.className = 'status-dot ' + s.cls;
    if (label)   label.textContent  = s.lbl;
    if (sync)    sync.textContent   = s.snc;
    if (sdConn)  sdConn.textContent = s.conn;
    if (sdSync)  sdSync.textContent = this.getLastSyncText(true);
    if (sdUser)  sdUser.textContent = AppState.user.username || AppState.user.email || '—';
    this._updatePendingCount();
  },

  getLastSyncText(long = false) {
    const saved = Store.get('nexus_last_sync');
    const t = this.lastSyncTime || (saved ? new Date(saved) : null);
    if (!t) return 'Jamais';
    const diff = Math.floor((Date.now() - new Date(t)) / 1000);
    if (diff < 60)    return 'À l\'instant';
    if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    return long
      ? new Date(t).toLocaleString('fr-FR')
      : `Il y a ${Math.floor(diff / 86400)}j`;
  },
};
