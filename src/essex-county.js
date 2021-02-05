const { withBrowser } = require('./browser');
const { availability } = require('./model');

const officialName = {
  'kmart west orange': {
    name: 'Essex County - Kmart-West Orange',
    address: '235 Prospect Ave, West Orange'
  },
  'essex county college': {
    name: 'Essex County - Essex County College',
    address: '303 University Avenue, Newark'
  },
  'west caldwell tech': {
    name: 'Essex County - West Caldwell Tech',
    address: '620 Passaic Avenue West Caldwell'
  },
  'livingston mall sears': {
    name: 'Essex County - Sears-Livingston Mall',
    address: '112 Eisenhower Parkway Livingston'
  },
  'donald payne school of technology': null
}

function simplifyName (name) {
  return name
    .replace(/\W+/g, ' ')
    .replace(/\s{2,}/, ' ')
    .trim()
    .toLowerCase();
}

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

  // Transform results into a standard format.
  const scrapeTime = new Date();
  result = Object.getOwnPropertyNames(sites).map(site => ({
    name: site,
    operated_by: 'Essex County',
    available: sites[site] ? availability.yes : availability.no,
    checked_at: scrapeTime.toISOString(),
    official: officialName[simplifyName(site)] || null
  }));

  return result;
});
