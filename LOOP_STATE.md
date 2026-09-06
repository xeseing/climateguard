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
| HTML pages (9 in `pages/`) | ⚠️ 2 dead/orphan (hourly, weekly — fixed BUG-01); no root `index.html` |
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
| BUG-11 | 🟡 | `particles.js` snow color hack produces invalid 5-component `rgba()` → `fillStyle` assignment ignored (snow renders wrong/invisible) | ✅ FIXED | `npm test` (particles) + lint |
| BUG-12 | 🟡 | `index.html` precipitation card hardcoded `0 mm` + `initCharts` hardcoded fake `[5,8,12,…]` data; compass needle + humidity gauge never update | ✅ FIXED | `npm test` (ui-weather-display) + lint |
| BUG-13 | 🟡 | i18n largely non-functional: only ~1 `data-i18n` attribute in the whole app; language switcher translates almost nothing | ✅ FIXED | `npm test` (i18n-coverage) + lint |
| BUG-14 | 🟡 | PDF downloads (`risk-report`, `compare`, `trip`) assume `window.jspdf` exists → TypeError crash if CDN blocked | ✅ FIXED | `npm test` (pdf-guards) + lint |
| BUG-15 | 🟡 | `renderPopularDestinations` fires 6 **sequential** API calls on every home load (slow, no error state) | ✅ FIXED | `npm test` (popular-dest) + lint |
| BUG-16 | 🔵 | No root `index.html` / redirect — static hosts serving repo root show nothing | ✅ FIXED | `npm test` (root-index) + lint |
| BUG-17 | 🔵 | Theme applied twice (`Theme.init` + `settings-handler` direct DOM manipulation, bypassing `Theme.applyTheme`) | ✅ FIXED | `npm test` (theme-single-source) + lint |
| BUG-18 | 🔵 | `Storage.getSettings()` returns live `DEFAULT_SETTINGS` reference when empty (mutation risk); `units` setting dead (no UI/conversion → Phase 3 item 3) | ✅ FIXED | `npm test` (storage-settings) + lint |
| BUG-19 | 🔵 | Missing CSS: `.offline-banner`, `.api-error-card` (JS injects them unstyled); `Notification.icon: '🌤️'` invalid | ✅ FIXED | `npm test` (offline-ui) + lint |
| BUG-20 | 🔵 | ~~`lat=undefined` URL guard~~ (done in BUG-02); `mapCond('Clouds')` never yields `partly_cloudy` | ✅ FIXED | `npm test` (mapcond) + lint |

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

### BUG-01 — Dead hourly/weekly pages ✅ FIXED (attempt 1 · commit `07dc695`)
- **Change:** `js/ui.js` += `escapeHtml`, `buildHourlyListHTML`, `buildWeeklyListHTML`, `renderHourlyList`, `renderWeeklyList`; `js/app.js` += `initHourlyPage`/`initWeeklyPage` routing + subtitle update; `pages/index.html` hourly card header += "View 24h →" link, hero date row += "7-Day Forecast →" link.
- **Verify:** `npm test` 15/15 pass (`tests/risk-engine` 8 + `tests/ui-render` 7); `npm run lint` clean; grep confirms inbound links to `hourly.html`/`weekly.html`.
- **Files:** `js/ui.js`, `js/app.js`, `pages/index.html`, `tests/ui-render.test.js`

### BUG-02 — Real weekly forecast aggregation ✅ FIXED (attempt 2 · commit `e9f7c74`; attempt 1 = test-fixture date spill)
- **Change:** `js/api.js`: `getWeeklyForecast(lat, lon)` now fetches `/forecast?cnt=40`, groups into UTC-day summaries via `aggregateDaily()` (high/low, dominant condition, max precip, avg humidity, `uvIndex: null` = unknown); per-coords cache + mock fallback; `validCoords()` guard added to both forecast fns (no more `lat=undefined` URLs).
- **Verify:** `npm test` 20/20 (5 new `api-forecast` tests); `npm run lint` clean.
- **Files:** `js/api.js`, `tests/api-forecast.test.js`

