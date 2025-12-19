const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Take initial screenshot
    await page.screenshot({ path: '/home/anders/.gemini/antigravity/brain/555b1430-43d5-4154-b058-aba7d21478b3/dashboard_initial.png' });
    console.log('Captured dashboard_initial.png');

    // Add a variable to show interaction
    const addBtn = await page.waitForSelector('button ::-p-text(Add Variable)');
    await addBtn.click();

    // Wait for dialog animation
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: '/home/anders/.gemini/antigravity/brain/555b1430-43d5-4154-b058-aba7d21478b3/dashboard_dialog.png' });
    console.log('Captured dashboard_dialog.png');

  } catch (error) {
    console.error('Capture FAILED:', error);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
