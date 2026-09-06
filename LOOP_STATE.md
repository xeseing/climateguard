# LOOP_STATE.md — ClimateGuard Verification-Driven Loop

> Autonomous loop tracker. Every fix is verified by tests/linters before being marked complete.
> Max 5 attempts per issue. No bulk unverified changes.

- **Repo:** `xeseing/climateguard` (static multi-page site: `pages/`, `js/`, `css/`, no build step)
- **Branch:** `arena/01a0790a-climateguard`
- **Stack:** Vanilla JS (IIFE globals) + Leaflet/Chart.js/jsPDF via CDN. No package.json, no tests (until this loop).
- **Last updated:** 2026-09-06 — Phase 0/1 (audit) complete, harness initialized, Phase 2 in progress.

---

## PHASE 0 — Audit summary

| Area | Result |
|---|---|
| JS syntax (`node --check`, 13 files) | ✅ all pass |
| HTML pages (8 in `pages/`) | ⚠️ 2 dead/orphan (hourly, weekly); no root `index.html` |
| CSS hooks for JS-rendered classes | ✅ mostly present; `.offline-banner`, `.api-error-card` missing |
| Tests / lint / CI | ❌ none (added in Phase 1) |
| Deps | CDN-only: FontAwesome, Chart.js, jsPDF, Leaflet, Google Fonts |

---

## PHASE 1 — Bug / gap register

**Severity:** 🔴 critical · 🟠 high · 🟡 medium · 🔵 low

| ID | Sev | Title | Status | Verified |
|---|---|---|---|---|
| BUG-01 | 🔴 | `hourly.html` / `weekly.html` are dead AND orphan: no render logic (no `app.js` page handler, no inline JS) and zero inbound links | ✅ FIXED | `npm test` (ui-render) + `node --check` + link grep |
| BUG-02 | 🟠 | `getWeeklyForecast()` ignores lat/lon, always returns random mock data presented as a real forecast | ✅ FIXED | `npm test` (api-forecast) + lint |
| BUG-03 | 🟠 | Deprecated OWM UV endpoint (`/data/2.5/uvi` retired) → UV silently falls back to hardcoded `6` | ✅ FIXED | `npm test` (api-current) + lint |
| BUG-04 | 🟠 | Stored/reflected XSS via `innerHTML`: trip city, search results, compare cities, emergency contacts, popular cities (no escaping anywhere) | ✅ FIXED | `npm test` (xss) + lint + handler grep |
| BUG-05 | 🟠 | Hardcoded OpenWeatherMap API key in `js/config.js` (committed secret) | ✅ FIXED | `npm test` (api-key) + lint |
| BUG-06 | 🟠 | Trip planner double-binding: `trip-planner.js` + page inline script both handle `#analyzeBtn` → double render / conflicting output, `#verdictCard` only in one path | ✅ FIXED | `npm test` (trip-bindings) + lint |
| BUG-07 | 🟡 | `getCurrentLocation()` swallows denial errors, resolves SF fallback → "Use Current Location" silently teleports user to San Francisco | ✅ FIXED | `npm test` (geolocation) + lint |
| BUG-08 | 🟡 | `searchLocations()` returns `[]` with no API key instead of local-DB fallback → search dead offline/keyless | ✅ FIXED | `npm test` (search-fallback) + lint |
| BUG-09 | 🟡 | Risk report race: page waits fixed 800 ms then reads possibly-stale/missing `LAST_WEATHER` cache, silently falls back to SF mock | ✅ FIXED | `npm test` (risk-report) + lint |
| BUG-10 | 🟡 | Map layer buttons (temp/wind/precip/clouds) only swap the legend — no actual tile-layer change; all 30 city markers are hardcoded static fake data | ✅ FIXED | `npm test` (map-layers) + lint |
| BUG-11 | 🟡 | `particles.js` snow color hack produces invalid 5-component `rgba()` → `fillStyle` assignment ignored (snow renders wrong/invisible) | TODO | — |
| BUG-12 | 🟡 | `index.html` precipitation card hardcoded `0 mm` + `initCharts` hardcoded fake `[5,8,12,…]` data; compass needle + humidity gauge never update | TODO | — |
| BUG-13 | 🟡 | i18n largely non-functional: only ~1 `data-i18n` attribute in the whole app; language switcher translates almost nothing | TODO | — |
| BUG-14 | 🟡 | PDF downloads (`risk-report`, `compare`, `trip`) assume `window.jspdf` exists → TypeError crash if CDN blocked | TODO | — |
| BUG-15 | 🟡 | `renderPopularDestinations` fires 6 **sequential** API calls on every home load (slow, no error state) | TODO | — |
| BUG-16 | 🔵 | No root `index.html` / redirect — static hosts serving repo root show nothing | TODO | — |
| BUG-17 | 🔵 | Theme applied twice (`Theme.init` + `settings-handler` direct DOM manipulation, bypassing `Theme.applyTheme`) | TODO | — |
| BUG-18 | 🔵 | `Storage.getSettings()` returns live `DEFAULT_SETTINGS` reference when empty (mutation risk); `units` setting dead (no UI/conversion) | TODO | — |
| BUG-19 | 🔵 | Missing CSS: `.offline-banner`, `.api-error-card` (JS injects them unstyled); `Notification.icon: '🌤️'` invalid | TODO | — |
| BUG-20 | 🔵 | ~~`lat=undefined` URL guard~~ (done in BUG-02); `mapCond('Clouds')` never yields `partly_cloudy` | TODO | — |

