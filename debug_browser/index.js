const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('Browser launched successfully version:', await browser.version());
    await browser.close();
    console.log('Browser closed.');
  } catch (error) {
    console.error('Failed to launch browser:', error);
    process.exit(1);
  }
})();
