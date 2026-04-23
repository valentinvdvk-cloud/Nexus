/* ═══════════════════════════════════════════════════════════
   NEXUS APP — meteo.js
   Open-Meteo API · Nominatim geocoding · Forecast
═══════════════════════════════════════════════════════════ */

const Meteo = {
  data: null,
  location: null,
  loading: false,
  error: null,

  WMO_CODES: {
    0:  { label: 'Ciel dégagé',        icon: '☀️' },
    1:  { label: 'Principalement dégagé', icon: '🌤️' },
    2:  { label: 'Partiellement nuageux', icon: '⛅' },
    3:  { label: 'Couvert',             icon: '☁️' },
    45: { label: 'Brouillard',          icon: '🌫️' },
    48: { label: 'Brouillard givrant',  icon: '🌫️' },
    51: { label: 'Bruine légère',       icon: '🌦️' },
    53: { label: 'Bruine modérée',      icon: '🌦️' },
    55: { label: 'Bruine forte',        icon: '🌧️' },
    61: { label: 'Pluie légère',        icon: '🌧️' },
    63: { label: 'Pluie modérée',       icon: '🌧️' },
    65: { label: 'Pluie forte',         icon: '🌧️' },
    71: { label: 'Neige légère',        icon: '❄️' },
    73: { label: 'Neige modérée',       icon: '🌨️' },
    75: { label: 'Neige forte',         icon: '⛄' },
    80: { label: 'Averses légères',     icon: '🌦️' },
    81: { label: 'Averses modérées',    icon: '🌧️' },
    82: { label: 'Averses violentes',   icon: '⛈️' },
    95: { label: 'Orage',              icon: '⛈️' },
    96: { label: 'Orage avec grêle',   icon: '⛈️' },
    99: { label: 'Orage violent',      icon: '🌩️' },
  },

  init() {
    const cached = Store.get('meteo_data');
    const cachedLoc = Store.get('meteo_location');
    if (cached && cachedLoc && Date.now() - (cached.fetchedAt || 0) < 30 * 60 * 1000) {
      this.data = cached;
      this.location = cachedLoc;
    }
    this._render();
    Bus.on('moduleActivated', ({ module }) => { if (module === 'meteo') this._render(); });
  },

  _render() {
    const c = document.getElementById('meteo-container');
    if (!c) return;
    if (this.loading) {
      c.innerHTML = `<div class="meteo-loading anim-fade-in"><div class="spinner"></div><p>Chargement météo…</p></div>`;
      return;
    }
    if (this.error) {
      c.innerHTML = `
        <div class="meteo-error widget">
          <p>${Icons.alertCircle} ${this.error}</p>
          <button class="btn btn-primary btn-sm" id="btn-meteo-retry">Réessayer</button>
        </div>
        ${this._renderSearch()}
      `;
      document.getElementById('btn-meteo-retry')?.addEventListener('click', () => {
        if (this.location) this._fetchWeather(this.location.lat, this.location.lon);
        else this._geolocate();
      });
      this._bindSearch();
      return;
    }
    if (!this.data) {
      c.innerHTML = `
        <div class="meteo-welcome widget anim-fade-up">
          <div class="meteo-welcome-icon">🌍</div>
          <h3>Météo</h3>
          <p>Localise-toi pour voir la météo en temps réel.</p>
          <button class="btn btn-primary" id="btn-geolocate">
            ${Icons.mapPin} Ma position
          </button>
        </div>
        ${this._renderSearch()}
      `;
      document.getElementById('btn-geolocate')?.addEventListener('click', () => this._geolocate());
      this._bindSearch();
      return;
    }

    const curr = this.data.current;
    const daily = this.data.daily;
    const hourly = this.data.hourly;
    const wmo = this.WMO_CODES[curr.weathercode] || { label: 'Inconnu', icon: '🌡️' };

    c.innerHTML = `
      <div class="meteo-layout anim-fade-up">
        <div class="meteo-main">
          <div class="weather-hero">
            <div class="weather-location">
              <span>${Icons.mapPin}</span>
              <span>${this.location?.name || 'Ma position'}</span>
              <button class="btn-icon btn-icon-sm" id="btn-change-location" data-tip="Changer">${Icons.edit}</button>
            </div>
            <div class="weather-current">
              <span class="weather-icon-big">${wmo.icon}</span>
              <div class="weather-temp-wrap">
                <span class="weather-temp" style="font-family:'Fraunces',serif">${Math.round(curr.temperature_2m)}°</span>
                <span class="weather-desc">${wmo.label}</span>
                <span class="weather-feels">Ressenti ${Math.round(curr.apparent_temperature)}°</span>
              </div>
            </div>
            <div class="weather-details">
              <div class="weather-detail">${Icons.wind}<span>${Math.round(curr.windspeed_10m)} km/h</span></div>
              <div class="weather-detail">${Icons.droplet}<span>${curr.relativehumidity_2m}%</span></div>
              ${curr.precipitation !== undefined ? `<div class="weather-detail">🌧️<span>${curr.precipitation} mm</span></div>` : ''}
            </div>
          </div>

          ${this._renderHourlyForecast(hourly)}
          ${this._renderDailyForecast(daily)}
        </div>
        <div class="meteo-sidebar">
          ${this._renderSearch()}
          ${this._renderMeteoStats(curr)}
        </div>
      </div>
    `;

    document.getElementById('btn-change-location')?.addEventListener('click', () => {
      const searchEl = document.querySelector('.meteo-search-input');
      searchEl?.focus();
    });
    this._bindSearch();
    this._addRefreshTime();
  },

  _renderHourlyForecast(hourly) {
    if (!hourly?.time) return '';
    const now = new Date().getHours();
    const items = hourly.time.slice(now, now + 12).map((t, i) => {
      const hi = now + i;
      const wmo = this.WMO_CODES[hourly.weathercode[hi]] || { icon: '🌡️' };
      return `
        <div class="forecast-hour">
          <span class="fh-time">${String(new Date(t).getHours()).padStart(2,'0')}h</span>
          <span class="fh-icon">${wmo.icon}</span>
          <span class="fh-temp">${Math.round(hourly.temperature_2m[hi])}°</span>
          <span class="fh-precip">${hourly.precipitation_probability[hi] || 0}%</span>
        </div>
      `;
    }).join('');
    return `
      <div class="widget" style="margin-bottom:1.25rem">
        <div class="widget-header"><span class="widget-title">Prévisions horaires</span></div>
        <div class="forecast-scroll">${items}</div>
      </div>
    `;
  },

  _renderDailyForecast(daily) {
    if (!daily?.time) return '';
    const days = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    const rows = daily.time.slice(0, 7).map((t, i) => {
      const wmo = this.WMO_CODES[daily.weathercode[i]] || { icon: '🌡️', label: '—' };
      const date = new Date(t);
      return `
        <div class="forecast-day">
          <span class="fd-day">${i === 0 ? 'Auj.' : days[date.getDay()]}</span>
          <span class="fd-icon">${wmo.icon}</span>
          <span class="fd-precip">${daily.precipitation_sum[i]?.toFixed(1) || '0'} mm</span>
          <span class="fd-range">
            <span class="fd-min">${Math.round(daily.temperature_2m_min[i])}°</span>
            <span class="fd-max">${Math.round(daily.temperature_2m_max[i])}°</span>
          </span>
        </div>
      `;
    }).join('');
    return `
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Prévisions 7 jours</span></div>
        <div class="forecast-daily">${rows}</div>
      </div>
    `;
  },

  _renderSearch() {
    return `
      <div class="widget meteo-search-widget" style="margin-bottom:1.25rem">
        <div class="widget-header"><span class="widget-title">Changer de ville</span></div>
        <div class="meteo-search-wrap">
          <input type="text" id="meteo-city-input" class="form-input meteo-search-input" placeholder="Ex: Paris, Lyon…"/>
          <button class="btn btn-primary btn-sm" id="btn-search-city">${Icons.search}</button>
        </div>
        <div id="city-suggestions" class="city-suggestions hidden"></div>
        <button class="btn btn-ghost btn-sm" id="btn-geolocate2" style="margin-top:0.5rem">
          ${Icons.mapPin} Ma position
        </button>
      </div>
    `;
  },

  _renderMeteoStats(curr) {
    const stats = [
      { icon: '🌡️', label: 'Température', val: `${Math.round(curr.temperature_2m)}°C` },
      { icon: '💧', label: 'Humidité',    val: `${curr.relativehumidity_2m}%` },
      { icon: '💨', label: 'Vent',        val: `${Math.round(curr.windspeed_10m)} km/h` },
      { icon: '👁️', label: 'Code météo',  val: this.WMO_CODES[curr.weathercode]?.label || '—' },
    ];
    return `
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Détails</span></div>
        ${stats.map(s => `
          <div class="meteo-stat-row">
            <span>${s.icon} ${s.label}</span>
            <span class="badge badge-outline">${s.val}</span>
          </div>
        `).join('')}
        <p id="meteo-refresh-time" class="text-muted text-sm" style="margin-top:0.75rem"></p>
      </div>
    `;
  },

  _bindSearch() {
    const input   = document.getElementById('meteo-city-input');
    const suggest = document.getElementById('city-suggestions');
    const geoBtn  = document.getElementById('btn-geolocate2') || document.getElementById('btn-geolocate');

    geoBtn?.addEventListener('click', () => this._geolocate());
    document.getElementById('btn-search-city')?.addEventListener('click', () => {
      if (input?.value.trim()) this._searchCity(input.value.trim());
    });
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && input.value.trim()) this._searchCity(input.value.trim());
    });

    let debounce;
    input?.addEventListener('input', () => {
      clearTimeout(debounce);
      if (!input.value.trim()) { suggest?.classList.add('hidden'); return; }
      debounce = setTimeout(() => this._searchCity(input.value.trim(), true), 500);
    });
  },

  async _geolocate() {
    if (!navigator.geolocation) { Toast.warning('Géolocalisation non supportée'); return; }
    this.loading = true; this._render();
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        await this._reverseGeocode(lat, lon);
        await this._fetchWeather(lat, lon);
      },
      () => {
        this.loading = false;
        this.error = 'Géolocalisation refusée. Cherche une ville manuellement.';
        this._render();
      },
      { timeout: 10000 }
    );
  },

  async _reverseGeocode(lat, lon) {
    try {
      const url  = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
      const resp = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
      const data = await resp.json();
      const name = data.address?.city || data.address?.town || data.address?.village || data.display_name?.split(',')[0] || 'Ma position';
      this.location = { name, lat, lon };
      Store.set('meteo_location', this.location);
    } catch { this.location = { name: 'Ma position', lat, lon }; }
  },

  async _searchCity(query, suggestOnly = false) {
    try {
      const url    = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
      const resp   = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
      const places = await resp.json();
      if (suggestOnly) {
        this._showSuggestions(places);
        return;
      }
      if (!places.length) { Toast.warning('Ville non trouvée'); return; }
      const p = places[0];
      this.location = {
        name: p.address?.city || p.address?.town || p.display_name.split(',')[0],
        lat: parseFloat(p.lat),
        lon: parseFloat(p.lon),
      };
      Store.set('meteo_location', this.location);
      await this._fetchWeather(this.location.lat, this.location.lon);
    } catch { Toast.error('Erreur lors de la recherche'); }
  },

  _showSuggestions(places) {
    const suggest = document.getElementById('city-suggestions');
    if (!suggest) return;
    if (!places.length) { suggest.classList.add('hidden'); return; }
    suggest.innerHTML = places.map(p => {
      const name = p.address?.city || p.address?.town || p.display_name.split(',')[0];
      const country = p.address?.country || '';
      return `<div class="city-suggest-item" data-lat="${p.lat}" data-lon="${p.lon}" data-name="${name}">${name}${country ? ', ' + country : ''}</div>`;
    }).join('');
    suggest.classList.remove('hidden');
    suggest.querySelectorAll('.city-suggest-item').forEach(item => {
      item.addEventListener('click', async () => {
        suggest.classList.add('hidden');
        this.location = { name: item.dataset.name, lat: parseFloat(item.dataset.lat), lon: parseFloat(item.dataset.lon) };
        Store.set('meteo_location', this.location);
        await this._fetchWeather(this.location.lat, this.location.lon);
      });
    });
  },

  async _fetchWeather(lat, lon) {
    this.loading = true; this.error = null; this._render();
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,relativehumidity_2m,weathercode,windspeed_10m,precipitation` +
        `&hourly=temperature_2m,weathercode,precipitation_probability,precipitation&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum` +
        `&timezone=auto&forecast_days=7`;
      const resp = await fetch(url);
      const json = await resp.json();
      this.data = { ...json, fetchedAt: Date.now() };
      Store.set('meteo_data', this.data);
      this.loading = false;
      this._render();
    } catch (e) {
      this.loading = false;
      this.error = 'Impossible de charger la météo. Vérifie ta connexion.';
      this._render();
    }
  },

  _addRefreshTime() {
    const el = document.getElementById('meteo-refresh-time');
    if (el && this.data?.fetchedAt) {
      el.textContent = `Mis à jour ${DateUtils.relative(new Date(this.data.fetchedAt).toISOString())}`;
    }
  },
};

Bus.on('appReady', () => Meteo.init());
