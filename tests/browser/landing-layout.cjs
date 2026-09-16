// Run against a local dev server: node tests/browser/landing-layout.cjs
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => console.error('Browser error:', error.message));
    await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.querySelector('.academic-proof-deck').style.getPropertyValue('--proof-stack-height'));
    for (const width of [1440, 1024]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const bottom = await page.locator('.academic-proof-deck').evaluate(el => el.getBoundingClientRect().bottom + scrollY);
      for (const remaining of [600, 450, 300]) {
        await page.evaluate(y => scrollTo(0, y), bottom - remaining);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const tops = await page.locator('.academic-proof-card').evaluateAll(cards => cards.map(card => card.getBoundingClientRect().top));
        for (let i = 1; i < tops.length; i++) {
          assert.ok(Math.abs(tops[i] - tops[i - 1] - 64) < 2, `${width}px / ${remaining}px remaining: lost heading peek, tops=${tops}`);
        }
        if (width === 1440 && remaining === 600) await page.screenshot({ path: '.superdesign/tmp/deck-release.png' });
      }
    }
    // The app's manual theme must win over the opposite OS preference.
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme === 'light' ? 'dark' : 'light' });
      await page.getByRole('radio', { name: theme === 'light' ? 'Light' : 'Dark', exact: true }).first().click();
      await page.waitForFunction(theme => document.documentElement.classList.contains(theme), theme);
      assert.equal(await page.locator(`.mobile-showcase-${theme}`).isVisible(), true);
      assert.equal(await page.locator(`.mobile-showcase-${theme === 'light' ? 'dark' : 'light'}`).isVisible(), false);
      const panel = await page.locator('.mobile-showcase-copy').evaluate(el => {
        const style = getComputedStyle(el);
        return { background: style.backgroundColor, shadow: style.boxShadow, border: style.borderTopWidth };
      });
      assert.deepEqual(panel, { background: 'rgba(0, 0, 0, 0)', shadow: 'none', border: '0px' });
      await page.locator('.mobile-showcase').scrollIntoViewIfNeeded();
      await page.locator(`.mobile-showcase-${theme}`).evaluate(image => image.decode());
      await page.locator('.mobile-showcase').screenshot({ path: `.superdesign/tmp/showcase-${theme}.png` });
    }
    for (const width of [375, 768]) {
      await page.setViewportSize({ width, height: 812 });
      await page.evaluate(() => scrollTo(0, 0));
      const cards = await page.locator('.academic-proof-card').evaluateAll(cards => cards.map(card => ({ top: card.getBoundingClientRect().top, bottom: card.getBoundingClientRect().bottom })));
      for (let i = 1; i < cards.length; i++) assert.ok(cards[i].top >= cards[i - 1].bottom + 20, 'Mobile cards must not overlap');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No mobile horizontal overflow');
      await page.locator('.mobile-showcase').scrollIntoViewIfNeeded();
      await page.locator('.mobile-showcase-dark').evaluate(image => image.decode());
      if (width === 375) await page.locator('.mobile-showcase').screenshot({ path: '.superdesign/tmp/showcase-mobile.png' });
    }
    await page.locator('.mobile-showcase').screenshot({ path: '.superdesign/tmp/showcase-tablet.png' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    const reduced = await page.locator('[data-landing-motion]').evaluateAll(elements => elements.map(el => {
      const style = getComputedStyle(el);
      return { animation: style.animationName, delay: style.animationDelay, opacity: style.opacity, transform: style.transform };
    }));
    assert.ok(reduced.length > 10, 'Landing motion targets must be integrated');
    reduced.forEach(style => assert.deepEqual(style, { animation: 'none', delay: '0s', opacity: '1', transform: 'none' }));
    const staticCards = await page.locator('.academic-proof-card').evaluateAll(cards => cards.map(card => ({ top: card.getBoundingClientRect().top, bottom: card.getBoundingClientRect().bottom })));
    for (let i = 1; i < staticCards.length; i++) assert.ok(staticCards[i].top >= staticCards[i - 1].bottom + 20, 'Reduced-motion deck remains readable');
    const noJS = await browser.newContext({ javaScriptEnabled: false });
    const staticPage = await noJS.newPage();
    await staticPage.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000');
    assert.equal(await staticPage.getByRole('heading', { level: 1 }).evaluate(el => getComputedStyle(el).opacity), '1');
    await noJS.close();
    console.log('PASS: all four heading peeks survive the deck release at desktop widths.');
    console.log('PASS: theme-specific images, unboxed copy, and non-overlapping mobile cards.');
    console.log('PASS: reduced-motion disables text effects and no-JS content remains visible.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
