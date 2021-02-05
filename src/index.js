const allScrapers = {
  essex: require('./essex-county'),
  hackensackMeridian: require('./hackensack-meridian'),
  njvss: require('./njvss'),
  shoprite: require('./shoprite'),
  vaccinatenj: require('./vaccinatenj')
};

module.exports = {
  allScrapers
};