**Architectural notes (feed Phase 3):** no PWA manifest/service worker despite offline claims; per-page script-tag soup (13 tags, order-sensitive globals); mock data silently substituted for live data in several paths — should be badged "demo data" when used.

---

## PHASE 1 — Test harness

- `package.json` — `npm test` → `node --test tests/`, `npm run lint` → `node --check` over `js/` + inline `<script>` extraction check per page.
- `tests/helpers.js` — minimal browser stubs (`localStorage`, `sessionStorage`, `document`, `window`, `navigator`) + module loader for IIFE scripts.
- `tests/risk-engine.test.js` — baseline RiskEngine contract tests (pure logic, pre-existing behavior locked in).
- `tests/ui-render.test.js` — BUG-01 builders + escaping.
- Baseline: all green before Phase 2 fixes begin.

---

## PHASE 2 — Fix log (one-by-one, verified)

### BUG-01 — Dead hourly/weekly pages ✅ FIXED (attempt 1)
- **Change:** `js/ui.js` += `escapeHtml`, `buildHourlyListHTML`, `buildWeeklyListHTML`, `renderHourlyList`, `renderWeeklyList`; `js/app.js` += `initHourlyPage`/`initWeeklyPage` routing + subtitle update; `pages/index.html` hourly card header += "View 24h →" link, hero date row += "7-Day Forecast →" link.
- **Verify:** `npm test` 15/15 pass (`tests/risk-engine` 8 + `tests/ui-render` 7); `npm run lint` clean; grep confirms inbound links to `hourly.html`/`weekly.html`.
- **Files:** `js/ui.js`, `js/app.js`, `pages/index.html`, `tests/ui-render.test.js`

### BUG-02 — Real weekly forecast aggregation ✅ FIXED (attempt 2; attempt 1 = test-fixture date spill)
- **Change:** `js/api.js`: `getWeeklyForecast(lat, lon)` now fetches `/forecast?cnt=40`, groups into UTC-day summaries via `aggregateDaily()` (high/low, dominant condition, max precip, avg humidity, `uvIndex: null` = unknown); per-coords cache + mock fallback; `validCoords()` guard added to both forecast fns (no more `lat=undefined` URLs).
- **Verify:** `npm test` 20/20 (5 new `api-forecast` tests); `npm run lint` clean.
- **Files:** `js/api.js`, `tests/api-forecast.test.js`

### BUG-03 — Working UV source (Open-Meteo) ✅ FIXED (attempt 1)
- **Change:** `js/api.js` `getCurrentWeather()`: UV now fetched from Open-Meteo `current=uv_index` (keyless); retired `/data/2.5/uvi` call removed. On failure `uvIndex` is `null` (UI renders `—`) instead of fabricated `6`. Downstream safe: `UI.getUVLevel(null)` → `—`, `RiskEngine` keeps its documented `|| 6` modeling default.
- **Verify:** `npm test` 22/22 (2 new `api-current` tests: rounding/URL assertions, null-on-failure); `npm run lint` clean.
- **Files:** `js/api.js`, `tests/api-current.test.js`

### BUG-04 — XSS remediation ✅ FIXED (attempt 1)
- **Change:** all user/API-controlled strings escaped via `UI.escapeHtml` at `innerHTML` sinks: `app.js` trip countdowns, recent + search results; `compare.html` city cells; `emergency.html` contact fields; `trip-planner.html` summary + verdict. Inline `onclick="…${id}…"` handlers replaced with `data-*-id` + delegated listeners (escaping alone is unsafe in handler attributes). Phone numbers whitelisted (`sanitizePhone`) before `tel:`/`sms:` hrefs. `App` now exposes the three render fns for testability. Static-DB sinks (popular cities, map markers) audited — not user-controlled, left as-is.
- **Verify:** `npm test` 28/28 (6 new `xss` tests incl. inline page-script loading); `npm run lint` clean; grep confirms zero interpolated inline handlers / raw phone hrefs.
- **Files:** `js/app.js`, `pages/compare.html`, `pages/emergency.html`, `pages/trip-planner.html`, `tests/helpers.js`, `tests/xss.test.js`

