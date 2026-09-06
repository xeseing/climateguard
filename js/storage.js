/**
 * ClimateGuard - Storage Module (Extended)
 */
const Storage = (function() {
    const PREFIX = 'climateguard_';

    function get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(PREFIX + key);
            if (item === null) return defaultValue;
            return JSON.parse(item);
        } catch { return defaultValue; }
    }

    function set(key, value) {
        try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
        catch { return false; }
    }

    function remove(key) { try { localStorage.removeItem(PREFIX + key); } catch {} }

    function clear() {
        try { Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k)); } catch {}
    }

    const KEYS = {
        THEME: 'theme', UNITS: 'units', ANIMATIONS_ENABLED: 'animations_enabled',
        RECENT_LOCATIONS: 'recent_locations', CURRENT_LOCATION: 'current_location',
        LAST_WEATHER: 'last_weather', SETTINGS: 'settings',
        TRIP_REMINDERS: 'trip_reminders', EMERGENCY_CONTACTS: 'emergency_contacts',
        PROFILE: 'profile', COMPARISON_CITIES: 'comparison_cities'
    };

    const DEFAULT_SETTINGS = {
        theme: 'dark', units: 'celsius', animationsEnabled: true,
        notificationsEnabled: false, autoLocation: true, autoWeatherTheme: true,
        language: 'en', gpsEnabled: false,
        notif_weatherAlerts: true, notif_tripReminders: true,
        notif_dailyForecast: false, notif_emergencyAlerts: true
    };

    // Fresh merged copy every call: callers can never mutate DEFAULT_SETTINGS,
    // and partial/corrupt stored settings heal against current defaults.
    function getSettings() {
        const stored = get(KEYS.SETTINGS, null);
        const safe = (stored && typeof stored === 'object') ? stored : {};
        return { ...DEFAULT_SETTINGS, ...safe };
    }
    function updateSettings(s) { const c = getSettings(); const u = { ...c, ...s }; set(KEYS.SETTINGS, u); return u; }

    function addRecentLocation(loc, max = 5) {
        const r = get(KEYS.RECENT_LOCATIONS, []);
        const f = r.filter(l => l.name !== loc.name);
        f.unshift(loc);
        set(KEYS.RECENT_LOCATIONS, f.slice(0, max));
        return f;
    }
    function getRecentLocations() { return get(KEYS.RECENT_LOCATIONS, []); }

    // Trip reminders
    function getTripReminders() { return get(KEYS.TRIP_REMINDERS, []); }
    function saveTripReminder(trip) {
        const trips = getTripReminders();
        trip.id = trip.id || Date.now().toString(36);
        trips.push(trip);
        set(KEYS.TRIP_REMINDERS, trips);
        return trip;
    }
    function removeTripReminder(id) {
        set(KEYS.TRIP_REMINDERS, getTripReminders().filter(t => t.id !== id));
    }

    // Emergency contacts
    function getEmergencyContacts() { return get(KEYS.EMERGENCY_CONTACTS, []); }
    function saveEmergencyContact(contact) {
        const c = getEmergencyContacts();
        contact.id = contact.id || Date.now().toString(36);
        c.push(contact);
        set(KEYS.EMERGENCY_CONTACTS, c);
        return contact;
    }
    function removeEmergencyContact(id) {
        set(KEYS.EMERGENCY_CONTACTS, getEmergencyContacts().filter(c => c.id !== id));
    }

    // Profile
    function getProfile() { return get(KEYS.PROFILE, { displayName: '', avatar: '', homeCity: '' }); }
    function saveProfile(p) { set(KEYS.PROFILE, p); }

    return {
        get, set, remove, clear, KEYS, DEFAULT_SETTINGS,
        getSettings, updateSettings, addRecentLocation, getRecentLocations,
        getTripReminders, saveTripReminder, removeTripReminder,
        getEmergencyContacts, saveEmergencyContact, removeEmergencyContact,
        getProfile, saveProfile
    };
})();