### BUG-03 — Working UV source (Open-Meteo) ✅ FIXED (attempt 1 · commit `365dcd8`)
- **Change:** `js/api.js` `getCurrentWeather()`: UV now fetched from Open-Meteo `current=uv_index` (keyless); retired `/data/2.5/uvi` call removed. On failure `uvIndex` is `null` (UI renders `—`) instead of fabricated `6`. Downstream safe: `UI.getUVLevel(null)` → `—`, `RiskEngine` keeps its documented `|| 6` modeling default.
- **Verify:** `npm test` 22/22 (2 new `api-current` tests: rounding/URL assertions, null-on-failure); `npm run lint` clean.
- **Files:** `js/api.js`, `tests/api-current.test.js`

### BUG-04 — XSS remediation ✅ FIXED (attempt 1 · commit `8a5f322`)
- **Change:** all user/API-controlled strings escaped via `UI.escapeHtml` at `innerHTML` sinks: `app.js` trip countdowns, recent + search results; `compare.html` city cells; `emergency.html` contact fields; `trip-planner.html` summary + verdict. Inline `onclick="…${id}…"` handlers replaced with `data-*-id` + delegated listeners (escaping alone is unsafe in handler attributes). Phone numbers whitelisted (`sanitizePhone`) before `tel:`/`sms:` hrefs. `App` now exposes the three render fns for testability. Static-DB sinks (popular cities, map markers) audited — not user-controlled, left as-is.
- **Verify:** `npm test` 28/28 (6 new `xss` tests incl. inline page-script loading); `npm run lint` clean; grep confirms zero interpolated inline handlers / raw phone hrefs.
- **Files:** `js/app.js`, `pages/compare.html`, `pages/emergency.html`, `pages/trip-planner.html`, `tests/helpers.js`, `tests/xss.test.js`

### BUG-05 — Committed API secret removed ✅ FIXED (attempt 2 · commit `d5caf7b`; attempt 1 = fixtures relied on embedded key)
- **Change:** `js/config.js` `API_KEY` default is now `''` with runtime-override docs; `getApiKey()` resolves `localStorage 'climateguard_api_key'` → `window.CLIMATEGUARD_API_KEY` → config default. Added `.gitignore` for `js/config.local.js`. Older fixtures updated to seed the override seam. NOTE: keyless installs run on mock data + (after BUG-08) local search DB; Phase 3 should add a settings UI field for the key.
- **Verify:** `npm test` 32/32 (4 new `api-key` tests incl. secret-scan regression); `npm run lint` clean.
- **Files:** `js/config.js`, `js/api.js`, `.gitignore`, `tests/api-key.test.js`, `tests/api-current.test.js`, `tests/api-forecast.test.js`

### BUG-06 — Single trip-page owner ✅ FIXED (attempt 1 · commit `bd723e9`)
- **Change:** removed `<script src="../js/trip-planner.js">` from `trip-planner.html` (inline script is the single owner of `#analyzeBtn`/`#downloadTripBtn`/`.quick-dest`); ported default-date prefill (today → +7d) into the inline script; deleted now-dead `js/trip-planner.js` (symbols self-contained — verified by grep). Test helpers gained listener recording, `loadPageScripts`, `fireDOMContentLoaded`, `countListeners`.
- **Verify:** `npm test` 36/36 (4 new `trip-bindings` tests: no module include, exactly-1 listener ×2, date defaults); `npm run lint` clean.
- **Files:** `pages/trip-planner.html`, `js/trip-planner.js` (deleted), `tests/helpers.js`, `tests/trip-bindings.test.js`

### BUG-07 — Honest geolocation errors ✅ FIXED (attempt 1 · commit `fbade42`)
- **Change:** `getCurrentLocation()` now rejects with a `Location unavailable…` error (code preserved) instead of resolving SF coords. `loadWeather()` catches GPS failure explicitly → default location + warning notification; the search-page "Use Current Location" button already had try/catch → now correctly shows its error toast.
- **Verify:** `npm test` 40/40 (4 new `geolocation` tests: success, denial rejection, unsupported, `loadWeather` fallback); `npm run lint` clean.
- **Files:** `js/api.js`, `js/app.js`, `tests/geolocation.test.js`

