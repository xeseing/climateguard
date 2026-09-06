/**
 * ClimateGuard - API Module
 * Weather data fetching using OpenWeatherMap + Geocoding API
 * Includes sessionStorage caching for 5 minutes
 */

const WeatherAPI = (function () {
    function getApiKey() {
        try {
            const override = (typeof localStorage !== 'undefined') ? localStorage.getItem('climateguard_api_key') : null;
            if (override) return override;
        } catch { /* storage unavailable, fall through */ }
        if (typeof window !== 'undefined' && window.CLIMATEGUARD_API_KEY) return window.CLIMATEGUARD_API_KEY;
        return (typeof CONFIG !== 'undefined' && CONFIG.API_KEY) ? CONFIG.API_KEY : '';
    }
    function getBaseUrl() {
        return (typeof CONFIG !== 'undefined' && CONFIG.OWM_BASE) ? CONFIG.OWM_BASE : 'https://api.openweathermap.org/data/2.5';
    }
    function getGeoUrl() {
        return (typeof CONFIG !== 'undefined' && CONFIG.OWM_GEO) ? CONFIG.OWM_GEO : 'https://api.openweathermap.org/geo/1.0';
    }
    function getCacheDuration() {
        return (typeof CONFIG !== 'undefined' && CONFIG.API_CACHE_DURATION) ? CONFIG.API_CACHE_DURATION : 300000;
    }

    // ─── Cache helpers ───────────────────────────────────────
    function cacheGet(key) {
        try {
            const raw = sessionStorage.getItem('cg_cache_' + key);
            if (!raw) return null;
            const entry = JSON.parse(raw);
            if (Date.now() - entry.ts > getCacheDuration()) {
                sessionStorage.removeItem('cg_cache_' + key);
                return null;
            }
            return entry.data;
        } catch { return null; }
    }
    function cacheSet(key, data) {
        try {
            sessionStorage.setItem('cg_cache_' + key, JSON.stringify({ ts: Date.now(), data }));
        } catch { /* quota exceeded, ignore */ }
    }

    // ─── Mock data ───────────────────────────────────────────
    const MOCK_CURRENT = {
        location: { id: 'sf', name: 'San Francisco', region: 'California, USA', country: 'US', lat: 37.7749, lon: -122.4194 },
        weather: {
            condition: 'partly_cloudy', conditionText: 'Partly Cloudy',
            temp: 28, feelsLike: 30, tempMin: 21, tempMax: 32,
            humidity: 65, pressure: 1013, visibility: 10, uvIndex: 6,
            airQuality: 42, windSpeed: 18, windDirection: 'SW', windDegree: 225,
            precipitation: 0, cloudCover: 40, sunrise: '06:12', sunset: '18:24', isDay: true
        },
        timestamp: Date.now()
    };

    function generateHourly() {
        const hours = [], now = new Date(), base = 28;
        for (let i = 0; i < 24; i++) {
            const h = new Date(now.getTime() + i * 3600000);
            const hr = h.getHours(), isDay = hr >= 6 && hr < 19;
            let t = base;
            if (hr >= 12 && hr <= 15) t += 3;
            else if (hr >= 0 && hr <= 5) t -= 7;
            else if (hr >= 20 || hr <= 6) t -= 5;
            const cond = getCondForHour(hr, isDay);
            hours.push({
                time: h.toISOString(),
                timeFormatted: h.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                temp: t, condition: cond,
                conditionIcon: iconFor(cond, isDay),
                precipitation: Math.random() > 0.8 ? Math.floor(Math.random() * 20) : 0,
                isDay, isSunrise: hr === 6, isSunset: hr === 18
            });
        }
        return hours;
    }
    function generateWeekly() {
        const days = [], conds = ['sunny', 'partly_cloudy', 'cloudy', 'rain', 'partly_cloudy', 'sunny', 'partly_cloudy'];
        const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        for (let i = 0; i < 7; i++) {
            const d = new Date(); d.setDate(d.getDate() + i);
            const hi = 32 - Math.floor(Math.random() * 8), lo = hi - 10 - Math.floor(Math.random() * 3);
            days.push({
                date: d.toISOString(), dayName: i === 0 ? 'Today' : names[d.getDay()],
                condition: conds[i], conditionText: condLabel(conds[i]),
                conditionIcon: iconFor(conds[i], true),
                tempHigh: hi, tempLow: lo,
                precipitation: conds[i] === 'rain' ? 65 : Math.floor(Math.random() * 20),
                humidity: 50 + Math.floor(Math.random() * 30), uvIndex: Math.floor(Math.random() * 8) + 2
            });
        }
        return days;
    }

    function getCondForHour(h, isDay) {
        if (!isDay) return 'clear_night';
        if (h >= 12 && h <= 14) return 'sunny';
        if (h >= 15 && h <= 17) return 'partly_cloudy';
        return 'sunny';
    }
    function iconFor(cond, isDay) {
        const m = {
            'sunny': 'fa-sun', 'clear_day': 'fa-sun', 'clear_night': 'fa-moon',
            'partly_cloudy': isDay ? 'fa-cloud-sun' : 'fa-cloud-moon',
            'cloudy': 'fa-cloud', 'rain': 'fa-cloud-rain', 'storm': 'fa-cloud-bolt',
            'snow': 'fa-snowflake', 'fog': 'fa-smog', 'wind': 'fa-wind'
        };
        return m[cond] || 'fa-sun';
    }
    function condLabel(c) {
        const m = {
            'sunny': 'Sunny', 'clear_day': 'Clear', 'clear_night': 'Clear Night',
            'partly_cloudy': 'Partly Cloudy', 'cloudy': 'Cloudy', 'rain': 'Rainy',
            'storm': 'Thunderstorm', 'snow': 'Snow', 'fog': 'Foggy', 'wind': 'Windy'
        };
        return m[c] || c;
    }
    function mapCond(apiCond, isDay) {
        const m = {
            'Clear': isDay ? 'clear_day' : 'clear_night', 'Clouds': 'cloudy',
            'Rain': 'rain', 'Drizzle': 'rain', 'Thunderstorm': 'storm',
            'Snow': 'snow', 'Mist': 'fog', 'Fog': 'fog', 'Haze': 'fog', 'Smoke': 'fog'
        };
        return m[apiCond] || (isDay ? 'clear_day' : 'clear_night');
    }
    function windDir(deg) {
        const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        return dirs[Math.round(deg / 22.5) % 16];
    }

    // ─── Geocoding API: search any city globally ─────────────
    async function searchLocations(query) {
        const q = query.trim();
        if (q.length < 2) return [];
        const key = getApiKey();
        if (!key) return searchLocalDB(q); // keyless/offline: bundled city DB

        const ck = 'geo_' + q.toLowerCase();
        const cached = cacheGet(ck);
        if (cached) return cached;

        try {
            const res = await fetch(`${getGeoUrl()}/direct?q=${encodeURIComponent(q)}&limit=5&appid=${key}`);
            if (!res.ok) throw new Error('Geo API error');
            const data = await res.json();
            const results = data.map(loc => ({
                id: `${loc.lat}_${loc.lon}`,
                name: loc.name,
                region: [loc.state, loc.country].filter(Boolean).join(', '),
                country: loc.country,
                lat: loc.lat, lon: loc.lon
            }));
            cacheSet(ck, results);
            return results;
        } catch (err) {
            console.warn('Geocoding failed, trying local DB:', err);
            return searchLocalDB(q);
        }
    }

    // Fallback local DB (subset of cities)
    const CITY_DB = [
        { id: 'mumbai', name: 'Mumbai', region: 'Maharashtra, India', country: 'IN', lat: 19.0760, lon: 72.8777 },
        { id: 'delhi', name: 'New Delhi', region: 'Delhi, India', country: 'IN', lat: 28.6139, lon: 77.2090 },
        { id: 'bangalore', name: 'Bengaluru', region: 'Karnataka, India', country: 'IN', lat: 12.9716, lon: 77.5946 },
        { id: 'sf', name: 'San Francisco', region: 'California, USA', country: 'US', lat: 37.7749, lon: -122.4194 },
        { id: 'nyc', name: 'New York', region: 'New York, USA', country: 'US', lat: 40.7128, lon: -74.0060 },
        { id: 'london', name: 'London', region: 'United Kingdom', country: 'GB', lat: 51.5074, lon: -0.1278 },
        { id: 'tokyo', name: 'Tokyo', region: 'Japan', country: 'JP', lat: 35.6762, lon: 139.6503 },
        { id: 'paris', name: 'Paris', region: 'France', country: 'FR', lat: 48.8566, lon: 2.3522 },
        { id: 'dubai', name: 'Dubai', region: 'UAE', country: 'AE', lat: 25.2048, lon: 55.2708 },
        { id: 'singapore', name: 'Singapore', region: 'Singapore', country: 'SG', lat: 1.3521, lon: 103.8198 },
        { id: 'sydney', name: 'Sydney', region: 'Australia', country: 'AU', lat: -33.8688, lon: 151.2093 },
        { id: 'chennai', name: 'Chennai', region: 'Tamil Nadu, India', country: 'IN', lat: 13.0827, lon: 80.2707 },
        { id: 'kolkata', name: 'Kolkata', region: 'West Bengal, India', country: 'IN', lat: 22.5726, lon: 88.3639 },
        { id: 'hyderabad', name: 'Hyderabad', region: 'Telangana, India', country: 'IN', lat: 17.3850, lon: 78.4867 },
        { id: 'pune', name: 'Pune', region: 'Maharashtra, India', country: 'IN', lat: 18.5204, lon: 73.8567 },
        { id: 'la', name: 'Los Angeles', region: 'California, USA', country: 'US', lat: 34.0522, lon: -118.2437 },
        { id: 'chicago', name: 'Chicago', region: 'Illinois, USA', country: 'US', lat: 41.8781, lon: -87.6298 },
        { id: 'berlin', name: 'Berlin', region: 'Germany', country: 'DE', lat: 52.5200, lon: 13.4050 },
        { id: 'bangkok', name: 'Bangkok', region: 'Thailand', country: 'TH', lat: 13.7563, lon: 100.5018 },
        { id: 'cairo', name: 'Cairo', region: 'Egypt', country: 'EG', lat: 30.0444, lon: 31.2357 }
    ];
    function searchLocalDB(q) {
        const low = q.toLowerCase();
        return CITY_DB.filter(c =>
            c.name.toLowerCase().includes(low) || c.region.toLowerCase().includes(low) || c.country.toLowerCase() === low
        ).slice(0, 10);
    }

    // ─── Current weather ─────────────────────────────────────
    async function getCurrentWeather(lat, lon) {
        const key = getApiKey();
        if (!key) return MOCK_CURRENT;

        const ck = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
        const cached = cacheGet(ck);
        if (cached) return cached;

        try {
            // Fetch weather + air quality + UV index in parallel
            // NOTE: OWM /data/2.5/uvi is retired — UV comes from Open-Meteo (free, keyless)
            const [wRes, aqRes, uvRes] = await Promise.all([
                fetch(`${getBaseUrl()}/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric`),
                fetch(`${getBaseUrl()}/air_pollution?lat=${lat}&lon=${lon}&appid=${key}`).catch(() => null),
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=uv_index&timezone=auto`).catch(() => null)
            ]);

            if (!wRes.ok) throw new Error('Weather API error ' + wRes.status);
            const w = await wRes.json();
            let aqi = 42;
            try { if (aqRes && aqRes.ok) { const aq = await aqRes.json(); aqi = aq.list?.[0]?.main?.aqi * 25 || 42; } } catch { }
            let uvIndex = null; // null = unknown (UI shows —); never fabricate
            try {
                if (uvRes && uvRes.ok) {
                    const uv = await uvRes.json();
                    const v = uv?.current?.uv_index;
                    if (typeof v === 'number' && isFinite(v)) uvIndex = Math.max(0, Math.round(v));
                }
            } catch { }

            const isDay = w.weather?.[0]?.icon?.endsWith('d') ?? true;
            const result = {
                location: { id: w.id, name: w.name, country: w.sys?.country, lat: w.coord?.lat, lon: w.coord?.lon },
                weather: {
                    condition: mapCond(w.weather[0].main, isDay),
                    conditionText: w.weather[0].description.replace(/^\w/, c => c.toUpperCase()),
                    temp: Math.round(w.main.temp), feelsLike: Math.round(w.main.feels_like),
                    tempMin: Math.round(w.main.temp_min), tempMax: Math.round(w.main.temp_max),
                    humidity: w.main.humidity, pressure: w.main.pressure,
                    visibility: Math.round((w.visibility || 10000) / 1000),
                    uvIndex, airQuality: aqi,
                    windSpeed: Math.round((w.wind?.speed || 0) * 3.6),
                    windDirection: windDir(w.wind?.deg || 0), windDegree: w.wind?.deg || 0,
                    precipitation: w.rain?.['1h'] || w.rain?.['3h'] || 0,
                    cloudCover: w.clouds?.all || 0, isDay
                },
                timestamp: Date.now()
            };
            cacheSet(ck, result);
            return result;
        } catch (err) {
            console.error('API Error:', err);
            return MOCK_CURRENT;
        }
    }

    // ─── Forecasts (use 5-day / 3-hour API) ──────────────────
    async function getHourlyForecast(lat, lon) {
        const key = getApiKey();
        if (!key || !validCoords(lat, lon)) return generateHourly();

        const ck = `hourly_${lat.toFixed(2)}_${lon.toFixed(2)}`;
        const cached = cacheGet(ck);
        if (cached) return cached;

        try {
            const res = await fetch(`${getBaseUrl()}/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=metric&cnt=24`);
            if (!res.ok) throw new Error('Forecast error');
            const data = await res.json();
            const hours = data.list.map(item => {
                const dt = new Date(item.dt * 1000);
                const isDay = item.sys?.pod === 'd';
                const cond = mapCond(item.weather[0].main, isDay);
                return {
                    time: dt.toISOString(),
                    timeFormatted: dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                    temp: Math.round(item.main.temp), condition: cond,
                    conditionIcon: iconFor(cond, isDay),
                    precipitation: Math.round((item.pop || 0) * 100),
                    isDay, isSunrise: false, isSunset: false
                };
            });
            cacheSet(ck, hours);
            return hours;
        } catch {
            return generateHourly();
        }
    }

    function validCoords(lat, lon) {
        return typeof lat === 'number' && typeof lon === 'number' && isFinite(lat) && isFinite(lon);
    }

    // Group 3-hourly /forecast items into daily summaries
    function aggregateDaily(list) {
        const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const groups = new Map();
        for (const item of list) {
            if (!item || !item.dt) continue;
            const key = new Date(item.dt * 1000).toISOString().slice(0, 10); // UTC calendar day
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(item);
        }
        let first = true;
        return [...groups.entries()].map(([key, items]) => {
            const temps = items.map(i => i.main?.temp).filter(t => typeof t === 'number');
            const hums = items.map(i => i.main?.humidity).filter(h => typeof h === 'number');
            const pops = items.map(i => Math.round((i.pop || 0) * 100));
            const votes = {};
            for (const i of items) {
                const c = mapCond(i.weather?.[0]?.main || 'Clear', true);
                votes[c] = (votes[c] || 0) + 1;
            }
            const condition = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0] || 'clear_day';
            const dt = new Date(items[0].dt * 1000);
            const day = {
                date: dt.toISOString(),
                dayName: first ? 'Today' : names[dt.getUTCDay()],
                condition, conditionText: condLabel(condition),
                conditionIcon: iconFor(condition, true),
                tempHigh: temps.length ? Math.round(Math.max(...temps)) : null,
                tempLow: temps.length ? Math.round(Math.min(...temps)) : null,
                precipitation: pops.length ? Math.max(...pops) : 0,
                humidity: hums.length ? Math.round(hums.reduce((a, b) => a + b, 0) / hums.length) : null,
                uvIndex: null // not provided by /forecast; null = unknown (UI shows —)
            };
            first = false;
            return day;
        });
    }

    async function getWeeklyForecast(lat, lon) {
        const key = getApiKey();
        if (!key || !validCoords(lat, lon)) return generateWeekly();

        const ck = `weekly_${lat.toFixed(2)}_${lon.toFixed(2)}`;
        const cached = cacheGet(ck);
        if (cached) return cached;

        try {
            const res = await fetch(`${getBaseUrl()}/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=metric&cnt=40`);
            if (!res.ok) throw new Error('Forecast error');
            const data = await res.json();
            const days = aggregateDaily(data.list || []);
            if (!days.length) return generateWeekly();
            cacheSet(ck, days);
            return days;
        } catch {
            return generateWeekly();
        }
    }

    // ─── Geolocation ─────────────────────────────────────────
    function getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                err => {
                    const error = new Error('Location unavailable: ' + (err && err.message ? err.message : 'unknown error'));
                    error.code = err && err.code;
                    reject(error); // never silently substitute a location — callers decide
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        });
    }

    // ─── Reverse geocode (lat/lon → city name) ───────────────
    async function reverseGeocode(lat, lon) {
        const key = getApiKey();
        if (!key) return 'Your Location';
        try {
            const res = await fetch(`${getGeoUrl()}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${key}`);
            if (!res.ok) return 'Your Location';
            const data = await res.json();
            return data[0]?.name || 'Your Location';
        } catch { return 'Your Location'; }
    }

    function getAllCities() { return CITY_DB; }

    return {
        getCurrentWeather, getHourlyForecast, getWeeklyForecast,
        searchLocations, getCurrentLocation, reverseGeocode,
        getIconForCondition: iconFor, formatCondition: condLabel,
        getAllCities, CITY_DB, MOCK_DATA: { current: MOCK_CURRENT, hourly: generateHourly(), weekly: generateWeekly() }
    };
})();
