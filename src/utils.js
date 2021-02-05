const MULTIPLE_SPACE_PATTERN = /[\n\s]+/g;
const PUNCTUATION_PATTERN = /[.\-–—'"“”‘’!()\/\\]+/g;

module.exports = {
  /**
   * Simplify a text string (especially an address) as much as possible so that
   * it might match with a similar string from another source.
   * @param {string} text
   * @returns {string}
   */
  matchable (text) {
    return text
      .replace(PUNCTUATION_PATTERN, ' ')
      .replace(MULTIPLE_SPACE_PATTERN, ' ')
      .trim()
      .toLowerCase()
      .replace(/ rd /g, 'road')
      .replace(/ st /g, 'street')
      .replace(/ blvd /g, 'boulevard')
      .replace(/ ln /g, 'lane');
  },

  /**
   * Remove an item matching a predicate function from an array and return it.
   * @param {Array} list Array to remove the item from.
   * @param {(any) => bool} predicate Function to identify an item to remove
   */
  popItem (list, predicate) {
    const index = list.findIndex(predicate);
    return (index > -1) ? list.splice(index, 1)[0] : undefined;
  }
}
