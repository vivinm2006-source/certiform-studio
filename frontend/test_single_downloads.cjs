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
  page.on('response', resp => {
    if (resp.url().includes('render/preview')) {
      console.log('[PREVIEW RESP]', resp.status(), resp.url(), resp.headers()['content-type']);
    }
  });

  console.log('Loading site...');
  await page.goto('https://certiform-studio.vercel.app', { waitUntil: 'networkidle0' });

  // Find PDF button
  console.log('Finding and clicking PDF quick download button...');
  const pdfClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.trim() === 'PDF');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('PDF button clicked:', pdfClicked);

  await new Promise(r => setTimeout(r, 4000));

  // Find PNG button
  console.log('Finding and clicking PNG quick download button...');
  const pngClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('PNG'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('PNG button clicked:', pngClicked);

  await new Promise(r => setTimeout(r, 4000));

  await browser.close();
  console.log('Done.');
})();