### BUG-08 — Keyless search via bundled DB ✅ FIXED (attempt 1 · commit `b75c024`)
- **Change:** `searchLocations()` returns `searchLocalDB(q)` when no API key is configured (previously `[]`). `api-key.test.js` "no fetch" case updated to an unknown place (Paris now correctly resolves locally).
- **Verify:** `npm test` 44/44 (4 new `search-fallback` tests: local match, region/country match, unknown → `[]`, short query); `npm run lint` clean.
- **Files:** `js/api.js`, `tests/search-fallback.test.js`, `tests/api-key.test.js`

### BUG-09 — Self-sufficient risk report ✅ FIXED (attempt 1 · commit `c5b38b7`)
- **Change:** `risk-report.html` init is now async and fetches fresh data for `CURRENT_LOCATION` directly (800 ms race removed; API session cache dedups with `App.loadWeather`). Results accepted only when returned coords match the request (rejects SF-mock substitution); otherwise labelled `LAST_WEATHER` cache, otherwise "Demo data". Subtitle shows provenance (`Updated…` / `Cached data from…` / `Demo data`).
- **Verify:** `npm test` 47/47 (3 new `risk-report` tests: fresh-beats-stale, labelled cache fallback, demo label); `npm run lint` clean.
- **Files:** `pages/risk-report.html`, `tests/risk-report.test.js`

### BUG-10 — Live map layers + markers ✅ FIXED (attempt 1 · commit `4f3d47c`)
- **Change:** `map.html` now loads `storage`/`api`/`risk-engine`; layer buttons swap real OWM tile overlays (`temp/wind/precipitation/clouds_new`); `CITIES` slimmed to name+coords with live `getCurrentWeather` per city (pool of 6, cached) and `RiskEngine` risk; keyless installs fetch nothing, show `—` markers + demo badge, and disable layer buttons. Risk zones use live data. (Closes Phase 3 roadmap item 2.)
- **Verify:** `npm test` 51/51 (4 new `map-layers` tests with Leaflet stub: overlay URL, live temps, layer swap + legend, keyless honesty); `npm run lint` clean.
- **Files:** `pages/map.html`, `tests/map-layers.test.js`

### BUG-11 — Valid snow fill styles ✅ FIXED (attempt 2 · commit `bb6ccf4`; attempt 1 = test also captured legit CanvasGradient objects)
- **Change:** `particles.js` gains `withAlpha()` (rebuilds `rgb()/rgba()` with clamped alpha) used by `drawSnowParticle`; string-append hack removed.
- **Verify:** `npm test` 53/53 (2 new `particles` tests: single-frame render asserts every string fill matches valid `rgba()`, alpha varies); `npm run lint` clean.
- **Files:** `js/particles.js`, `tests/particles.test.js`

### BUG-12 — Live home-card values ✅ FIXED (attempt 1 · commit `709b300`)
- **Change:** `UI.updateWeatherDisplay` now drives precip value, compass-needle rotation, humidity-gauge arc, pressure-gauge arc (same staleness pattern, included), and Magnus dew point; `initCharts(hourly)` renders real hourly labels/precip (no data → no chart, never fake). New element IDs in `index.html`; `initCharts` exposed for testability.
- **Verify:** `npm test` 59/59 (6 new `ui-weather-display` tests); `npm run lint` clean.
- **Files:** `js/ui.js`, `js/app.js`, `pages/index.html`, `tests/ui-weather-display.test.js`

### BUG-13 — i18n coverage ✅ FIXED (attempt 1 · commit `a295892`)
- **Change:** tagged ~90 strings across all 9 pages (`data-i18n`/`-placeholder`/`-aria`): every tab bar, page headers, section titles, form labels/options, buttons, contact placeholders; added 14 new keys × 5 languages (en/hi/es/fr/ar). Applied via assertion-checked all-or-nothing script (exact-match counts verified pre-write). Corrected audit nit: repo has 9 pages, not 8.
- **Verify:** `npm test` 63/63 (4 new `i18n-coverage` tests: ≥70 tags, per-page tab keys, 5-language key parity, switch behavior incl. RTL); `npm run lint` clean.
- **Files:** `js/i18n.js`, all `pages/*.html`, `tests/i18n-coverage.test.js`

