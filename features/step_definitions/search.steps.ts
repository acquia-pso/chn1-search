import {
  Given,
  When,
  Then,
  BeforeAll,
  AfterAll,
  Before,
  After,
} from '@cucumber/cucumber';
import {
  Browser,
  BrowserContext,
  Page,
  chromium,
  ElementHandle,
} from 'playwright';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';

let browser: Browser;
let context: BrowserContext;
let page: Page;
let screenshotIndex = 0;
const selectedVerticals: string[] = [];

// Ensure screenshots directory exists
const screenshotsDir = path.join(process.cwd(), 'test-results');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function takeScreenshot(name: string) {
  const screenshotPath = path.join(
    screenshotsDir,
    `${String(screenshotIndex).padStart(2, '0')}-${name}.png`
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved: ${screenshotPath}`);
  screenshotIndex++;
}

BeforeAll(async function () {
  browser = await chromium.launch({
    headless: true,
    slowMo: 500, // Add 0.5 second delay between actions
  });
});

AfterAll(async function () {
  await browser.close();
});

Before(async function () {
  context = await browser.newContext();
  page = await context.newPage();
});

After(async function () {
  await context.close();
});

Given('I am on the search page', async function () {
  await page.goto('http://localhost:6001/');
  // Wait for the search component to be loaded
  await page.waitForSelector('outline-yext-universal', { state: 'visible' });
  await takeScreenshot('initial-page');
});

When(
  'I enter {string} into the search box',
  async function (searchTerm: string) {
    // Access the input inside shadow DOM
    const searchInput = (await page.evaluateHandle(`
    document.querySelector('outline-yext-universal').shadowRoot.querySelector('input[type="search"]')
  `)) as ElementHandle<HTMLInputElement>;

    if (!searchInput) {
      throw new Error('Could not find search input');
    }

    await searchInput.type(searchTerm, { delay: 100 });
    await takeScreenshot('after-typing');
  }
);

When('I press Enter', async function () {
  // Access the input inside shadow DOM
  const searchInput = (await page.evaluateHandle(`
    document.querySelector('outline-yext-universal').shadowRoot.querySelector('input[type="search"]')
  `)) as ElementHandle<HTMLInputElement>;

  if (!searchInput) {
    throw new Error('Could not find search input');
  }

  // Press Enter key
  await searchInput.press('Enter');

  // Wait for results to be visible
  await page.waitForFunction(
    `
    document.querySelector('outline-yext-universal').shadowRoot.querySelector('.results-grid')?.innerHTML.length > 0
  `,
    { timeout: 5000 }
  );

  await takeScreenshot('after-search');
});

When('I click the search button', async function () {
  // Access the button inside shadow DOM
  const searchButton = (await page.evaluateHandle(`
    document.querySelector('outline-yext-universal').shadowRoot.querySelector('.search-button')
  `)) as ElementHandle<HTMLButtonElement>;

  if (!searchButton) {
    throw new Error('Could not find search button');
  }

  await searchButton.click();

  // Wait for results to be visible
  await page.waitForFunction(
    `
    document.querySelector('outline-yext-universal').shadowRoot.querySelector('.results-grid')?.innerHTML.length > 0
  `,
    { timeout: 5000 }
  );

  await takeScreenshot('after-search');
});

When('I click on the first available vertical', async function () {
  // Find and click the first vertical tab
  const firstVerticalName = (await page.evaluate(`
    const verticalTab = document.querySelector('outline-yext-universal').shadowRoot.querySelector('[role="tab"]:not([data-vertical="all"])');
    const verticalName = verticalTab?.textContent || '';
    verticalTab?.click();
    verticalName;
  `)) as string;

  if (!firstVerticalName) {
    throw new Error('Could not find any vertical tabs');
  }

  selectedVerticals.push(firstVerticalName.trim());

  // Wait for results to update
  await page.waitForTimeout(1000);
  await takeScreenshot('after-clicking-first-vertical');
});

When('I click on the next available vertical', async function () {
  // Find and click the next vertical tab that's different from the current one
  const nextVerticalName = (await page.evaluate(`
    const currentVertical = document.querySelector('outline-yext-universal').shadowRoot.querySelector('.active');
    const verticalTabs = Array.from(document.querySelector('outline-yext-universal').shadowRoot.querySelectorAll('[role="tab"]:not([data-vertical="all"])'));
    const nextTab = verticalTabs.find(tab => tab.textContent !== currentVertical?.textContent);
    const verticalName = nextTab?.textContent || '';
    nextTab?.click();
    verticalName;
  `)) as string;

  if (!nextVerticalName) {
    throw new Error('Could not find another vertical tab');
  }

  selectedVerticals.push(nextVerticalName.trim());

  // Wait for results to update
  await page.waitForTimeout(1000);
  await takeScreenshot('after-clicking-next-vertical');
});

Then('I should see results for the selected vertical', async function () {
  const currentVertical = selectedVerticals[selectedVerticals.length - 1];

  // Verify we're showing results for the selected vertical
  const activeVertical = (await page.evaluate(`
    document.querySelector('outline-yext-universal').shadowRoot.querySelector('.active')?.textContent || ''
  `)) as string;

  assert(
    activeVertical.includes(currentVertical),
    `Expected to be on ${currentVertical} vertical, but found ${activeVertical}`
  );

  // Verify we have results
  const hasResults = await page.evaluate(`
    document.querySelector('outline-yext-universal').shadowRoot.querySelector('.results-grid')?.innerHTML.length > 0
  `);
  assert(hasResults, `Expected to find results for ${currentVertical}`);

  await takeScreenshot(`${currentVertical.toLowerCase()}-results`);
});

Then(
  'I should see results for the previously selected vertical',
  async function () {
    const previousVertical = selectedVerticals[selectedVerticals.length - 2];

    // Wait for the page to stabilize after navigation
    await page.waitForTimeout(1000);

    // Verify we're showing results for the previous vertical
    const activeVertical = (await page.evaluate(`
    document.querySelector('outline-yext-universal').shadowRoot.querySelector('.active')?.textContent || ''
  `)) as string;

    assert(
      activeVertical.includes(previousVertical),
      `Expected to be back on ${previousVertical} vertical, but found ${activeVertical}`
    );

    // Verify we have results
    const hasResults = await page.evaluate(`
    document.querySelector('outline-yext-universal').shadowRoot.querySelector('.results-grid')?.innerHTML.length > 0
  `);
    assert(hasResults, `Expected to find results for ${previousVertical}`);

    await takeScreenshot('after-back-to-previous-vertical');
  }
);

When('I click the browser back button', async function () {
  await page.goBack();
  await page.waitForTimeout(1000); // Wait for page to update
  await takeScreenshot('after-back-button');
});

Then('I should see search results displayed', async function () {
  // Check for results grid
  const hasResults = await page.evaluate(`
    document.querySelector('outline-yext-universal').shadowRoot.querySelector('.results-grid')?.innerHTML.length > 0
  `);
  assert(hasResults, 'Expected to find search results grid');

  // Check for at least one vertical section with results
  const verticalSections = (await page.evaluate(`
    document.querySelector('outline-yext-universal').shadowRoot.querySelectorAll('.vertical-section').length
  `)) as number;
  assert(
    verticalSections > 0,
    'Expected to find at least one vertical section'
  );

  // Check that at least one vertical section has results
  const hasVerticalResults = (await page.evaluate(`
    Array.from(document.querySelector('outline-yext-universal').shadowRoot.querySelectorAll('.vertical-section')).some(
      section => section.querySelector('.vertical-results')?.innerHTML.length > 0
    )
  `)) as boolean;
  assert(
    hasVerticalResults,
    'Expected to find at least one vertical section with results'
  );

  // Log the number of results found
  const totalResults = (await page.evaluate(`
    Array.from(document.querySelector('outline-yext-universal').shadowRoot.querySelectorAll('.vertical-section')).reduce(
      (total, section) => total + section.querySelectorAll('.vertical-results > *').length, 0
    )
  `)) as number;
  console.log(
    `Found ${totalResults} total results across ${verticalSections} vertical sections`
  );

  await takeScreenshot('final-results');
});
