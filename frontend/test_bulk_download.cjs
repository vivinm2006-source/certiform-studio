const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log(`[BROWSER ${msg.type()}]`, msg.text()));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err));

  console.log('1. Loading site...');
  await page.goto('https://certiform-studio.vercel.app', { waitUntil: 'networkidle0' });

  // 2. Click Recipient Manager
  await page.evaluate(() => {
    const navButtons = Array.from(document.querySelectorAll('button'));
    const recBtn = navButtons.find(b => b.innerText.includes('Recipient Manager'));
    if (recBtn) recBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // 3. Find and click "Bulk Generate in PDF" button in Recipient Manager
  console.log('3. Clicking Bulk Generate in PDF button in Recipient Manager...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const bulkBtn = buttons.find(b => b.innerText.includes('Bulk Generate in PDF'));
    if (bulkBtn) {
      console.log('Found Bulk Generate in PDF button!');
      bulkBtn.click();
    } else {
      console.error('Bulk Generate in PDF button not found!');
    }
  });
  await new Promise(r => setTimeout(r, 1500));

  // 4. Inspect modal
  const modalText = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0');
    return modal ? modal.innerText : 'NO MODAL FOUND';
  });
  console.log('Bulk PDF Modal Content:\n', modalText);

  // 5. Click "Generate 3 Certificates in Bulk" inside modal
  console.log('5. Clicking Generate 3 Certificates in Bulk...');
  await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0');
    if (!modal) return console.error('No modal found!');
    const buttons = Array.from(modal.querySelectorAll('button'));
    const genBtn = buttons.find(b => b.innerText.includes('Generate') && b.innerText.includes('Bulk'));
    if (genBtn) {
      console.log('Found modal submit button:', genBtn.innerText);
      genBtn.click();
    } else {
      console.error('Modal submit button not found!');
    }
  });

  await new Promise(r => setTimeout(r, 8000));

  console.log('Current Page URL after click:', page.url());

  // Check modal content after click
  const postClickModalText = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0');
    return modal ? modal.innerText : 'MODAL CLOSED OR NAVIGATED';
  });
  console.log('Post-Click Modal Status:\n', postClickModalText);

  // 6. Click "Download File" button
  console.log('6. Clicking Download File button...');
  page.on('request', req => {
    console.log('[REQ OUT]', req.method(), req.url());
  });
  page.on('response', resp => {
    console.log('[RESP IN]', resp.status(), resp.url(), resp.headers()['content-type'], resp.headers()['content-disposition']);
  });

  await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0');
    const buttons = Array.from(modal.querySelectorAll('button'));
    const dlBtn = buttons.find(b => b.innerText.includes('Download Multi-Page') || b.innerText.includes('Download File'));
    if (dlBtn) {
      console.log('Found download button:', dlBtn.innerText);
      dlBtn.click();
    }
  });

  await new Promise(r => setTimeout(r, 6000));
  console.log('Page URL after download click:', page.url());

  await browser.close();
})();
