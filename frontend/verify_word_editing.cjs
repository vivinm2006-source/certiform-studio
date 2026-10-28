const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log(`[BROWSER ${msg.type()}]`, msg.text()));

  console.log('Loading live site...');
  await page.goto('https://certiform-studio.vercel.app', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // Click on "STARTUP & ENTREPRENEURSHIP" on canvas
  console.log('Selecting topic element on canvas...');
  const clicked = await page.evaluate(() => {
    const textEls = Array.from(document.querySelectorAll('span'));
    const startupSpan = textEls.find(s => s.innerText.includes('STARTUP') || s.innerText.includes('ENTREPRENEURSHIP'));
    if (startupSpan) {
      startupSpan.click();
      return true;
    }
    return false;
  });
  console.log('Clicked element on canvas:', clicked);
  await new Promise(r => setTimeout(r, 1000));

  // Check Properties Panel
  const panelContent = await page.evaluate(() => {
    const panel = document.querySelector('aside');
    return panel ? panel.innerText : 'NO ASIDE PANEL FOUND';
  });
  console.log('\n--- PROPERTIES PANEL CONTENT ---');
  console.log(panelContent.slice(0, 500));

  // Take screenshot
  await page.screenshot({ path: 'C:/Users/ADMINPC/.gemini/antigravity/brain/eef73679-f961-4e07-8dd5-d3ab2027b0bc/word_editing_verified.png' });
  console.log('Saved word_editing_verified.png');

  await browser.close();
})();
