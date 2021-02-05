const fs = require('fs/promises');
const { allScrapers } = require('./index');
const { availability } = require('./model');
const officialLocations = require('./official-locations');
const { popItem } = require('./utils');

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

async function addOfficialLocations (data) {
  let officials = await officialLocations.getList();
  officials = officials.slice();

  for (let record of data) {
    if (!record.official) continue;

    popItem(officials, official => (
      official.simpleName === record.official.simpleName &&
      official.simpleAddress === record.official.simpleAddress
    ));
  }

  data.push(...officials.map(official => ({
    name: official['Facility Name'],
    operated_by: null,
    available: availability.unknowable,
    checked_at: null,
    official
  })));

  return data;
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
    let merged = mergeDatasets(input, results);
    if (options.includeAll) {
      merged = await addOfficialLocations(merged);
    }

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
