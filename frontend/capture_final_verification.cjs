const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Loading live site https://certiform-studio.vercel.app ...');
  await page.goto('https://certiform-studio.vercel.app', { waitUntil: 'networkidle0' });

  await new Promise(r => setTimeout(r, 2000));

  // 1. Capture studio editor canvas
  await page.screenshot({
    path: 'C:/Users/ADMINPC/.gemini/antigravity/brain/eef73679-f961-4e07-8dd5-d3ab2027b0bc/live_studio_verified.png'
  });
  console.log('Captured live_studio_verified.png');

  // 2. Open Recipient Manager
  await page.evaluate(() => {
    const navButtons = Array.from(document.querySelectorAll('button'));
    const recBtn = navButtons.find(b => b.innerText.includes('Recipient Manager'));
    if (recBtn) recBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({
    path: 'C:/Users/ADMINPC/.gemini/antigravity/brain/eef73679-f961-4e07-8dd5-d3ab2027b0bc/live_recipient_manager.png'
  });
  console.log('Captured live_recipient_manager.png');

  // 3. Open Bulk PDF Modal
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const bulkBtn = buttons.find(b => b.innerText.includes('Bulk Generate in PDF'));
    if (bulkBtn) bulkBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: 'C:/Users/ADMINPC/.gemini/antigravity/brain/eef73679-f961-4e07-8dd5-d3ab2027b0bc/live_bulk_modal.png'
  });
  console.log('Captured live_bulk_modal.png');

  await browser.close();
  console.log('Verification captures completed successfully.');
})();
