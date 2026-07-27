'use strict';

/* Wetter über Open-Meteo — kein API-Key nötig.
   Stadtname -> Geocoding -> Koordinaten -> aktuelles Wetter (WMO-Code). */

module.exports = {
  id: 'weather',
  label: 'Wetter',
  ttl: 600000, // 10 min — Wetter aendert sich langsam

  secrets: [
    { key: 'WEATHER_CITY', label: 'Stadt' },
    { key: 'WEATHER_UNIT', label: 'Einheit (C/F)' },
  ],

  configured: (get) => !!get('WEATHER_CITY'),
  // Abweichende Form: die Kachel unterscheidet „nicht eingerichtet" (configured:
  // false) von „eingerichtet, aber Abruf fehlgeschlagen".
  notConfigured: { ok: false, configured: false },
  // Bei Abrufproblemen muss `configured` gesetzt bleiben, sonst zeigt die
  // Kachel „Not configured" statt „offline".
  errorFields: { configured: true },

  async fetch(get, ctx) {
    const city = get('WEATHER_CITY');
    const unit = get('WEATHER_UNIT') || 'C';

    const geo = await ctx.httpJson(
      'https://geocoding-api.open-meteo.com/v1/search'
      + `?name=${encodeURIComponent(city)}&count=1&language=de&format=json`,
      { timeoutMs: 5000 });
    if (!geo.results || !geo.results.length) {
      return { ok: false, configured: true, error: 'city_not_found', city };
    }
    const { latitude, longitude, name, country } = geo.results[0];

    const w = await ctx.httpJson(
      'https://api.open-meteo.com/v1/forecast'
      + `?latitude=${latitude}&longitude=${longitude}`
      + '&current=temperature_2m,weather_code,is_day'
      + `&temperature_unit=${unit === 'F' ? 'fahrenheit' : 'celsius'}&forecast_days=1`,
      { timeoutMs: 5000 });

    const cur = w.current;
    return {
      ok: true,
      configured: true,
      temp: Math.round(cur.temperature_2m),
      unit,
      wmoCode: cur.weather_code,
      isDay: cur.is_day === 1,
      city: name,
      country,
    };
  },
};