### BUG-14 — jsPDF failure guards ✅ FIXED (attempt 1 · commit `5e1c342`)
- **Change:** all three PDF entry points (`risk-report` download, `compare` export, `trip` download) now check `window.jspdf?.jsPDF` and show an error toast instead of throwing when the CDN is blocked.
- **Verify:** `npm test` 67/67 (4 new `pdf-guards` tests: 3 graceful-degradation + 1 positive save-path); `npm run lint` clean.
- **Files:** `pages/risk-report.html`, `pages/compare.html`, `pages/trip-planner.html`, `tests/pdf-guards.test.js`

### BUG-15 — Parallel destination loading ✅ FIXED (attempt 1 · commit `bc4260b`)
- **Change:** `renderPopularDestinations` now fetches all 6 cities via one `Promise.all` (order-preserving, per-card error tolerance kept); exposed on `App` for testability.
- **Verify:** `npm test` 69/69 (2 new `popular-dest` tests: 6-in-flight concurrency probe, 6 cards render); `npm run lint` clean.
- **Files:** `js/app.js`, `tests/popular-dest.test.js`

### BUG-16 — Root landing redirect ✅ FIXED (attempt 1 · commit `2a780d2`)
- **Change:** new root `index.html` — instant meta-refresh + `location.replace` to `pages/index.html`, canonical link, fallback anchor, themed stub body.
- **Verify:** `npm test` 71/71 (2 new `root-index` tests); `npm run lint` clean.
- **Files:** `index.html`, `tests/root-index.test.js`

### BUG-17 — Single-source theme ✅ FIXED (attempt 1 · commit `8a43f47`)
- **Change:** settings toggle now persists + delegates to `Theme.applyTheme()`; removed the duplicated load-time DOM application (`Theme.init` already handles it, incl. meta theme-color + transitions).
- **Verify:** `npm test` 73/73 (2 new `theme-single-source` tests: toggle round-trips `Theme.getTheme()` + storage); `npm run lint` clean.
- **Files:** `js/settings-handler.js`, `tests/theme-single-source.test.js`

### BUG-18 — Settings object integrity ✅ FIXED (attempt 1 · commit `9cf4ca7`)
- **Change:** `getSettings()` returns a fresh `{...DEFAULTS, ...stored}` merge (corrupt/non-object store heals to defaults); the live-`DEFAULT_SETTINGS` mutation vector is gone. The dead `units` toggle is explicitly deferred to Phase 3 roadmap item 3 (°C/°F wiring).
- **Verify:** `npm test` 76/76 (3 new `storage-settings` tests: mutation isolation, partial merge, update round-trip); `npm run lint` clean.
- **Files:** `js/storage.js`, `tests/storage-settings.test.js`

### BUG-19 — Offline/error styling + valid Notifications ✅ FIXED (attempt 3 · commit `ed51e25`; attempts 1–2 = test sandbox stubs for canvas/CustomEvent)
- **Change:** added `.offline-banner` / `.api-error-card` styles to `components.css`; `fireNotification` no longer passes the invalid emoji `icon`.
- **Verify:** `npm test` 79/79 (3 new `offline-ui` tests: 2 CSS-rule assertions + full index boot asserting the fired Notification has no `icon` key); `npm run lint` clean.
- **Files:** `css/components.css`, `js/app.js`, `tests/offline-ui.test.js`

### BUG-20 — Cloud-cover-aware conditions ✅ FIXED (attempt 1 · commit `20e4e7c`)
- **Change:** `mapCond(main, isDay, cloudCover)` splits `Clouds` by cover (≤20% → clear day/night, ≤60% → partly_cloudy, else cloudy; unknown cover keeps prior `cloudy`); all three call sites (current, hourly, weekly aggregation) pass `clouds.all`.
- **Verify:** `npm test` 83/83 (4 new `mapcond` tests: day split, night, hourly, weekly votes); `npm run lint` clean.
- **Files:** `js/api.js`, `tests/mapcond.test.js`

## PHASE 2 — COMPLETE (20/20, 83 tests green, lint clean)

