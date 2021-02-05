const fs = require('fs/promises');
const { allScrapers } = require('./index');

// TODO: this should move to somewhere we list all the scrapers, maybe index.js
function runScrapers (scrapers) {
  // TODO: may want to consider limits to concurrency here.
  scrapers = scrapers.length
    ? scrapers
    : Object.getOwnPropertyNames(allScrapers);

  const runs = scrapers.map(name => {
    const scraper = allScrapers[name];
    const run = scraper
      ? scraper()
      : Promise.reject(new Error('Unknown scraper'));
    return run
      .then(results => ({name, results, error: null}))
      .catch(error => ({name, results: [], error}))
  });

  return Promise.all(runs);
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
    const reports = await runScrapers(scrapers);
    const results = reports.map(report => report.results).flat();
    const merged = mergeDatasets(input, results);

    for (let report of reports) {
      if (report.error) {
        console.error(`Error in "${report.name}":`, report.error, '\n');
        process.exitCode = 1;
      }
    }

    // TODO: use `options.output` to write to a file instead of stdout
    console.log(JSON.stringify(merged, null, jsonSpacing));
    console.error(`Completed in ${Date.now() - startTime} seconds.`);
  }
  catch (error) {
    console.error(`Error: ${error}`);
  }
}
