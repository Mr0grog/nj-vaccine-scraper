const fs = require('fs/promises');
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

function mergeDatasets (baseData, newData) {
  const makeKey = (item) => `${item.name}:${item.operated_by}`;

  const result = [];
  const newLookup = newData.reduce((lookup, item) => {
    lookup.set(makeKey(item), item);
    return lookup;
  }, new Map());

  for (let item of baseData) {
    const key = makeKey(item);
    const newValue = newLookup.get(key);
    if (newValue) {
      result.push(newValue);
      newLookup.delete(key);
    }
    else {
      result.push(item);
    }
  }

  result.push(...newLookup.values());
  return result;
}

module.exports = async function cli (scrapers, options) {
  const jsonSpacing = options.compact ? 0 : 2;

  let input = [];
  if (options.input) {
    const rawText = await fs.readFile(options.input, {encoding: 'utf-8'})
    input = JSON.parse(rawText);
  }

  const startTime = Date.now();
  try {
    const results = await runScrapers(scrapers);
    const merged = mergeDatasets(input, results);

    // TODO: use `options.output` to write to a file instead of stdout
    console.log(JSON.stringify(merged, null, jsonSpacing));
    console.error(`Completed in ${Date.now() - startTime} seconds.`);
  }
  catch (error) {
    console.error(`Uhoh: ${error}`);
  }
}
