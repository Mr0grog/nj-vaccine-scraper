const essex = require('./essex-county');

allScrapers = {
  essex,
  shoprite: async function () { console.error('ShopRite Not implemented'); return []; },
  hackensackMeridian: async function () { console.error('Hackensack-Meridian Not implemented'); return []; },
  vaccinatenj: async function () { console.error('VaccinateNJ Not implemented'); return []; },
};

// TODO: this should move to somewhere we list all the scrapers, maybe index.js
function runScrapers (scrapers) {
  // TODO: may want to consider limits to concurrency here.
  scrapers = scrapers.length
    ? scrapers
    : Object.getOwnPropertyNames(allScrapers);

  const scraperRuns = scrapers.map(name => {
    const scraper = allScrapers[name];
    if (scraper) {
      return scraper();
    }
    else {
      console.error(`Unknown scraper: "${name}"`);
      return null;
    }
  }).filter(x => !!x);

  return Promise.all(scraperRuns)
    .then(results => results.flat());
}

module.exports = function cli (scrapers, options) {
  // TODO: handle `options.input` by reading a file and matching up scraper
  // results to items in it.
  // TODO: write output to `options.output` instead of stdout if present
  runScrapers(scrapers)
    .then(results => console.log(JSON.stringify(results)))
    .then(() => console.error('\nDone!'))
    .catch(error => console.error(`Uhoh: ${error}`));
}
