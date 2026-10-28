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

  page.on('console', msg => console.log(`[BROWSER ${msg.type()}]`, msg.text()));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err));

  console.log('1. Loading site...');
  await page.goto('https://certiform-studio.vercel.app', { waitUntil: 'networkidle0', timeout: 30000 });

  // 2. Click on Recipient Manager in top nav
  console.log('2. Navigating to Recipient Manager...');
  await page.evaluate(() => {
    const navButtons = Array.from(document.querySelectorAll('button'));
    const recBtn = navButtons.find(b => b.innerText.includes('Recipient Manager'));
    if (recBtn) recBtn.click();
    else console.error('Recipient Manager nav button not found!');
  });
  await new Promise(r => setTimeout(r, 1000));

  // 3. Upload test_students.xlsx
  console.log('3. Uploading test_students.xlsx...');
  const fileInput = await page.$('input[type="file"][accept*=".xlsx"]');
  if (!fileInput) {
    console.error('File input for excel not found!');
  } else {
    await fileInput.uploadFile('C:\\Users\\ADMINPC\\.gemini\\antigravity\\scratch\\test_students.xlsx');
    console.log('File uploaded to input. Waiting for preview modal...');
    await new Promise(r => setTimeout(r, 2000));

    // Check if Import Modal is open
    const modalText = await page.evaluate(() => {
      const modal = document.querySelector('.fixed.inset-0');
      return modal ? modal.innerText : 'NO MODAL FOUND';
    });
    console.log('Import Modal Text snippet:\n', modalText.slice(0, 300));

    // Click "Import X Recipients" button inside modal
    console.log('4. Clicking Import Recipients button...');
    await page.evaluate(() => {
      const modalButtons = Array.from(document.querySelectorAll('button'));
      const importBtn = modalButtons.find(b => b.innerText.toLowerCase().includes('import') && !b.innerText.toLowerCase().includes('csv'));
      if (importBtn) {
        console.log('Found import button:', importBtn.innerText);
        importBtn.click();
      } else {
        console.error('Import button not found in modal!');
      }
    });

    await new Promise(r => setTimeout(r, 2500));
  }

  // 5. Navigate back to Certificate Studio
  console.log('5. Navigating back to Certificate Studio...');
  await page.evaluate(() => {
    const navButtons = Array.from(document.querySelectorAll('button'));
    const studioBtn = navButtons.find(b => b.innerText.includes('Certificate Studio'));
    if (studioBtn) studioBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // 6. Check what text is rendered on the certificate canvas
  const canvasText = await page.evaluate(() => {
    const canvas = document.querySelector('.canvas-shadow');
    return canvas ? canvas.innerText : 'NO CANVAS FOUND';
  });
  console.log('\n--- TEXT ON CERTIFICATE CANVAS AFTER EXCEL UPLOAD ---');
  console.log(canvasText);

  // 7. Check the recipient carousel text on toolbar
  const carouselText = await page.evaluate(() => {
    const carousel = document.querySelector('.bg-slate-100\\/90');
    return carousel ? carousel.innerText : 'NO CAROUSEL FOUND';
  });
  console.log('\nToolbar Recipient Carousel Text:', carouselText);

  const screenshotPath = 'C:\\Users\\ADMINPC\\.gemini\antigravity\\brain\\eef73679-f961-4e07-8dd5-d3ab2027b0bc\\test_after_upload.png';
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
})();
