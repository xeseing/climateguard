/**
 * ClimateGuard - UI Module
 * DOM updates, notifications, loading states, clock, settings panel
 */
const UI = (function() {
    let clockTimer = null;

    function init() {
        setupClock();
        setupSettingsPanel();
        setupRevealAnimations();
    }

    // ─── CLOCK ───────────────────────────────────────────────
    function setupClock() {
        updateClock();
        clockTimer = setInterval(updateClock, 1000);
    }

    function updateClock() {
        const el = document.getElementById('currentTime');
        if (!el) return;
        el.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    // ─── SETTINGS PANEL ──────────────────────────────────────
    function setupSettingsPanel() {
        const btn = document.getElementById('settingsBtn');
        const panel = document.getElementById('settingsPanel');
        const overlay = document.getElementById('settingsOverlay');
        const close = document.getElementById('closeSettings');
        if (!panel) return;

        const open = () => { panel.classList.add('open'); if (overlay) overlay.classList.add('open'); };
        const shut = () => { panel.classList.remove('open'); if (overlay) overlay.classList.remove('open'); };
        if (btn) btn.addEventListener('click', open);
        if (close) close.addEventListener('click', shut);
        if (overlay) overlay.addEventListener('click', shut);
    }

    function openSettings() {
        const p = document.getElementById('settingsPanel');
        const o = document.getElementById('settingsOverlay');
        if (p) p.classList.add('open');
        if (o) o.classList.add('open');
    }

    // ─── WEATHER DISPLAY UPDATE ──────────────────────────────
    function updateWeatherDisplay(data) {
        if (!data) return;
        const w = data.weather || data;
        const loc = data.location;

        setText('locationName', loc?.name || 'Your Location');
        setText('temperature', Units.format(w.temp));
        setText('condition', w.conditionText || '');
        setText('tempHigh', 'H: ' + Units.format(w.tempMax));
        setText('tempLow', 'L: ' + Units.format(w.tempMin));
        setText('uvIndexValue', w.uvIndex ?? '—');
        setText('airQualityValue', w.airQuality ?? '—');
        setText('windSpeedValue', w.windSpeed ?? '—');
        setText('windDirection', w.windDirection || '—');
        setText('humidityValue', (w.humidity ?? '—') + '%');
        setText('feelsLikeValue', Units.format(w.feelsLike));
        setText('pressureValue', w.pressure ?? '—');
        setText('visibilityValue', (w.visibility ?? '—') + ' km');
        setText('precipValue', w.precipitation == null ? '—' : w.precipitation + ' mm');

        // Compass needle rotation
        const needle = document.getElementById('compassNeedle');
        if (needle && w.windDegree != null) needle.style.transform = `rotate(${w.windDegree}deg)`;

        // Humidity gauge arc (path length 126)
        const humArc = document.getElementById('humidityGaugeArc');
        if (humArc && w.humidity != null) humArc.style.strokeDashoffset = (126 * (1 - w.humidity / 100)).toFixed(1);

        // Pressure gauge arc (980–1040 hPa mapped to full arc)
        const pressArc = document.getElementById('pressureGaugeArc');
        if (pressArc && w.pressure != null) {
            const ratio = Math.max(0, Math.min(1, (w.pressure - 980) / 60));
            pressArc.style.strokeDashoffset = (126 * (1 - ratio)).toFixed(1);
        }

        // Dew point (Magnus formula)
        if (w.temp != null && w.humidity != null && w.humidity > 0) {
            const a = 17.27, b = 237.7;
            const gamma = (a * w.temp) / (b + w.temp) + Math.log(w.humidity / 100);
            setText('dewPointValue', Units.format(Math.round((b * gamma) / (a - gamma))));
        }

        // Update date
        const dateEl = document.getElementById('currentDate');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        }

        // UV status
        updateStatusLabel('.uv-card .status-label', getUVLevel(w.uvIndex));
        // AQI status
        updateStatusLabel('.aqi-card .status-label', getAQILevel(w.airQuality));

        // UV indicator position
        const uvInd = document.querySelector('.uv-indicator');
        if (uvInd && w.uvIndex != null) uvInd.style.left = Math.min(w.uvIndex / 11 * 100, 100) + '%';
        const aqiInd = document.querySelector('.aqi-indicator');
        if (aqiInd && w.airQuality != null) aqiInd.style.left = Math.min(w.airQuality / 300 * 100, 100) + '%';
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function getUVLevel(uv) {
        if (uv == null) return { label: '—', cls: 'status-label--good' };
        if (uv <= 2) return { label: 'Low', cls: 'status-label--good' };
        if (uv <= 5) return { label: 'Moderate', cls: 'status-label--moderate' };
        if (uv <= 7) return { label: 'High', cls: 'status-label--poor' };
        return { label: 'Extreme', cls: 'status-label--danger' };
    }

    function getAQILevel(aqi) {
        if (aqi == null) return { label: '—', cls: 'status-label--good' };
        if (aqi <= 50) return { label: 'Good', cls: 'status-label--good' };
        if (aqi <= 100) return { label: 'Moderate', cls: 'status-label--moderate' };
        if (aqi <= 150) return { label: 'Poor', cls: 'status-label--poor' };
        return { label: 'Hazardous', cls: 'status-label--danger' };
    }

    function updateStatusLabel(selector, info) {
        const el = document.querySelector(selector);
        if (!el) return;
        el.className = 'status-label ' + info.cls;
        el.textContent = info.label;
    }

    // ─── HOURLY FORECAST ─────────────────────────────────────
    function renderHourlyForecast(hours) {
        const container = document.getElementById('hourlyContainer');
        if (!container || !hours) return;
        container.setAttribute('aria-busy', 'false');
        container.innerHTML = hours.slice(0, 24).map((h, i) => {
            const cls = i === 0 ? 'hourly-item now' : (h.isSunset ? 'hourly-item sunset' : 'hourly-item');
            const label = i === 0 ? 'Now' : h.timeFormatted;
            const icon = h.isSunrise ? 'fa-sunrise' : (h.isSunset ? 'fa-sunset' : (h.conditionIcon || 'fa-sun'));
            return `<div class="${cls}"><span class="time">${label}</span><i class="fa-solid ${icon}"></i><span class="temp">${Units.format(h.temp)}</span></div>`;
        }).join('');
    }

    // ─── HTML ESCAPING (XSS-safe interpolation) ────────────────
    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ─── HOURLY / WEEKLY LIST PAGES ────────────────────────────
    function buildHourlyListHTML(hours) {
        if (!hours || !hours.length) return '<p class="empty-state">No hourly data available</p>';
        return hours.map((h, i) => {
            const icon = h.isSunrise ? 'fa-sunrise' : (h.isSunset ? 'fa-sunset' : (h.conditionIcon || 'fa-sun'));
            const label = i === 0 ? 'Now' : escapeHtml(h.timeFormatted);
            const precip = (h.precipitation ?? 0) > 0 ? ` • 💧 ${escapeHtml(h.precipitation)}%` : '';
            return `<div class="list-item">` +
                `<div class="list-item__icon"><i class="fa-solid ${escapeHtml(icon)}"></i></div>` +
                `<div class="list-item__content"><div class="list-item__title">${label}</div>` +
                `<div class="list-item__subtitle">${escapeHtml(h.conditionText || h.condition || '')}${precip}</div></div>` +
                `<div class="list-item__value">${escapeHtml(Units.format(h.temp))}</div></div>`;
        }).join('');
    }

    function buildWeeklyListHTML(days) {
        if (!days || !days.length) return '<p class="empty-state">No weekly data available</p>';
        return days.map(d => {
            const icon = d.conditionIcon || 'fa-sun';
            return `<div class="list-item">` +
                `<div class="list-item__icon"><i class="fa-solid ${escapeHtml(icon)}"></i></div>` +
                `<div class="list-item__content"><div class="list-item__title">${escapeHtml(d.dayName)}</div>` +
                `<div class="list-item__subtitle">${escapeHtml(d.conditionText || d.condition || '')} • 💧 ${escapeHtml(d.precipitation ?? 0)}% • UV ${escapeHtml(d.uvIndex ?? '—')}</div></div>` +
                `<div class="list-item__value">${escapeHtml(Units.format(d.tempHigh))} / ${escapeHtml(Units.format(d.tempLow))}</div></div>`;
        }).join('');
    }

    function renderHourlyList(hours) {
        const container = document.getElementById('hourlyList');
        if (!container) return;
        container.setAttribute('aria-busy', 'false');
        container.innerHTML = buildHourlyListHTML(hours);
    }

    function renderWeeklyList(days) {
        const container = document.getElementById('weeklyContainer');
        if (!container) return;
        container.setAttribute('aria-busy', 'false');
        container.innerHTML = buildWeeklyListHTML(days);
    }

    // ─── SKELETON LOADERS + EMPTY STATES ───────────────────────
    function resolveEl(idOrEl) {
        if (!idOrEl) return null;
        return (typeof idOrEl === 'string') ? document.getElementById(idOrEl) : idOrEl;
    }

    function showSkeleton(idOrEl, rows = 3, variant = 'row') {
        const container = resolveEl(idOrEl);
        if (!container) return;
        const n = Math.max(1, Math.min(12, rows | 0 || 3));
        const cls = variant === 'card' ? 'skeleton skeleton--card' : 'skeleton skeleton--row';
        container.innerHTML = Array.from({ length: n }, () => `<div class="${cls}" aria-hidden="true"></div>`).join('');
        container.setAttribute('aria-busy', 'true');
    }

    function emptyHTML(icon, title, hint) {
        return `<div class="empty-state"><i class="fa-solid ${escapeHtml(icon || 'fa-circle-info')}"></i>` +
            `<p>${escapeHtml(title || 'Nothing here yet')}</p>` +
            (hint ? `<p class="empty-state__hint">${escapeHtml(hint)}</p>` : '') + `</div>`;
    }

    function renderEmpty(idOrEl, opts = {}) {
        const container = resolveEl(idOrEl);
        if (!container) return;
        container.setAttribute('aria-busy', 'false');
        container.innerHTML = emptyHTML(opts.icon, opts.title, opts.hint);
    }

    // ─── NOTIFICATIONS ───────────────────────────────────────
    function showNotification(message, type = 'info') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const icons = { success: 'fa-check-circle', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
        const notif = document.createElement('div');
        notif.className = `notification notification--${type}`;
        notif.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
        notif.style.animation = 'fadeIn 0.3s ease';
        document.body.appendChild(notif);

        setTimeout(() => {
            notif.classList.add('fade-out');
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    // ─── LOADING ─────────────────────────────────────────────
    function showLoading() {
        let l = document.getElementById('globalLoader');
        if (!l) {
            l = document.createElement('div');
            l.id = 'globalLoader';
            l.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
            l.innerHTML = '<div class="spinner-sm" style="width:40px;height:40px;border-width:3px"></div>';
            document.body.appendChild(l);
        }
        l.style.display = 'flex';
    }

    function hideLoading() {
        const l = document.getElementById('globalLoader');
        if (l) l.style.display = 'none';
    }

    // ─── REVEAL ANIMATIONS ───────────────────────────────────
    function setupRevealAnimations() {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }

    return {
        init, openSettings, updateWeatherDisplay, renderHourlyForecast,
        renderHourlyList, renderWeeklyList, buildHourlyListHTML, buildWeeklyListHTML,
        escapeHtml, showNotification, showLoading, hideLoading, setText,
        showSkeleton, emptyHTML, renderEmpty
    };
})();
