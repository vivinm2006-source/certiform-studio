const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleLogs = [];
  const errors = [];
  const failedRequests = [];

  page.on('console', msg => {
    consoleLogs.push(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    errors.push(`[PAGE ERROR] ${err.toString()}`);
  });

  page.on('requestfailed', req => {
    failedRequests.push(`[REQ FAILED] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });

  console.log('Navigating to https://certiform-studio.vercel.app...');
  try {
    const resp = await page.goto('https://certiform-studio.vercel.app', { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('HTTP Status:', resp.status());
  } catch (err) {
    console.error('Navigation error:', err);
  }

  // Wait extra 2 seconds for any client side animations / data fetching
  await new Promise(r => setTimeout(r, 2000));

  const screenshotPath = 'C:\\Users\\ADMINPC\\.gemini\\antigravity\\brain\\eef73679-f961-4e07-8dd5-d3ab2027b0bc\\live_ui.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Screenshot saved to:', screenshotPath);

  console.log('\n--- BROWSER CONSOLE LOGS ---');
  consoleLogs.forEach(l => console.log(l));

  console.log('\n--- PAGE JAVASCRIPT ERRORS ---');
  if (errors.length === 0) console.log('None! Zero page errors.');
  else errors.forEach(e => console.log(e));

  console.log('\n--- FAILED NETWORK REQUESTS ---');
  if (failedRequests.length === 0) console.log('None! Zero failed network requests.');
  else failedRequests.forEach(r => console.log(r));

  // Check what's rendered in the DOM
  const title = await page.title();
  const heading = await page.evaluate(() => document.body.innerText.slice(0, 500));
  console.log('\nPage Title:', title);
  console.log('Body Text Snippet:\n', heading);

  await browser.close();
})();
