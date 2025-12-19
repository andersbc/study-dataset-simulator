const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
    });
    const page = await browser.newPage();

    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // 1. Check Title
    console.log('Checking title...');
    const title = await page.$eval('h1', el => el.textContent);
    if (!title.includes('Study Design')) throw new Error('Title not found');
    console.log('Title verified:', title);

    // 2. Click Add Variable
    console.log('Clicking Add Variable...');
    // Vuetify button with text "Add Variable"
    const addBtn = await page.waitForSelector('button ::-p-text(Add Variable)');
    await addBtn.click();

    // 3. Fill Form
    console.log('Filling form...');
    // Wait for dialog
    await page.waitForSelector('.v-overlay--active');

    // Name input (Label 'Name')
    const nameInput = await page.waitForSelector('label ::-p-text(Name)');
    // Click label to focus input (Vuetify specific)
    await nameInput.click();
    await page.keyboard.type('Test Age');

    // Select Data Type
    // Click the select box
    const select = await page.waitForSelector('label ::-p-text(Data Type)');
    await select.click();

    // Wait for menu
    await page.waitForSelector('.v-overlay-container');
    // Click 'continuous'
    const option = await page.waitForSelector('.v-list-item ::-p-text(continuous)');
    await option.click();

    // 4. Click Add
    console.log('Submitting form...');
    // Find Add button in dialog actions (text "Add")
    // Be careful, there might be multiple "Add" (the main button had "Add Variable")
    // The dialog button just says "Add"
    const submitBtn = await page.waitForSelector('.v-card-actions button ::-p-text(Add)');
    await submitBtn.click();

    // 5. Verify List
    console.log('Verifying list...');
    // Wait for the list item to appear with the expected text
    try {
      await page.waitForSelector('.v-list-item-title ::-p-text(Test Age)', { timeout: 2000 });
    } catch (e) {
      // If selector wait fails, we'll fall through to the text check which gives a better error
    }

    const listText = await page.$eval('.v-list', el => el.textContent);
    if (!listText.includes('Test Age') || !listText.includes('continuous')) {
      throw new Error('Variable not found in list: ' + listText);
    }
    console.log('Variable found in list!');

    // 6. Verify JSON
    console.log('Verifying JSON...');
    const jsonText = await page.$eval('pre code', el => el.textContent);
    const jsonData = JSON.parse(jsonText);
    if (jsonData.variables[0].name !== 'Test Age') throw new Error('JSON mismatch');

    console.log('Verification SUCCESS!');

  } catch (error) {
    console.error('Verification FAILED:', error);
    if (browser) {
      const page = (await browser.pages())[0];
      if (page) {
        const html = await page.content();
        console.log('Current HTML snapshot:', html.slice(0, 500) + '...');
      }
    }
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
