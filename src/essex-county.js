const { chromium } = require('playwright');
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

module.exports = async function scrape () {
  console.error('Checking Essex County (https://essexcovid.org)...');
  const browser = await chromium.launch();
  let result = {};
  try {
    page = await browser.newPage()
    await page.goto('https://essexcovid.org/vaccine/vaccine_availability')
    const sites = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#datatable-grouping > tbody > tr'))
          .filter(row => !row.classList.contains('group'))
          .map(row => Array.from(row.querySelectorAll('td')))
          .map(cells => cells.map(cell => cell.textContent.trim()))
          .map(values => [values[0], parseInt(values[1], 10)])
          .reduce((data, [name, count]) => {
            data[name] = data[name] || (count > 0);
            return data;
          }, {});

      return rows;
    });

    const scrapeTime = new Date();
    result = Object.getOwnPropertyNames(sites).map(site => ({
      'name': site,
      'operated_by': 'Essex County',
      'available': sites[site] ? availability.yes : availability.no,
      'checked_at': scrapeTime.toISOString(),
      'official': officialName[simplifyName(site)] || null
    }));
  }
  finally {
    await browser.close();
  }

  return result;
};
