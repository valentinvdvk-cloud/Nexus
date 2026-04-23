/* ═══════════════════════════════════════════════════════════
   NEXUS APP — contacts.js
   Contact book · Groups · Search · vCard export
═══════════════════════════════════════════════════════════ */

const Contacts = {
  contacts: [],
  search: '',
  filterGroup: 'all',
  editId: null,
  viewId: null,

  GROUPS: [
    { key: 'all',      label: 'Tous' },
    { key: 'famille',  label: 'Famille' },
    { key: 'amis',     label: 'Amis' },
    { key: 'pro',      label: 'Pro' },
    { key: 'sport',    label: 'Sport' },
    { key: 'autre',    label: 'Autre' },
  ],

  AVATAR_COLORS: ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#F97316'],

  init() {
    this.contacts = Store.get('contacts', []);
    this._render();
    Bus.on('moduleActivated', ({ module }) => { if (module === 'contacts') { this.contacts = Store.get('contacts', []); this._render(); } });
    Bus.on('openContact', id => { Router.navigate('contacts'); setTimeout(() => this._viewContact(id), 100); });
  },

  _render() {
    this.contacts = Store.get('contacts', []);
    const c = document.getElementById('contacts-container');
    if (!c) return;
    c.innerHTML = `
      <div class="contacts-layout anim-fade-up">
        <div class="contacts-main">
          ${this._renderToolbar()}
          ${this._renderGrid()}
        </div>
        <div class="contacts-sidebar">
          ${this.viewId ? this._renderContactDetail() : this._renderContactStats()}
        </div>
      </div>
      ${this._renderContactModal()}
    `;
    this._bindEvents();
  },

  _renderToolbar() {
    return `
      <div class="contacts-toolbar">
        <div class="contacts-search-wrap">
          <span class="search-icon-inline">${Icons.search}</span>
          <input type="text" id="contacts-search" class="form-input" placeholder="Chercher un contact…" value="${this.search}"/>
        </div>
        <button class="btn btn-primary" id="btn-new-contact">${Icons.plus} Contact</button>
      </div>
      <div class="contacts-group-tabs">
        ${this.GROUPS.map(g => `
          <button class="group-tab ${this.filterGroup === g.key ? 'active' : ''}" data-group="${g.key}">${g.label}</button>
        `).join('')}
      </div>
    `;
  },

  _renderGrid() {
    const filtered = this._filtered();
    const sorted   = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    if (!sorted.length) return `<p class="empty-state">Aucun contact trouvé.</p>`;

    let html = '';
    let lastLetter = '';
    sorted.forEach(c => {
      const first = c.name[0]?.toUpperCase() || '#';
      if (first !== lastLetter) {
        html += `<div class="contact-alpha-divider">${first}</div>`;
        lastLetter = first;
      }
      html += this._renderContactCard(c);
    });
    return `<div class="contacts-grid" id="contacts-grid">${html}</div>`;
  },

  _renderContactCard(c) {
    const initials = this._initials(c.name);
    const color    = this._avatarColor(c.name);
    const isActive = c.id === this.viewId;
    return `
      <div class="contact-card hover-lift ${isActive ? 'active' : ''}" data-id="${c.id}">
        <div class="contact-avatar" style="background:${color}">${c.photo ? `<img src="${c.photo}" alt="${c.name}"/>` : initials}</div>
        <div class="contact-name">${c.name}</div>
        ${c.role ? `<div class="contact-role">${c.role}</div>` : ''}
        <div class="contact-tag">${c.group !== 'autre' ? (this.GROUPS.find(g => g.key === c.group)?.label || '') : ''}</div>
        <div class="contact-card-actions">
          ${c.phone ? `<a href="tel:${c.phone}" class="btn-icon btn-icon-sm" data-tip="${c.phone}">${Icons.phone}</a>` : ''}
          ${c.email ? `<a href="mailto:${c.email}" class="btn-icon btn-icon-sm" data-tip="${c.email}">${Icons.mail}</a>` : ''}
        </div>
      </div>
    `;
  },

  _renderContactDetail() {
    const c = this.contacts.find(c => c.id === this.viewId);
    if (!c) return this._renderContactStats();
    const color = this._avatarColor(c.name);
    const fields = [
      { icon: Icons.phone,  label: 'Téléphone', val: c.phone,    href: c.phone  ? `tel:${c.phone}` : null },
      { icon: Icons.mail,   label: 'E-mail',    val: c.email,    href: c.email  ? `mailto:${c.email}` : null },
      { icon: Icons.globe,  label: 'Site web',  val: c.website,  href: c.website },
      { icon: Icons.mapPin, label: 'Adresse',   val: c.address,  href: null },
      { icon: Icons.calendar, label: 'Anniversaire', val: c.birthday ? DateUtils.format(c.birthday) : null, href: null },
    ].filter(f => f.val);
    return `
      <div class="widget contact-detail-card">
        <div class="contact-detail-header">
          <div class="contact-detail-avatar" style="background:${color}">
            ${c.photo ? `<img src="${c.photo}" alt="${c.name}"/>` : this._initials(c.name)}
          </div>
          <h3 class="contact-detail-name">${c.name}</h3>
          ${c.role ? `<p class="contact-detail-role">${c.role}</p>` : ''}
          ${c.company ? `<p class="contact-detail-company">${c.company}</p>` : ''}
          <span class="badge badge-purple">${this.GROUPS.find(g => g.key === c.group)?.label || 'Autre'}</span>
        </div>
        <div class="contact-detail-fields">
          ${fields.map(f => `
            <div class="contact-field">
              <span class="cf-icon">${f.icon}</span>
              <div class="cf-body">
                <span class="cf-label">${f.label}</span>
                ${f.href
                  ? `<a href="${f.href}" class="cf-val cf-link">${f.val}</a>`
                  : `<span class="cf-val">${f.val}</span>`
                }
              </div>
            </div>
          `).join('')}
          ${c.notes ? `<div class="contact-field"><span class="cf-icon">${Icons.notes}</span><div class="cf-body"><span class="cf-label">Notes</span><span class="cf-val">${c.notes}</span></div></div>` : ''}
        </div>
        <div class="contact-detail-actions">
          <button class="btn btn-outline btn-sm contact-edit" data-id="${c.id}">${Icons.edit} Modifier</button>
          <button class="btn btn-outline btn-sm" id="btn-export-vcard" data-id="${c.id}">${Icons.download} vCard</button>
          <button class="btn btn-danger btn-sm contact-delete" data-id="${c.id}">${Icons.trash}</button>
        </div>
      </div>
    `;
  },

  _renderContactStats() {
    const total  = this.contacts.length;
    const byGroup = {};
    this.GROUPS.filter(g => g.key !== 'all').forEach(g => {
      byGroup[g.key] = this.contacts.filter(c => c.group === g.key).length;
    });
    return `
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Résumé</span></div>
        <div class="contact-stat-row"><span>Total contacts</span><span class="badge badge-purple">${total}</span></div>
        ${Object.entries(byGroup).filter(([,v]) => v > 0).map(([k, v]) => `
          <div class="contact-stat-row">
            <span>${this.GROUPS.find(g => g.key === k)?.label}</span>
            <span class="badge badge-outline">${v}</span>
          </div>
        `).join('')}
        <p class="text-muted text-sm" style="margin-top:1rem">Clique sur un contact pour voir ses détails.</p>
      </div>
    `;
  },

  _renderContactModal() {
    const c = this.editId ? this.contacts.find(c => c.id === this.editId) : null;
    return `
      <div id="contact-modal" class="modal hidden">
        <div class="modal-box modal-md anim-scale-in">
          <div class="modal-header">
            <h3 class="modal-title">${c ? 'Modifier le contact' : 'Nouveau contact'}</h3>
            <button class="btn-icon" id="contact-modal-close">${Icons.close}</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group" style="flex:2">
                <label class="form-label">Nom complet *</label>
                <input type="text" id="contact-name" class="form-input" placeholder="Prénom Nom" value="${c?.name || ''}" data-focus/>
              </div>
              <div class="form-group">
                <label class="form-label">Groupe</label>
                <select id="contact-group" class="form-select">
                  ${this.GROUPS.filter(g => g.key !== 'all').map(g => `<option value="${g.key}" ${c?.group === g.key ? 'selected' : ''}>${g.label}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Téléphone</label>
                <input type="tel" id="contact-phone" class="form-input" placeholder="+33 6 00 00 00 00" value="${c?.phone || ''}"/>
              </div>
              <div class="form-group">
                <label class="form-label">E-mail</label>
                <input type="email" id="contact-email" class="form-input" placeholder="email@exemple.fr" value="${c?.email || ''}"/>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Entreprise</label>
                <input type="text" id="contact-company" class="form-input" placeholder="Entreprise" value="${c?.company || ''}"/>
              </div>
              <div class="form-group">
                <label class="form-label">Rôle / Poste</label>
                <input type="text" id="contact-role" class="form-input" placeholder="Développeur…" value="${c?.role || ''}"/>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Site web</label>
                <input type="url" id="contact-website" class="form-input" placeholder="https://…" value="${c?.website || ''}"/>
              </div>
              <div class="form-group">
                <label class="form-label">Anniversaire</label>
                <input type="date" id="contact-birthday" class="form-input" value="${c?.birthday || ''}"/>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Adresse</label>
              <input type="text" id="contact-address" class="form-input" placeholder="Adresse complète" value="${c?.address || ''}"/>
            </div>
            <div class="form-group">
              <label class="form-label">Notes</label>
              <textarea id="contact-notes" class="form-textarea" rows="2" placeholder="Notes libres…">${c?.notes || ''}</textarea>
            </div>
            <div class="modal-footer-btns">
              <button class="btn btn-ghost" id="contact-cancel">Annuler</button>
              <button class="btn btn-primary" id="btn-save-contact">Enregistrer</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _bindEvents() {
    document.getElementById('contacts-search')?.addEventListener('input', e => {
      this.search = e.target.value;
      this._refreshGrid();
    });
    document.querySelectorAll('.group-tab').forEach(btn => {
      btn.addEventListener('click', () => { this.filterGroup = btn.dataset.group; this._refreshGrid(); });
    });

    document.getElementById('btn-new-contact')?.addEventListener('click', () => this._openModal());

    document.getElementById('contact-modal-close')?.addEventListener('click', () => this._closeModal());
    document.getElementById('contact-cancel')?.addEventListener('click', () => this._closeModal());
    document.getElementById('contact-modal')?.addEventListener('click', e => {
      if (e.target.id === 'contact-modal') this._closeModal();
    });
    document.getElementById('btn-save-contact')?.addEventListener('click', () => this._saveContact());

    this._bindCards();
  },

  _bindCards() {
    document.querySelectorAll('.contact-card').forEach(card => {
      card.addEventListener('click', () => this._viewContact(card.dataset.id));
    });
    document.querySelectorAll('.contact-edit').forEach(btn => {
      btn.addEventListener('click', () => this._openModal(btn.dataset.id));
    });
    document.querySelectorAll('.contact-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Supprimer ce contact ?')) return;
        this.contacts = this.contacts.filter(c => c.id !== btn.dataset.id);
        Store.set('contacts', this.contacts);
        if (this.viewId === btn.dataset.id) this.viewId = null;
        this._render();
        Toast.success('Contact supprimé');
      });
    });
    document.getElementById('btn-export-vcard')?.addEventListener('click', e => {
      this._exportVCard(e.target.closest('[data-id]')?.dataset.id || this.viewId);
    });
  },

  _refreshGrid() {
    const gridEl = document.getElementById('contacts-grid');
    if (!gridEl) return;
    const filtered = this._filtered();
    const sorted   = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    if (!sorted.length) { gridEl.innerHTML = '<p class="empty-state">Aucun contact trouvé.</p>'; return; }
    let html = '', lastLetter = '';
    sorted.forEach(c => {
      const first = c.name[0]?.toUpperCase() || '#';
      if (first !== lastLetter) { html += `<div class="contact-alpha-divider">${first}</div>`; lastLetter = first; }
      html += this._renderContactCard(c);
    });
    gridEl.innerHTML = html;
    document.querySelectorAll('.group-tab').forEach(b => b.classList.toggle('active', b.dataset.group === this.filterGroup));
    this._bindCards();
  },

  _viewContact(id) {
    this.viewId = id;
    const sidebar = document.querySelector('.contacts-sidebar');
    if (sidebar) sidebar.innerHTML = this._renderContactDetail();
    document.querySelectorAll('.contact-card').forEach(c => c.classList.toggle('active', c.dataset.id === id));
    this._bindCards();
  },

  _openModal(id = null) {
    this.editId = id;
    const sidebar = document.querySelector('.contacts-sidebar');
    if (sidebar) sidebar.innerHTML = this._renderContactStats();
    const mainEl = document.getElementById('contacts-container');
    const existing = document.getElementById('contact-modal');
    if (existing) existing.remove();
    mainEl.insertAdjacentHTML('beforeend', this._renderContactModal());
    document.getElementById('contact-modal-close')?.addEventListener('click', () => this._closeModal());
    document.getElementById('contact-cancel')?.addEventListener('click', () => this._closeModal());
    document.getElementById('btn-save-contact')?.addEventListener('click', () => this._saveContact());
    Modal.open('contact-modal');
  },

  _closeModal() { Modal.close('contact-modal'); this.editId = null; },

  _saveContact() {
    const name = document.getElementById('contact-name')?.value?.trim();
    if (!name) { Toast.warning('Le nom est obligatoire'); return; }
    const contact = {
      id:       this.editId || uid(),
      name,
      group:    document.getElementById('contact-group')?.value || 'autre',
      phone:    document.getElementById('contact-phone')?.value?.trim() || '',
      email:    document.getElementById('contact-email')?.value?.trim() || '',
      company:  document.getElementById('contact-company')?.value?.trim() || '',
      role:     document.getElementById('contact-role')?.value?.trim() || '',
      website:  document.getElementById('contact-website')?.value?.trim() || '',
      birthday: document.getElementById('contact-birthday')?.value || '',
      address:  document.getElementById('contact-address')?.value?.trim() || '',
      notes:    document.getElementById('contact-notes')?.value?.trim() || '',
      createdAt: DateUtils.now(),
    };
    const idx = this.contacts.findIndex(c => c.id === contact.id);
    if (idx >= 0) this.contacts[idx] = contact;
    else this.contacts.push(contact);
    Store.set('contacts', this.contacts);
    this._closeModal();
    this.viewId = contact.id;
    this._render();
    Toast.success('Contact enregistré');
  },

  _exportVCard(id) {
    const c = this.contacts.find(c => c.id === id);
    if (!c) return;
    const vcard = [
      'BEGIN:VCARD', 'VERSION:3.0',
      `FN:${c.name}`,
      c.phone    ? `TEL:${c.phone}` : '',
      c.email    ? `EMAIL:${c.email}` : '',
      c.company  ? `ORG:${c.company}` : '',
      c.role     ? `TITLE:${c.role}` : '',
      c.website  ? `URL:${c.website}` : '',
      c.address  ? `ADR:;;${c.address};;;;` : '',
      c.birthday ? `BDAY:${c.birthday.replace(/-/g, '')}` : '',
      c.notes    ? `NOTE:${c.notes}` : '',
      'END:VCARD',
    ].filter(Boolean).join('\r\n');
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${c.name.replace(/\s+/g, '_')}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('vCard exportée');
  },

  _filtered() {
    return this.contacts.filter(c => {
      const matchGroup = this.filterGroup === 'all' || c.group === this.filterGroup;
      const matchSearch = !this.search || (c.name + c.email + c.phone + c.company).toLowerCase().includes(this.search.toLowerCase());
      return matchGroup && matchSearch;
    });
  },

  _initials(name = '') {
    return name.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';
  },

  _avatarColor(name = '') {
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % this.AVATAR_COLORS.length;
    return this.AVATAR_COLORS[Math.abs(hash)];
  },
};

Bus.on('appReady', () => Contacts.init());
