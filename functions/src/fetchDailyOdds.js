const { onSchedule } = require('firebase-functions/v2/scheduler')

// DESACTIVADO — el sistema ya no usa cuotas externas (puntos fijos)
exports.fetchDailyOdds = onSchedule(
  { schedule: '0 6 * * *', timeZone: 'Europe/Madrid' },
  async () => {
    return
  }
)
