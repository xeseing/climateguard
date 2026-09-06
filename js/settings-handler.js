/**
 * ClimateGuard - Settings Handler
 * Binds all settings panel toggles, profile, notifications, GPS, language
 */
(function() {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initSettings, 500);
    });

    function initSettings() {
        const s = Storage.getSettings();
        const profile = Storage.getProfile();

        // Theme toggle — Theme module is the single source of truth
        // (Theme.init already applied the saved theme on load)
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.checked = s.theme !== 'light';
            themeToggle.addEventListener('change', e => {
                const next = e.target.checked ? 'dark' : 'light';
                Storage.updateSettings({ theme: next });
                if (typeof Theme !== 'undefined') Theme.applyTheme(next);
            });
        }

        // Animations toggle
        const animToggle = document.getElementById('animationsToggle');
        if (animToggle) {
            animToggle.checked = s.animationsEnabled !== false;
            animToggle.addEventListener('change', e => {
                Storage.updateSettings({ animationsEnabled: e.target.checked });
                if (typeof AnimationEngine !== 'undefined') {
                    AnimationEngine.setEnabled(e.target.checked);
                }
            });
        }

        // Units toggle (checked = Celsius); reload re-renders every surface consistently
        const unitsToggle = document.getElementById('unitsToggle');
        if (unitsToggle) {
            unitsToggle.checked = s.units !== 'fahrenheit';
            unitsToggle.addEventListener('change', e => {
                const next = e.target.checked ? 'celsius' : 'fahrenheit';
                if (typeof Units !== 'undefined') Units.set(next);
                else Storage.updateSettings({ units: next });
                if (typeof window !== 'undefined' && window.location && window.location.reload) window.location.reload();
            });
        }

        // Notification master toggle
        const notifMaster = document.getElementById('notifMaster');
        const notifGranular = document.getElementById('notifGranular');
        if (notifMaster) {
            notifMaster.checked = !!s.notificationsEnabled;
            if (notifGranular) notifGranular.style.display = notifMaster.checked ? 'block' : 'none';
            notifMaster.addEventListener('change', e => {
                Storage.updateSettings({ notificationsEnabled: e.target.checked });
                if (notifGranular) notifGranular.style.display = e.target.checked ? 'block' : 'none';
                if (e.target.checked && 'Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            });
        }

        // Sub-notification toggles
        ['notifWeather', 'notifTrips', 'notifDaily', 'notifEmergency'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const key = 'notif_' + id.replace('notif', '').charAt(0).toLowerCase() + id.replace('notif', '').slice(1);
            const settingKey = {
                notifWeather: 'notif_weatherAlerts', notifTrips: 'notif_tripReminders',
                notifDaily: 'notif_dailyForecast', notifEmergency: 'notif_emergencyAlerts'
            }[id];
            el.checked = s[settingKey] !== false;
            el.addEventListener('change', e => {
                Storage.updateSettings({ [settingKey]: e.target.checked });
            });
        });

        // GPS toggle
        const gpsToggle = document.getElementById('gpsToggle');
        const gpsStatus = document.getElementById('gpsStatus');
        if (gpsToggle) {
            gpsToggle.checked = !!s.gpsEnabled;
            gpsToggle.addEventListener('change', e => {
                Storage.updateSettings({ gpsEnabled: e.target.checked });
                if (e.target.checked) {
                    navigator.geolocation.getCurrentPosition(
                        () => updateGpsStatus('granted'),
                        err => updateGpsStatus(err.code === 1 ? 'denied' : 'error'),
                        { timeout: 5000 }
                    );
                }
            });
        }
        // Check GPS permission
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then(result => {
                updateGpsStatus(result.state);
                result.onchange = () => updateGpsStatus(result.state);
            }).catch(() => {});
        }

        function updateGpsStatus(status) {
            if (!gpsStatus) return;
            const map = {
                granted: { text: 'Granted', cls: 'permission-badge--granted' },
                denied: { text: 'Denied', cls: 'permission-badge--denied' },
                prompt: { text: 'Not Asked', cls: 'permission-badge--default' }
            };
            const info = map[status] || map.prompt;
            gpsStatus.textContent = info.text;
            gpsStatus.className = 'permission-badge ' + info.cls;
        }

        // Network status
        function updateNetworkUI() {
            const dot = document.getElementById('networkDot');
            const label = document.getElementById('networkLabel');
            if (dot) { dot.className = 'network-dot ' + (navigator.onLine ? 'network-dot--online' : 'network-dot--offline'); }
            if (label) label.textContent = navigator.onLine ? 'Online' : 'Offline';
        }
        updateNetworkUI();
        window.addEventListener('online', updateNetworkUI);
        window.addEventListener('offline', updateNetworkUI);

        // Language selector
        const langSelect = document.getElementById('languageSelect');
        if (langSelect) {
            langSelect.value = s.language || 'en';
            langSelect.addEventListener('change', e => {
                if (typeof I18n !== 'undefined') I18n.setLanguage(e.target.value);
            });
        }

        // Profile
        const nameInput = document.getElementById('profileName');
        const cityInput = document.getElementById('profileCity');
        const avatarEl = document.getElementById('profileAvatar');
        const avatarUpload = document.getElementById('avatarUpload');

        if (nameInput) { nameInput.value = profile.displayName || ''; nameInput.addEventListener('change', () => { Storage.saveProfile({ ...Storage.getProfile(), displayName: nameInput.value }); }); }
        if (cityInput) { cityInput.value = profile.homeCity || ''; cityInput.addEventListener('change', () => { Storage.saveProfile({ ...Storage.getProfile(), homeCity: cityInput.value }); }); }
        if (avatarEl && avatarUpload) {
            if (profile.avatar) avatarEl.innerHTML = `<img src="${profile.avatar}" alt="Avatar">`;
            avatarEl.addEventListener('click', () => avatarUpload.click());
            avatarUpload.addEventListener('change', e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                    const dataUrl = ev.target.result;
                    avatarEl.innerHTML = `<img src="${dataUrl}" alt="Avatar">`;
                    Storage.saveProfile({ ...Storage.getProfile(), avatar: dataUrl });
                };
                reader.readAsDataURL(file);
            });
        }
    }
})();
