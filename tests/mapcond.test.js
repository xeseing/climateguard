'use strict';
/**
 * BUG-20: OWM "Clouds" must split by cloud cover — scattered → clear,
 * broken → partly_cloudy, overcast → cloudy (day/night aware).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadModule, getGlobal } = require('./helpers');

function loadAPI(fetchImpl) {
  const sandbox = createSandbox({ fetch: fetchImpl });
  loadModule(sandbox, 'js/config.js');
  loadModule(sandbox, 'js/api.js');
  sandbox.WeatherAPI = getGlobal(sandbox, 'WeatherAPI');
  sandbox.localStorage.setItem('climateguard_api_key', 'TEST_KEY');
  return sandbox;
}

const weatherJson = (cloudsAll, icon) => ({
  id: 1, name: 'Cloud City', coord: { lat: 0, lon: 0 }, sys: { country: 'XX' },
  weather: [{ main: 'Clouds', description: 'clouds', icon }],
  main: { temp: 20, feels_like: 20, temp_min: 18, temp_max: 22, humidity: 60, pressure: 1010 },
  visibility: 10000, wind: { speed: 3, deg: 0 }, clouds: { all: cloudsAll },
});
const stdRouter = (weather) => async (url) => {
  if (url.includes('/weather?')) return { ok: true, json: async () => weather };
  if (url.includes('air_pollution')) return { ok: true, json: async () => ({ list: [{ main: { aqi: 1 } }] }) };
  if (url.includes('open-meteo')) return { ok: true, json: async () => ({ current: { uv_index: 4 } }) };
  throw new Error('unexpected ' + url);
};

test('daytime cover splits clear / partly_cloudy / cloudy', async () => {
  for (const [cover, expected] of [[10, 'clear_day'], [45, 'partly_cloudy'], [90, 'cloudy']]) {
    const sandbox = loadAPI(stdRouter(weatherJson(cover, '02d')));
    const data = await sandbox.WeatherAPI.getCurrentWeather(0, 0);
    assert.equal(data.weather.condition, expected, `cover=${cover}`);
  }
});

test('nighttime scattered clouds map to clear_night', async () => {
  const sandbox = loadAPI(stdRouter(weatherJson(5, '02n')));
  const data = await sandbox.WeatherAPI.getCurrentWeather(0, 0);
  assert.equal(data.weather.condition, 'clear_night');
});

test('hourly items use cloud cover', async () => {
  const sandbox = loadAPI(async (url) => {
    if (url.includes('/forecast?')) {
      return {
        ok: true,
        json: async () => ({
          list: [{
            dt: Date.UTC(2026, 8, 7, 12) / 1000,
            main: { temp: 20, humidity: 60 }, weather: [{ main: 'Clouds', description: 'x' }],
            clouds: { all: 50 }, pop: 0, sys: { pod: 'd' },
          }],
        }),
      };
    }
    throw new Error('unexpected ' + url);
  });
  const hours = await sandbox.WeatherAPI.getHourlyForecast(0, 0);
  assert.equal(hours[0].condition, 'partly_cloudy');
});

test('weekly aggregation votes with cloud cover', async () => {
  const base = Date.UTC(2026, 8, 7, 6) / 1000;
  const list = [0, 1, 2, 3, 4, 5].map((i) => ({
    dt: base + i * 3 * 3600,
    main: { temp: 20 + i, humidity: 60 }, weather: [{ main: 'Clouds', description: 'x' }],
    clouds: { all: 40 }, pop: 0,
  }));
  const sandbox = loadAPI(async (url) => {
    if (url.includes('/forecast?')) return { ok: true, json: async () => ({ list }) };
    throw new Error('unexpected ' + url);
  });
  const days = await sandbox.WeatherAPI.getWeeklyForecast(0, 0);
  assert.equal(days.length, 1);
  assert.equal(days[0].condition, 'partly_cloudy');
});
