const csvParse = require('csv-parse');
const fs = require('fs');
const path = require('path');
const util = require('util');
const njUtils = require('./utils')

const CSV_PATH = path.join(__dirname, 'official-locations-list.csv');
const URL_PROTOCOL = /^https?:\/\//;

function cleanRecord (record) {
  for (let key in record) {
    record[key] = record[key].trim();
  }

  record.simpleName = njUtils.matchable(record['Facility Name']);
  record.simpleAddress = njUtils.matchable(record['Facility Address']);
  record.isMegasite = record['Facility Name']
    .toLowerCase()
    .includes('megasite');

  let url = record['Facility Website'];
  if (url.includes('://covidvaccine.nj.gov')) {
    url = 'https://covidvaccine.nj.gov/';
  }
  else if (url && !URL_PROTOCOL.test(url)) {
    url = 'https://' + url;
  }
  record['Facility Website'] = url;

  return record;
}

async function read () {
  const parser = fs
    .createReadStream(CSV_PATH, {encoding: 'utf-8'})
    .pipe(csvParse({columns: true}));

  result = [];
  for await (const record of parser) {
    result.push(cleanRecord(record));
  }

  return result;
}

let readPromise = null;
let data = null;

/**
 * Get a list of location records.
 * @returns {Promise<Array<object>>}
 */
async function getList () {
  if (!data) {
    if (!readPromise) {
      readPromise = read().then(list => data = list);
    }
    await readPromise;
  }
  return data;
}

module.exports = {
  getList,
  read
}