**Final tally (2026-09-07):** 20/20 bugs fixed, each red→green with regression tests.
- Suite: **83/83 pass** across 17 test files (`npm test`); **lint clean** (`npm run lint`).
- Commits: `07dc695` (01) · `e9f7c74` (02) · `365dcd8` (03) · `8a5f322` (04) · `d5caf7b` (05) · `bd723e9` (06) · `fbade42` (07) · `b75c024` (08) · `c5b38b7` (09) · `4f3d47c` (10) · `bb6ccf4` (11) · `709b300` (12) · `a295892` (13) · `5e1c342` (14) · `bc4260b` (15) · `2a780d2` (16) · `8a43f47` (17) · `9cf4ca7` (18) · `ed51e25` (19) · `20e4e7c` (20).
- Deferred to Phase 3 by design: `units` °C/°F wiring (roadmap item 3), mock-data badging (item 1), PWA/offline shell (item 4), root landing already done (item 5 ✔ via BUG-16), map live layers already done (item 2 ✔ via BUG-10).
- Known remaining nits (not in register): pressure-gauge static text companions, gust value static, dynamic JS-rendered strings untranslated, SF-edge mock acceptance in risk-report coords check (proper fix = mock flag from item 1).

---

## PHASE 3 — UI/UX & feature roadmap (IN PROGRESS — Steps 1–2 ordered first)

1. Badge mock/demo data wherever fallback data is shown (honest UI). [QUEUED — Step 3, after report-back]
2. ~~Real OWM tile layers on map + live marker data.~~ ✅ DONE in Phase 2 (BUG-10).
3. Units toggle (°C/°F) wiring (resolves dead `units` setting). [✅ STEP 1 DONE — see below]
4. PWA manifest + service worker (offline-first for static shell). [QUEUED — Step 4, after report-back]
5. ~~Root landing (`index.html` redirect or move).~~ ✅ DONE in Phase 2 (BUG-16).
6. i18n attribute pass over all pages (needs BUG-13 first). [open]
7. Design polish: skeleton loaders, empty states, focus styles. [✅ STEP 2 DONE — see below]

### Step 1 — Unit Toggling & State Sync ✅ DONE (commits `d0d2c57`, `e2bf800`)
- **Change:** new `js/units.js` (`Units.get/set/display/symbol/format`, `cg_units_v1`, `unitschange` event; display-only, internals stay °C); loaded on all 9 pages. Wired: hero/high-low/feels/dew (`ui.js`), hourly strip+lists, weekly lists, popular cards (`app.js`), compare table+radar, trip summary+day-cards+PDF, map markers+info, risk heat-value+PDF, settings Temperature toggles on index/risk-report/trip-planner via `settings-handler.js` (checked=Celsius, reload to re-render).
- **Verify:** `npm test` **99/99** (16 new `units` tests: 6 core + 4 dash wiring + 6 inline/panels); `npm run lint` clean. Fixture notes: heat fixture = feels-like 37°C→99°F; old fixtures touching Units paths needed `units.js` loads (risk-report, xss, pdf-guards).

### Step 2 — Skeletons, Micro-interactions, Responsive Polish ✅ DONE (commits `69a1efb`, `d5d1463`)
- **Change:** new `UI.showSkeleton(id|el, rows=3, variant)` + `UI.emptyHTML`/`UI.renderEmpty` (XSS-escaped); renderers clear `aria-busy` on paint; wired into hourly/weekly/search/popular async paths (replaces blocking spinner line in search). CSS: `.skeleton--row`, `prefers-reduced-motion` guard, `.hero-temp` fluid `clamp(4.5rem,22vw,8rem)` (replaces fixed 8rem inline style), `.tab-item:active` press states, 360px breakpoint, `.empty-state` icon/hint styles. Test-helper `makeEl` now stores attributes (`set/get/removeAttribute`).
- **Verify:** `npm test` **111/111** (7 new `skeletons` + 5 new `polish` tests); `npm run lint` clean.

---

## Verification protocol (per RULES)

1. `npm test` must pass; `npm run lint` must pass.
2. Each fix: implement → test → record above. On failure: read log, self-correct, re-test (≤5 attempts).
3. One bug per change-set; never multi-file speculative edits (coupled files for a single bug are one change-set).
