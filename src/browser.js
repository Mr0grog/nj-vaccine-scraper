const playwright = require('playwright');

module.exports = {
  /**
   * Wrap a function so that a new playwright browser instance and context is
   * created and passed as the first argument when the function is invoked.
   * When the function returns or throws an error, the context and browser are
   * automatically closed.
   * @param {object?} options Options to use when constructing the playwright
   *        browser context.
   * @param {(playwright.Browser, ...any) => any} func A function to wrap.
   * @returns {(...any) => Promise}
   */
  withBrowser (options, func) {
    if (typeof options === 'function') [func, options] = [options, {}];

    return async function withBrowserWrapper (...args) {
      // TODO: this should probably use a single, globally shared browser
      // instance instead of creating a new one every time (we should still
      // create a new context every time, though).
      const browser = await playwright.chromium.launch();
      const context = await browser.newContext(options);
      try {
        return await func.apply(this, [context, ...args]);
      }
      finally {
        await context.close();
        await browser.close();
      }
    };
  }
};
