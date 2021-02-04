const { chromium } = require('playwright');
const { availability } = require('./model');

function wait (milliseconds) {
  return new Promise((resolve, _) => setTimeout(
    () => resolve(milliseconds),
    milliseconds
  ));
}

// For now, this scraper never outputs any data. If the scheduling system
// returns available appointments, we print them to stderr so we can see what
// the data looks like in a successful situation. In this case, it also throws
// an error so the scraper run gets flagged in CI for inspection.
//
// FIXME: this needs clearer documentation of what's going on.
module.exports = async function scrape () {
  console.error('Checking Hackensack-Meridian Health (https://hmhn.org)...');
  let result = [];

  const browser = await chromium.launch();
  try {
    page = await browser.newPage()

    // https://mychart.hmhn.org/Mychart/OpenScheduling/OpenScheduling/GetSpecialties?noCache=0.45289891322258435
    // https://mychart.hmhn.org/mychart/OpenScheduling/OpenScheduling/GetScheduleDays?noCache=abcxyz
    let hasAppointments = false;
    page.on('requestfinished', async (request) => {
      const url = request.url();
      if (url.includes('/OpenScheduling/GetScheduleDays')) {
        try {
          const response = await request.response();
          const data = await response.json();
          const rollup = data.ByDateThenProviderCollated;
          if (rollup && Object.getOwnPropertyNames(rollup).length) {
            hasAppointments = true;
            console.error('Got actual Hackensack schedule data!', data);
          }
        }
        catch (error) {
          console.error('Error capturing schedule XHR at Hackensack Meridian Health');
        }
      }
      else if (url.includes('/OpenScheduling/GetSpecialties')) {
        try {
          const response = await request.response();
          const data = await response.json();
          if (!Object.getOwnPropertyNames(data).length) {
            console.error('WARNING: Hackensack-Meridian online scheduling is disabled.');
          }
        }
        catch (error) {
          console.error('Error capturing schedule XHR at Hackensack Meridian Health');
        }
      }
    });

    await page.goto(
      'https://mychart.hmhn.org/MyChart/openscheduling?specialty=235&hidespecialtysection=1',
      {waitUntil: 'networkidle'}
    );
    await wait(1000);

    if (hasAppointments) {
      // FIXME: once we know what the data looks like, return parsed results
      // instead of throwing here.
      throw new Error('Alert! Hackensack Meridian has data.');
    }
  }
  finally {
    await browser.close();
  }

  return result;
};
