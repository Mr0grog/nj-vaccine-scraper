const { withBrowser } = require('./browser');
const { availability } = require('./model');
const officialLocations = require('./official-locations');
const njUtils = require('./utils');

// Essex County's site is behind a Securi Cloudproxy (https://sucuri.net/), so
// it's easiest to work around it by automating a browser.
module.exports = withBrowser(async function scrape (browser) {
  console.error('Checking Essex County (https://essexcovid.org)...');

  let result = [];
  const page = await browser.newPage();
  await page.goto('https://essexcovid.org/vaccine/vaccine_availability');

  // The main body of the page is a table with location names and number of
  // available appointments, broken up into repeated sections by date. We only
  // care if there are *some* appointments, so if any of the rows for a given
  // name have `> 0` in the second column, they're good.
  const sites = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#datatable-grouping > tbody > tr'))
      .filter(row => !row.classList.contains('group'))
      .map(row => Array.from(row.querySelectorAll('td')))
      .map(cells => cells.map(cell => cell.textContent.trim()))
      .map(values => [values[0], parseInt(values[1], 10)]);

    return rows.reduce((data, [name, count]) => {
      data[name] = data[name] || (count > 0);
      return data;
    }, {});
  });

  let allLocations = await officialLocations.getList();

  // Transform results into a standard format.
  const scrapeTime = new Date();
  result = Object.getOwnPropertyNames(sites).map(site => {
    let matchableName = njUtils.matchable(site);
    // FIXME: special case for this one that doesn't match up well. :(
    if (matchableName === 'livingston mall sears') {
      matchableName = 'livingston mall';
    }

    const official = allLocations
      .find(record => record.simpleName.includes(matchableName));

    if (!official) {
      console.warn(`Essex county location "${site}" not in offical list`);
    }

    return {
      name: official ? official['Facility Name'] : site,
      operated_by: 'Essex County',
      available: sites[site] ? availability.yes : availability.no,
      checked_at: scrapeTime.toISOString(),
      official: official
    };
  });

  return result;
});
