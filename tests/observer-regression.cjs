const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { chromium } = require('playwright');
const source = readFileSync(process.env.ICICLE_TEST_SOURCE || `${__dirname}/../src/content.js`, 'utf8');

test('title compatibility and body observers settle after updates', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.route('https://x.com/**', route => route.fulfill({
      contentType: 'text/html',
      body: `<html><head><title>Home / X</title></head><body>
        <button data-testid="SideNav_AccountSwitcher_Button"><div dir="ltr">Alice</div></button>
        <main><div><button>Follow</button></div></main>
      </body></html>`
    }));
    await page.goto('https://x.com/alice');
    await page.evaluate(() => {
      window.chrome = {
        runtime: { getURL: () => '' },
        storage: { local: {
          get: async () => ({ compactAccount: true }),
          set: async () => {}
        } }
      };
      window.titleCallbacks = 0;
      const observer = new MutationObserver(() => {
        if (++window.titleCallbacks >= 100) {
          observer.disconnect();
          return;
        }
        const title = document.title.replace(/X$/, 'Twitter');
        if (title !== document.title) document.title = title;
      });
      observer.observe(document.querySelector('title'), {
        childList: true, subtree: true, characterData: true
      });
      window.bodyMutations = 0;
      new MutationObserver(records => { window.bodyMutations += records.length; })
        .observe(document.body, { childList: true, subtree: true });
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => { document.title = 'Profile / X'; });
    await page.waitForTimeout(300);
    assert.equal(await page.title(), 'Profile / Twitter');
    assert.ok(await page.evaluate(() => window.titleCallbacks < 10), 'title observers must converge');
    assert.equal(await page.locator('[data-testid="SideNav_AccountSwitcher_Button"]').innerText(), 'A...');
    assert.equal(await page.locator('[data-icicle-whitelist-label]').count(), 0);
    const before = await page.evaluate(() => window.bodyMutations);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.bodyMutations), before, 'idle DOM must stop changing');

    await page.evaluate(() => {
      document.querySelector('main').innerHTML = '<div><button><span>Follow</span></button></div>';
      document.title = 'Another profile / X';
    });
    await page.waitForTimeout(300);
    assert.equal(await page.title(), 'Another profile / Twitter');
    assert.equal(await page.locator('[data-icicle-whitelist-label]').innerText(), 'Add to whitelist');
    const after = await page.evaluate(() => window.bodyMutations);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.bodyMutations), after, 'whitelist label must stop changing');
  } finally {
    await browser.close();
  }
});
