'use strict';
/**
 * BUG-07: geolocation denial must reject (never silently resolve SF coords);
 * callers fall back explicitly with user feedback.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadModule, getGlobal } = require('./helpers');

function geoSandbox(impl) {
  const sandbox = createSandbox({
    navigator: { onLine: true, geolocation: impl },
  });
  loadModule(sandbox, 'js/config.js');
  loadModule(sandbox, 'js/storage.js');
  loadModule(sandbox, 'js/api.js');
  sandbox.WeatherAPI = getGlobal(sandbox, 'WeatherAPI');
  return sandbox;
}

test('resolves coordinates on success', async () => {
  const s = geoSandbox({ getCurrentPosition: (ok) => ok({ coords: { latitude: 12.34, longitude: 56.78 } }) });
  const coords = await s.WeatherAPI.getCurrentLocation();
  assert.equal(coords.lat, 12.34);
  assert.equal(coords.lon, 56.78);
});

test('rejects on denial instead of resolving a fallback', async () => {
  const s = geoSandbox({ getCurrentPosition: (ok, err) => err({ code: 1, message: 'User denied' }) });
  await assert.rejects(() => s.WeatherAPI.getCurrentLocation(), /location/i);
});

test('rejects when geolocation is unsupported', async () => {
  const s = geoSandbox(undefined);
  await assert.rejects(() => s.WeatherAPI.getCurrentLocation(), /not supported/i);
});

test('App.loadWeather falls back to default location with GPS denied', async () => {
  const s = geoSandbox({ getCurrentPosition: (ok, err) => err({ code: 1, message: 'denied' }) });
  loadModule(s, 'js/ui.js');
  loadModule(s, 'js/app.js');
  s.UI = getGlobal(s, 'UI');
  s.Storage = getGlobal(s, 'Storage');
  s.App = getGlobal(s, 'App');
  s.Storage.updateSettings({ gpsEnabled: true });
  await s.App.loadWeather(); // must not throw
  const state = s.App.getState();
  assert.equal(state.currentLocation.lat, 37.7749);
  assert.equal(state.currentLocation.lon, -122.4194);
  assert.equal(state.weatherData.location.name, 'San Francisco'); // mock data still loads
});
