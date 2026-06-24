/**
 * ClimateGuard - Theme Module
 * Manages dark/light mode, system preference detection, and persistence
 */
const Theme = (function() {
    let currentTheme = 'dark';

    function init() {
        // Load from storage
        const settings = (typeof Storage !== 'undefined' && Storage.getSettings) ? Storage.getSettings() : {};
        currentTheme = settings.theme || 'dark';

        // Check system preference if no saved preference
        if (!settings.theme && window.matchMedia) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            currentTheme = prefersDark ? 'dark' : 'light';
        }

        applyTheme(currentTheme);

        // Listen for system changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                const s = (typeof Storage !== 'undefined' && Storage.getSettings) ? Storage.getSettings() : {};
                if (!s.theme) {
                    const newTheme = e.matches ? 'dark' : 'light';
                    applyTheme(newTheme);
                }
            });
        }

        // Apply saved animations setting
        if (settings.animationsEnabled === false && typeof AnimationEngine !== 'undefined') {
            AnimationEngine.setEnabled(false);
        }
    }

    function applyTheme(theme) {
        currentTheme = theme;
        const body = document.body;
        const html = document.documentElement;

        // Add transition class
        body.classList.add('theme-transitioning');

        if (theme === 'light') {
            body.classList.add('light');
            html.setAttribute('data-theme', 'light');
        } else {
            body.classList.remove('light');
            html.setAttribute('data-theme', 'dark');
        }

        // Update meta theme-color
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0a12' : '#f0f5fa');

        // Remove transition class after animation
        setTimeout(() => body.classList.remove('theme-transitioning'), 500);

        // Sync toggle
        const toggle = document.getElementById('themeToggle');
        if (toggle) toggle.checked = theme === 'dark';
    }

    function toggle() {
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        if (typeof Storage !== 'undefined' && Storage.updateSettings) {
            Storage.updateSettings({ theme: newTheme });
        }
        return newTheme;
    }

    function getTheme() { return currentTheme; }
    function isDark() { return currentTheme === 'dark'; }

    return { init, applyTheme, toggle, getTheme, isDark };
})();
