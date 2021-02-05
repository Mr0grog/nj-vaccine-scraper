const got = require('got');
const { availability } = require('./model');

async function getCredentials () {
  const tokenResponse = await got('https://covidvaccine.nj.gov/_layout/tokenhtml');
  const token = tokenResponse.body.match(/value="([^"]+)"/)[1];
  const cookie = tokenResponse.headers['set-cookie']
    .map(x => x.split(';')[0])
    .join('; ');

  return {token, cookie};
}

async function getLocations ({token, cookie}) {
  const response = await got('https://covidvaccine.nj.gov/EntityList/Map/Search/', {
    method: 'POST',
    http2: true,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      '__RequestVerificationToken': token,
      'Cookie': cookie
    },
    responseType: 'json',
    json: {
      // Dataset to search within -- this is the vaccination locations.
      "id":"c60e8867-6613-eb11-a813-001dd8018866",
      // Random coordinates inside New Jersey.
      "longitude": -75.49178314208984,
      "latitude": 39.681549072265625,
      // Huge range to make sure we get all possible sites.
      "distance": 1000,
      "units": "miles",
    }
  });

  return response.body;
}

module.exports = async function () {
  console.error('Checking New Jersey VSS (https://covidvaccine.nj.gov)...');

  // Get a fresh token and record cookies.
  const credentials = await getCredentials();
  const locations = await getLocations(credentials);

  // `locations` entries are formatted like:
  // {
  //   Description: '<p>200 Grand St, Paterson, NJ 07501<br/>\n' +
  //     '<p style="color:Red;"><strong>Currently this location is restricted to those in Passaic county</strong></p></p>\n' +
  //     '<strong><em>Available Vaccines</em></strong>\n' +
  //     '<ul>\n' +
  //     '<li>Moderna</li>\n' +
  //     '</ul>\n' +
  //     'This location is available for 1st and 2nd dose recipients. ',
  //   Distance: 109.5,
  //   Id: 'a4cd873f-b660-eb11-a812-001dd801ad19',
  //   Latitude: 40.90942,
  //   Location: '40.90942,-74.17966',
  //   Longitude: -74.17966,
  //   PushpinImageHeight: 39,
  //   PushpinImageUrl: '',
  //   PushpinImageWidth: 32,
  //   Title: 'International High School',
  //   Url: ''
  // }

  const scrapeTime = new Date();
  result = locations.map(location => ({
    name: location.Title,
    operated_by: null,
    available: availability.yes,
    checked_at: scrapeTime.toISOString(),
    official: null
  }));

  return result;
};
