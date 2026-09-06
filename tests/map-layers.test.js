'use strict';
/**
 * BUG-10: map layer buttons must swap real tile overlays, and markers
 * must show live data — with honest keyless/demo behavior.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadPageScripts } = require('./helpers');

function leafletStub() {
  const layers = [];
  const markers = [];
  const mapObj = {
    setView() { return mapObj; },
    invalidateSize() {},
    locate() {},
    on() {},
    removeLayer(l) { const i = layers.indexOf(l); if (i >= 0) layers.splice(i, 1); },
  };
  const L = {
    map: () => mapObj,
    tileLayer: (url, opts) => {
      const l = { url, opts, addTo() { layers.push(l); return l; }, setUrl(u) { l.url = u; } };
      return l;
    },
    marker: (latlng, opts) => {
      const m = { latlng, opts, addTo() { markers.push(m); return m; }, on() {}, bindPopup() { return m; } };
      return m;
    },
    divIcon: (opts) => opts,
    circle: (latlng, opts) => {
      const c = { latlng, opts, addTo() { layers.push(c); return c; }, bindPopup() { return c; } };
      return c;
    },
  };
  return { L, layers, markers };
}

function liveFetch() {
  let calls = 0;
  const fetchImpl = async (url) => {
    calls++;
    if (url.includes('/weather?')) {
      return {
        ok: true,
        json: async () => ({
          id: 1, name: 'Live City', coord: { lat: 0, lon: 0 }, sys: { country: 'XX' },
          weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
          main: { temp: 22.5, feels_like: 23, temp_min: 20, temp_max: 25, humidity: 55, pressure: 1012 },
          visibility: 10000, wind: { speed: 5, deg: 90 }, clouds: { all: 5 },
        }),
      };
    }
    if (url.includes('air_pollution')) return { ok: true, json: async () => ({ list: [{ main: { aqi: 1 } }] }) };
    if (url.includes('open-meteo')) return { ok: true, json: async () => ({ current: { uv_index: 5 } }) };
    throw new Error('unexpected ' + url);
  };
  return { fetchImpl, calls: () => calls };
}

async function bootMap({ keyed, fetchImpl }) {
  const { L, layers, markers } = leafletStub();
  const sandbox = createSandbox({
    L,
    fetch: fetchImpl,
    setTimeout: (fn) => { fn(); return 0; },
    setInterval: () => 0,
    location: { pathname: '/pages/map.html', href: '' },
  });
  // Layer buttons the inline script queries for
  const btns = ['temp', 'wind', 'precip', 'clouds'].map((layer) => {
    const b = sandbox.document.createElement('button');
    b.dataset.layer = layer;
    return b;
  });
  sandbox.document.querySelectorAll = (sel) => (sel === '.map-btn[data-layer]' ? btns : []);
  if (keyed) sandbox.localStorage.setItem('climateguard_api_key', 'TEST_KEY');
  loadPageScripts(sandbox, 'map.html');
  // Await async marker boot (live fetch per city)
  const deadline = Date.now() + 5000;
  while (markers.length < 30 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 25));
  }
  assert.equal(markers.length, 30);
  return { sandbox, layers, markers, btns };
}

const overlayOf = (layers) => layers.find((l) => l.url && l.url.includes('openweathermap.org/map'));

test('keyed map adds a live temperature tile overlay', async () => {
  const { fetchImpl } = liveFetch();
  const { layers } = await bootMap({ keyed: true, fetchImpl });
  const overlay = overlayOf(layers);
  assert.ok(overlay, 'expected OWM tile overlay');
  assert.match(overlay.url, /temp_new/);
  assert.match(overlay.url, /TEST_KEY/);
});

test('keyed markers show live fetched temps, not hardcoded values', async () => {
  const { fetchImpl } = liveFetch();
  const { markers } = await bootMap({ keyed: true, fetchImpl });
  // Live stub returns 22.5°C → marker shows 23°C via Units.format
  assert.match(markers[0].opts.icon.html, /23°C/);
  assert.ok(markers.every((m) => m.opts.icon.html.includes('23°C')));
});

test('layer buttons swap the tile overlay and legend', async () => {
  const { fetchImpl } = liveFetch();
  const { sandbox, layers, btns } = await bootMap({ keyed: true, fetchImpl });
  const windBtn = btns.find((b) => b.dataset.layer === 'wind');
  const listener = windBtn.__listeners.find((l) => l.type === 'click');
  assert.ok(listener, 'wind button has click listener');
  listener.fn();
  assert.match(overlayOf(layers).url, /wind_new/);
  assert.equal(sandbox.document.getElementById('legendTitle').textContent, 'Wind Speed (km/h)');
});

test('keyless map fetches nothing, badges demo mode, disables layers', async () => {
  let calls = 0;
  const { sandbox, markers, btns } = await bootMap({
    keyed: false,
    fetchImpl: async () => { calls++; throw new Error('must not fetch keyless'); },
  });
  assert.equal(calls, 0);
  assert.ok(markers.every((m) => m.opts.icon.html.includes('—')));
  assert.equal(sandbox.document.getElementById('mapDemoBadge').style.display, 'block');
  assert.ok(btns.every((b) => b.disabled === true));
});
