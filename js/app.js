/**
 * ClimateGuard - Main Application (v6 Complete Rewrite)
 * Manages initialization, real-time polling, settings, countdowns, and all feature modules
 */

const App = (function() {
    const state = {
        currentLocation: null, weatherData: null,
        isLoading: false, isOffline: !navigator.onLine,
        pollTimer: null, countdownTimer: null, lastAnalysisTime: null
    };

    // ─── INIT ────────────────────────────────────────────────
    async function init() {
        console.log('🌤️ ClimateGuard v6 initializing...');
        try {
            Theme.init();
            if (typeof AnimationEngine !== 'undefined') AnimationEngine.init();
            UI.init();
            if (typeof WeatherEngine !== 'undefined') WeatherEngine.init();
            if (typeof I18n !== 'undefined') I18n.init();

            setupOfflineDetection();
            setupNetworkBanner();
            await loadWeather();
            initCurrentPage();

            // Real-time poll every 60s
            const interval = (typeof CONFIG !== 'undefined') ? CONFIG.WEATHER_POLL_INTERVAL : 60000;
            state.pollTimer = setInterval(refreshWeather, interval);

            // Trip countdown timer (1s)
            startCountdownTimer();

            // Check trip notifications
            checkTripNotifications();

            console.log('✅ ClimateGuard ready!');
        } catch (err) {
            console.error('❌ Init error:', err);
            handleError(err);
        }
    }

    // ─── WEATHER LOADING ─────────────────────────────────────
    async function loadWeather() {
        state.isLoading = true;
        showAnalysisSpinner(true);

        try {
            const saved = Storage.get(Storage.KEYS.CURRENT_LOCATION);
            if (saved) {
                state.currentLocation = saved;
            } else {
                const settings = Storage.getSettings();
                if (settings.gpsEnabled) {
                    try {
                        state.currentLocation = await WeatherAPI.getCurrentLocation();
                    } catch (err) {
                        console.warn('GPS unavailable, using default location:', err);
                        state.currentLocation = { lat: 37.7749, lon: -122.4194 };
                        UI.showNotification('Location unavailable — showing default location', 'warning');
                    }
                } else {
                    state.currentLocation = { lat: 37.7749, lon: -122.4194 };
                }
            }

            const data = await WeatherAPI.getCurrentWeather(state.currentLocation.lat, state.currentLocation.lon);
            state.weatherData = data;
            state.lastAnalysisTime = new Date();

            UI.updateWeatherDisplay(data);
            UI.setSourceBadge(data.source || WeatherAPI.getLastSource('current'));
            if (typeof WeatherEngine !== 'undefined') WeatherEngine.updateFromData(data);
            applyAutoWeatherTheme(data);
            updateRiskSummary(data);
            updateTimestamp();

            Storage.set(Storage.KEYS.LAST_WEATHER, data);
        } catch (err) {
            console.error('Weather load error:', err);
            const cached = Storage.get(Storage.KEYS.LAST_WEATHER);
            if (cached) {
                state.weatherData = cached;
                UI.updateWeatherDisplay(cached);
                UI.setSourceBadge('cached');
                UI.showNotification('Using cached weather data', 'warning');
            } else {
                showApiUnavailable();
            }
        } finally {
            state.isLoading = false;
            showAnalysisSpinner(false);
            UI.hideLoading();
        }
    }

    async function refreshWeather() {
        if (state.isLoading || state.isOffline) return;
        try { await loadWeather(); } catch {}
    }

    // ─── ANALYSIS TIMESTAMP ──────────────────────────────────
    function updateTimestamp() {
        const el = document.getElementById('analysisTimestamp');
        if (!el || !state.lastAnalysisTime) return;
        const d = state.lastAnalysisTime;
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const str = `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
        el.textContent = `Last analysed: ${str}`;
        el.style.display = '';
    }

    function showAnalysisSpinner(show) {
        const el = document.getElementById('analysisSpinner');
        if (el) el.style.display = show ? 'inline-flex' : 'none';
    }

    // ─── AUTO WEATHER THEME ──────────────────────────────────
    function applyAutoWeatherTheme(data) {
        const s = Storage.getSettings();
        if (s.autoWeatherTheme === false) return;
        const w = data?.weather || data;
        if (!w) return;
        const cond = w.condition || 'clear_day';
        const isDay = w.isDay !== undefined ? w.isDay : true;
        if (typeof WeatherEngine !== 'undefined') {
            const st = WeatherEngine.mapConditionToState(cond, isDay);
            WeatherEngine.setWeather(st);
        }
    }

    function updateRiskSummary(data) {
        if (typeof RiskEngine === 'undefined') return;
        const c = document.getElementById('riskSummaryContent');
        if (!c) return;
        const report = RiskEngine.analyzeRisks(data);
        RiskEngine.renderRiskSummary(c, report);
    }

    // ─── PAGE ROUTING ────────────────────────────────────────
    function initCurrentPage() {
        const page = getCurrentPage();
        switch (page) {
            case 'index': initHomePage(); break;
            case 'hourly': initHourlyPage(); break;
            case 'weekly': initWeeklyPage(); break;
            case 'search': initSearchPage(); break;
            case 'trip-planner': break; // handled by trip-planner.js
            case 'risk-report': break;
            case 'settings': initSettingsPage(); break;
            case 'compare': initComparePage(); break;
            case 'emergency': initEmergencyPage(); break;
        }
    }

    function getCurrentPage() {
        const p = window.location.pathname;
        const f = p.split('/').pop() || 'index.html';
        return f.replace('.html', '');
    }

    // ─── HOME PAGE ───────────────────────────────────────────
    async function initHomePage() {
        const hourly = await WeatherAPI.getHourlyForecast(state.currentLocation?.lat, state.currentLocation?.lon);
        UI.renderHourlyForecast(hourly);
        initCharts(hourly);
        if (typeof AnimationEngine !== 'undefined') AnimationEngine.setupCardHoverEffects();
        setupAutoThemeToggle();
        renderPopularDestinations();
        renderTripCountdowns();
    }

    // ─── HOURLY / WEEKLY PAGES ─────────────────────────────────
    function currentCoords() {
        return {
            lat: state.currentLocation?.lat ?? state.weatherData?.location?.lat,
            lon: state.currentLocation?.lon ?? state.weatherData?.location?.lon
        };
    }

    function updatePageSubtitle(suffix) {
        const sub = document.querySelector('.page-header__subtitle');
        const name = state.weatherData?.location?.name;
        if (sub && name) sub.textContent = `${name} • ${suffix}`;
    }

    async function initHourlyPage() {
        const { lat, lon } = currentCoords();
        UI.showSkeleton('hourlyList', 8);
        const hours = await WeatherAPI.getHourlyForecast(lat, lon);
        UI.renderHourlyList(hours);
        UI.setSourceBadge(WeatherAPI.getLastSource('hourly'));
        updatePageSubtitle('Next 24 hours');
        if (typeof AnimationEngine !== 'undefined') AnimationEngine.setupCardHoverEffects();
    }

    async function initWeeklyPage() {
        const { lat, lon } = currentCoords();
        UI.showSkeleton('weeklyContainer', 7);
        const days = await WeatherAPI.getWeeklyForecast(lat, lon);
        UI.renderWeeklyList(days);
        UI.setSourceBadge(WeatherAPI.getLastSource('weekly'));
        updatePageSubtitle('This week');
        if (typeof AnimationEngine !== 'undefined') AnimationEngine.setupCardHoverEffects();
    }

    function initCharts(hours) {
        const ctx = document.getElementById('precipChart');
        if (!ctx || typeof Chart === 'undefined') return;
        const points = (hours || []).slice(0, 6);
        if (!points.length) return; // no data → no chart (never fake values)
        new Chart(ctx, {
            type: 'bar',
            data: { labels: points.map(h => h.timeFormatted), datasets: [{ data: points.map(h => h.precipitation ?? 0), backgroundColor: 'rgba(43,212,167,0.6)', borderRadius: 4, barThickness: 12 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false, max: 100 } } }
        });
    }

    // ─── POPULAR DESTINATIONS RISK ───────────────────────────
    async function renderPopularDestinations() {
        const container = document.getElementById('popularDestinations');
        if (!container) return;
        UI.showSkeleton(container, 6, 'card');
        const cities = [
            { name: 'Tokyo', lat: 35.67, lon: 139.65 }, { name: 'London', lat: 51.50, lon: -0.12 },
            { name: 'Dubai', lat: 25.20, lon: 55.27 }, { name: 'New York', lat: 40.71, lon: -74.00 },
            { name: 'Mumbai', lat: 19.07, lon: 72.87 }, { name: 'Sydney', lat: -33.86, lon: 151.20 }
        ];
        const cards = await Promise.all(cities.map(async (c) => {
            try {
                const d = await WeatherAPI.getCurrentWeather(c.lat, c.lon);
                const risk = (typeof RiskEngine !== 'undefined') ? RiskEngine.analyzeRisks(d) : null;
                const level = risk ? risk.overallLevel : { label: 'Low', color: '#22c55e' };
                const temp = Units.format(d?.weather?.temp);
                return `<div class="popular-dest-card" aria-label="${c.name} weather">
                    <div class="popular-dest-card__city">${c.name}</div>
                    <div class="popular-dest-card__temp">${temp}</div>
                    <span class="popular-dest-card__badge" style="background:${level.color}20;color:${level.color}">${level.label}</span>
                    ${UI.sourceBadge(d && d.source)}
                </div>`;
            } catch {
                return `<div class="popular-dest-card"><div class="popular-dest-card__city">${c.name}</div><div class="popular-dest-card__temp">—</div>${UI.sourceBadge('demo')}</div>`;
            }
        }));
        container.setAttribute('aria-busy', 'false');
        container.innerHTML = cards.join('');
    }

    // ─── TRIP COUNTDOWNS ─────────────────────────────────────
    function startCountdownTimer() {
        state.countdownTimer = setInterval(renderTripCountdowns, 1000);
    }

    function renderTripCountdowns() {
        const container = document.getElementById('tripCountdowns');
        if (!container) return;
        const trips = Storage.getTripReminders();
        if (!trips.length) { container.innerHTML = '<p class="empty-state">No saved trips yet</p>'; return; }
        const now = Date.now();
        const esc = (typeof UI !== 'undefined' && UI.escapeHtml) ? UI.escapeHtml : String;
        container.innerHTML = trips.map(trip => {
            const tripDate = new Date(trip.date).getTime();
            const diff = tripDate - now;
            let badge = '', cls = '';
            if (diff <= 0) {
                badge = '<span class="countdown-badge countdown-badge--done">Trip Completed ✓</span>';
            } else if (diff <= 86400000) {
                badge = '<span class="countdown-badge countdown-badge--tomorrow pulse-glow">Tomorrow!</span>';
                cls = 'pulse';
            } else {
                const days = Math.floor(diff / 86400000);
                const hrs = Math.floor((diff % 86400000) / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                badge = `<span class="countdown-badge">${days}d ${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}</span>`;
            }
            return `<div class="countdown-item ${cls}">
                <div class="countdown-item__info">
                    <i class="fa-solid fa-plane"></i>
                    <span>${esc(trip.city || trip.destination)}</span>
                    <span class="countdown-item__date">${esc(new Date(trip.date).toLocaleDateString())}</span>
                </div>
                ${badge}
                <button class="countdown-item__remove" data-trip-id="${esc(trip.id)}" aria-label="Remove trip"><i class="fa-solid fa-xmark"></i></button>
            </div>`;
        }).join('');
        container.querySelectorAll('.countdown-item__remove').forEach(btn => {
            btn.addEventListener('click', () => removeTrip(btn.dataset ? btn.dataset.tripId : btn.getAttribute('data-trip-id')));
        });
    }

    function removeTrip(id) {
        Storage.removeTripReminder(id);
        renderTripCountdowns();
    }

    // ─── TRIP NOTIFICATIONS ──────────────────────────────────
    function checkTripNotifications() {
        const settings = Storage.getSettings();
        if (!settings.notificationsEnabled || !settings.notif_tripReminders) return;
        const trips = Storage.getTripReminders();
        const now = Date.now();
        trips.forEach(trip => {
            const tripDate = new Date(trip.date).getTime();
            const diff = tripDate - now;
            if (diff > 0 && diff <= 86400000 && !trip.notified24h) {
                fireNotification('Trip Reminder', `Your trip to ${trip.city || trip.destination} is tomorrow!`);
                trip.notified24h = true;
                Storage.set(Storage.KEYS.TRIP_REMINDERS, trips);
            }
        });
    }

    function fireNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    }

    // ─── SEARCH PAGE ─────────────────────────────────────────
    function initSearchPage() {
        const input = document.getElementById('searchInput');
        const results = document.getElementById('searchResults');
        const recent = document.getElementById('recentSearches');
        const useLocBtn = document.getElementById('useLocation');

        renderRecentSearches(recent);

        let timeout;
        input?.addEventListener('input', e => {
            clearTimeout(timeout);
            const q = e.target.value.trim();
            if (q.length < 2) { if (results) results.innerHTML = ''; return; }
            timeout = setTimeout(async () => {
                if (results) UI.showSkeleton(results, 4);
                const res = await WeatherAPI.searchLocations(q);
                renderSearchResults(res, results);
            }, 300);
        });

        useLocBtn?.addEventListener('click', async () => {
            try {
                UI.showLoading();
                const coords = await WeatherAPI.getCurrentLocation();
                Storage.set(Storage.KEYS.CURRENT_LOCATION, coords);
                window.location.href = 'index.html';
            } catch {
                UI.showNotification('Unable to get location', 'error');
            } finally { UI.hideLoading(); }
        });
    }

    function renderRecentSearches(container) {
        if (!container) return;
        const recent = Storage.getRecentLocations();
        if (!recent.length) { container.innerHTML = '<p style="color:var(--color-text-secondary);padding:16px">No recent searches</p>'; return; }
        const esc = (typeof UI !== 'undefined' && UI.escapeHtml) ? UI.escapeHtml : String;
        container.innerHTML = recent.map(loc => `
            <div class="list-item" data-lat="${loc.lat}" data-lon="${loc.lon}" data-name="${esc(loc.name)}" data-region="${esc(loc.region || loc.country || '')}">
                <i class="fa-solid fa-clock-rotate-left" style="color:var(--color-text-secondary)"></i>
                <span style="flex:1">${esc(loc.name)}, ${esc(loc.region || loc.country || '')}</span>
                <i class="fa-solid fa-chevron-right" style="color:var(--color-text-tertiary)"></i>
            </div>`).join('');
        container.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', () => selectLocation({
                name: item.dataset.name, lat: parseFloat(item.dataset.lat),
                lon: parseFloat(item.dataset.lon), region: item.dataset.region
            }));
        });
    }

    function renderSearchResults(results, container) {
        if (!container) return;
        if (!results.length) {
            container.setAttribute('aria-busy', 'false');
            container.innerHTML = (typeof UI !== 'undefined' && UI.emptyHTML)
                ? UI.emptyHTML('fa-magnifying-glass', 'No results found', 'Try a different spelling or a larger nearby city')
                : '<p class="empty-state">No results found</p>';
            return;
        }
        container.setAttribute('aria-busy', 'false');
        const esc = (typeof UI !== 'undefined' && UI.escapeHtml) ? UI.escapeHtml : String;
        container.innerHTML = results.map(loc => `
            <div class="list-item" data-lat="${loc.lat}" data-lon="${loc.lon}" data-name="${esc(loc.name)}" data-region="${esc(loc.region || '')}">
                <div class="list-item__icon"><i class="fa-solid fa-city"></i></div>
                <div class="list-item__content">
                    <div class="list-item__title">${esc(loc.name)}</div>
                    <div class="list-item__subtitle">${esc(loc.region || '')}</div>
                </div>
                <i class="fa-solid fa-chevron-right" style="color:var(--color-text-tertiary)"></i>
            </div>`).join('');
        container.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', () => selectLocation({
                name: item.dataset.name, lat: parseFloat(item.dataset.lat),
                lon: parseFloat(item.dataset.lon), region: item.dataset.region
            }));
        });
    }

    function selectLocation(loc) {
        Storage.set(Storage.KEYS.CURRENT_LOCATION, { lat: loc.lat, lon: loc.lon });
        Storage.addRecentLocation(loc);
        window.location.href = 'index.html';
    }

    // ─── SETTINGS PAGE (handled by settings-handler.js) ────
    function initSettingsPage() {
        // Settings are handled by settings-handler.js which auto-inits
    }

    // ─── COMPARE PAGE ────────────────────────────────────────
    function initComparePage() {
        // Compare page logic is inline in compare.html
    }

    // ─── EMERGENCY PAGE ──────────────────────────────────────
    function initEmergencyPage() {
        // Emergency page logic is inline in emergency.html
    }

    // ─── SETTINGS ────────────────────────────────────────────
    function setupAutoThemeToggle() {
        const toggle = document.getElementById('autoThemeToggle');
        const demo = document.getElementById('demoWeatherSection');
        if (!toggle) return;
        const s = Storage.getSettings();
        toggle.checked = s.autoWeatherTheme !== false;
        if (demo) demo.style.display = toggle.checked ? 'none' : 'block';
        toggle.addEventListener('change', e => {
            Storage.updateSettings({ autoWeatherTheme: e.target.checked });
            if (demo) demo.style.display = e.target.checked ? 'none' : 'block';
            if (e.target.checked && state.weatherData) applyAutoWeatherTheme(state.weatherData);
        });
    }

    // ─── OFFLINE / NETWORK ───────────────────────────────────
    function setupOfflineDetection() {
        window.addEventListener('online', () => {
            state.isOffline = false;
            hideNetworkBanner();
            UI.showNotification("You're back online", 'success');
            refreshWeather();
        });
        window.addEventListener('offline', () => {
            state.isOffline = true;
            showNetworkBanner();
            UI.showNotification("You're offline", 'warning');
        });
    }

    function setupNetworkBanner() {
        let banner = document.getElementById('offlineBanner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'offlineBanner';
            banner.className = 'offline-banner';
            banner.innerHTML = '<i class="fa-solid fa-wifi-slash"></i> <span>You\'re offline. Some features may be unavailable.</span>';
            banner.style.display = 'none';
            document.body.prepend(banner);
        }
        if (state.isOffline) showNetworkBanner();
    }

    function showNetworkBanner() {
        const b = document.getElementById('offlineBanner');
        if (b) b.style.display = 'flex';
    }
    function hideNetworkBanner() {
        const b = document.getElementById('offlineBanner');
        if (b) b.style.display = 'none';
    }

    function showApiUnavailable() {
        const main = document.querySelector('.main-content');
        if (!main) return;
        const card = document.createElement('div');
        card.className = 'api-error-card';
        card.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i>
            <h3>API Unavailable</h3>
            <p>Please check your API key or try again later.</p>`;
        main.prepend(card);
    }

    function handleError(err) {
        console.error('App Error:', err);
        UI.showNotification('Something went wrong. Please try again.', 'error');
    }

    function setDemoWeather(type) {
        const t = document.getElementById('autoThemeToggle');
        if (t) { t.checked = false; Storage.updateSettings({ autoWeatherTheme: false }); }
        if (typeof WeatherEngine !== 'undefined') WeatherEngine.setWeather(type);
    }

    return {
        init, loadWeather, refreshWeather, setDemoWeather,
        removeTrip, selectLocation, renderTripCountdowns,
        renderSearchResults, renderRecentSearches,
        renderPopularDestinations, initCharts,
        getState: () => ({ ...state })
    };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
