/**
 * ClimateGuard - Units Module
 * Display-only temperature conversion. All internal data, storage, and
 * RiskEngine analysis stay in Celsius; convert at render time only.
 */
const Units = (function() {
    const CELSIUS = 'celsius';
    const FAHRENHEIT = 'fahrenheit';

    function get() {
        try {
            const u = (typeof Storage !== 'undefined') ? Storage.getSettings().units : CELSIUS;
            return u === FAHRENHEIT ? FAHRENHEIT : CELSIUS;
        } catch { return CELSIUS; }
    }

    function set(u) {
        const next = (u === FAHRENHEIT) ? FAHRENHEIT : CELSIUS;
        if (typeof Storage !== 'undefined') Storage.updateSettings({ units: next });
        try {
            if (typeof document !== 'undefined' && document.dispatchEvent && typeof CustomEvent !== 'undefined') {
                document.dispatchEvent(new CustomEvent('unitschange', { detail: { units: next } }));
            }
        } catch { /* non-DOM environment */ }
        return next;
    }

    // Convert a Celsius value to the active unit (rounded). null-safe.
    function display(celsius) {
        if (celsius === null || celsius === undefined) return null;
        const c = Number(celsius);
        if (!isFinite(c)) return null;
        return get() === FAHRENHEIT ? Math.round(c * 9 / 5 + 32) : Math.round(c);
    }

    function symbol() {
        return get() === FAHRENHEIT ? '°F' : '°C';
    }

    // Fully formatted display string, e.g. "28°C" / "82°F" / "—"
    function format(celsius) {
        const d = display(celsius);
        return d === null ? '—' : d + symbol();
    }

    return { get, set, display, symbol, format, CELSIUS, FAHRENHEIT };
})();
