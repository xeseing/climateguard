/**
 * ClimateGuard - Configuration
 * API keys and app constants stored in one place
 */

const CONFIG = {
    // OpenWeatherMap API Key — NEVER commit a real key here.
    // Provide it at runtime instead (first match wins):
    //   1. localStorage key  'climateguard_api_key'
    //   2. window.CLIMATEGUARD_API_KEY (e.g. via an untracked js/config.local.js)
    //   3. this default (keep empty in the repo)
    API_KEY: '',

    // API Endpoints
    OWM_BASE: 'https://api.openweathermap.org/data/2.5',
    OWM_GEO: 'https://api.openweathermap.org/geo/1.0',

    // Refresh intervals (ms)
    WEATHER_POLL_INTERVAL: 60000,       // 60 seconds
    COUNTDOWN_INTERVAL: 1000,           // 1 second
    CLOCK_INTERVAL: 1000,               // 1 second

    // Cache duration (ms)
    API_CACHE_DURATION: 5 * 60 * 1000,  // 5 minutes

    // Search debounce (ms)
    SEARCH_DEBOUNCE: 300,

    // App version
    VERSION: '6.0.0',
    APP_NAME: 'ClimateGuard',

    // Emergency numbers by country
    EMERGENCY_NUMBERS: {
        'US': { police: '911', ambulance: '911', fire: '911', label: 'United States' },
        'GB': { police: '999', ambulance: '999', fire: '999', label: 'United Kingdom' },
        'IN': { police: '100', ambulance: '108', fire: '101', label: 'India' },
        'AU': { police: '000', ambulance: '000', fire: '000', label: 'Australia' },
        'DE': { police: '110', ambulance: '112', fire: '112', label: 'Germany' },
        'FR': { police: '17', ambulance: '15', fire: '18', label: 'France' },
        'JP': { police: '110', ambulance: '119', fire: '119', label: 'Japan' },
        'CN': { police: '110', ambulance: '120', fire: '119', label: 'China' },
        'BR': { police: '190', ambulance: '192', fire: '193', label: 'Brazil' },
        'AE': { police: '999', ambulance: '998', fire: '997', label: 'UAE' },
        'SG': { police: '999', ambulance: '995', fire: '995', label: 'Singapore' },
        'KR': { police: '112', ambulance: '119', fire: '119', label: 'South Korea' },
        'ES': { police: '112', ambulance: '112', fire: '112', label: 'Spain' },
        'IT': { police: '113', ambulance: '118', fire: '115', label: 'Italy' },
        'NL': { police: '112', ambulance: '112', fire: '112', label: 'Netherlands' },
        'TR': { police: '155', ambulance: '112', fire: '110', label: 'Turkey' },
        'ZA': { police: '10111', ambulance: '10177', fire: '10177', label: 'South Africa' },
        'KE': { police: '999', ambulance: '999', fire: '999', label: 'Kenya' },
        'EG': { police: '122', ambulance: '123', fire: '180', label: 'Egypt' },
        'AR': { police: '101', ambulance: '107', fire: '100', label: 'Argentina' },
        'TH': { police: '191', ambulance: '1669', fire: '199', label: 'Thailand' },
        'MY': { police: '999', ambulance: '999', fire: '994', label: 'Malaysia' },
        'HK': { police: '999', ambulance: '999', fire: '999', label: 'Hong Kong' }
    }
};