### BUG-05 — Committed API secret removed ✅ FIXED (attempt 2; attempt 1 = fixtures relied on embedded key)
- **Change:** `js/config.js` `API_KEY` default is now `''` with runtime-override docs; `getApiKey()` resolves `localStorage 'climateguard_api_key'` → `window.CLIMATEGUARD_API_KEY` → config default. Added `.gitignore` for `js/config.local.js`. Older fixtures updated to seed the override seam. NOTE: keyless installs run on mock data + (after BUG-08) local search DB; Phase 3 should add a settings UI field for the key.
- **Verify:** `npm test` 32/32 (4 new `api-key` tests incl. secret-scan regression); `npm run lint` clean.
- **Files:** `js/config.js`, `js/api.js`, `.gitignore`, `tests/api-key.test.js`, `tests/api-current.test.js`, `tests/api-forecast.test.js`

### BUG-06 — Single trip-page owner ✅ FIXED (attempt 1)
- **Change:** removed `<script src="../js/trip-planner.js">` from `trip-planner.html` (inline script is the single owner of `#analyzeBtn`/`#downloadTripBtn`/`.quick-dest`); ported default-date prefill (today → +7d) into the inline script; deleted now-dead `js/trip-planner.js` (symbols self-contained — verified by grep). Test helpers gained listener recording, `loadPageScripts`, `fireDOMContentLoaded`, `countListeners`.
- **Verify:** `npm test` 36/36 (4 new `trip-bindings` tests: no module include, exactly-1 listener ×2, date defaults); `npm run lint` clean.
- **Files:** `pages/trip-planner.html`, `js/trip-planner.js` (deleted), `tests/helpers.js`, `tests/trip-bindings.test.js`

### BUG-07 — Honest geolocation errors ✅ FIXED (attempt 1)
- **Change:** `getCurrentLocation()` now rejects with a `Location unavailable…` error (code preserved) instead of resolving SF coords. `loadWeather()` catches GPS failure explicitly → default location + warning notification; the search-page "Use Current Location" button already had try/catch → now correctly shows its error toast.
- **Verify:** `npm test` 40/40 (4 new `geolocation` tests: success, denial rejection, unsupported, `loadWeather` fallback); `npm run lint` clean.
- **Files:** `js/api.js`, `js/app.js`, `tests/geolocation.test.js`

### BUG-08 — Keyless search via bundled DB ✅ FIXED (attempt 1)
- **Change:** `searchLocations()` returns `searchLocalDB(q)` when no API key is configured (previously `[]`). `api-key.test.js` "no fetch" case updated to an unknown place (Paris now correctly resolves locally).
- **Verify:** `npm test` 44/44 (4 new `search-fallback` tests: local match, region/country match, unknown → `[]`, short query); `npm run lint` clean.
- **Files:** `js/api.js`, `tests/search-fallback.test.js`, `tests/api-key.test.js`

### BUG-09 — Self-sufficient risk report ✅ FIXED (attempt 1)
- **Change:** `risk-report.html` init is now async and fetches fresh data for `CURRENT_LOCATION` directly (800 ms race removed; API session cache dedups with `App.loadWeather`). Results accepted only when returned coords match the request (rejects SF-mock substitution); otherwise labelled `LAST_WEATHER` cache, otherwise "Demo data". Subtitle shows provenance (`Updated…` / `Cached data from…` / `Demo data`).
- **Verify:** `npm test` 47/47 (3 new `risk-report` tests: fresh-beats-stale, labelled cache fallback, demo label); `npm run lint` clean.
- **Files:** `pages/risk-report.html`, `tests/risk-report.test.js`

### BUG-10 — Live map layers + markers ✅ FIXED (attempt 1)
- **Change:** `map.html` now loads `storage`/`api`/`risk-engine`; layer buttons swap real OWM tile overlays (`temp/wind/precipitation/clouds_new`); `CITIES` slimmed to name+coords with live `getCurrentWeather` per city (pool of 6, cached) and `RiskEngine` risk; keyless installs fetch nothing, show `—` markers + demo badge, and disable layer buttons. Risk zones use live data. (Closes Phase 3 roadmap item 2.)
- **Verify:** `npm test` 51/51 (4 new `map-layers` tests with Leaflet stub: overlay URL, live temps, layer swap + legend, keyless honesty); `npm run lint` clean.
- **Files:** `pages/map.html`, `tests/map-layers.test.js`

*(next: BUG-11)*

---

## PHASE 3 — UI/UX & feature roadmap (not started)

1. Badge mock/demo data wherever fallback data is shown (honest UI).
2. Real OWM tile layers on map + live marker data.
3. Units toggle (°C/°F) wiring (resolves dead `units` setting).
4. PWA manifest + service worker (offline-first for static shell).
5. Root landing (`index.html` redirect or move).
6. i18n attribute pass over all pages (needs BUG-13 first).
7. Design polish: skeleton loaders, empty states, focus styles.

---

## Verification protocol (per RULES)

1. `npm test` must pass; `npm run lint` must pass.
2. Each fix: implement → test → record above. On failure: read log, self-correct, re-test (≤5 attempts).
3. One bug per change-set; never multi-file speculative edits (coupled files for a single bug are one change-set).
