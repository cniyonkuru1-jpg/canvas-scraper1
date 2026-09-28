const { chromium } = require('playwright');
const fs = require('fs');

async function scrapeALUCanvas() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to ALU Canvas...');
    await page.goto('https://alueducation.instructure.com', {
      timeout: 60000,
      waitUntil: 'domcontentloaded'
    });

    console.log('\n======================================================');
    console.log('ACTION REQUIRED: Please log in using your student account.');
    console.log('Complete any 2FA prompts on your mobile device if required.');
    console.log('======================================================\n');

    // Wait until you are on Canvas and no longer on a login page
    await page.waitForURL(
      url => url.hostname.includes('instructure.com') && !url.pathname.includes('login'),
      { timeout: 0 }
    );
    console.log('Login verified! Arrived at Canvas.');
    console.log('Opening the "Frontend Web development" course...');

    await page.getByRole('link', { name: 'Frontend Web development' }).first().click();
    await page.getByRole('link', { name: 'Assignments' }).click();

    await page.waitForSelector('.assignment-list');

    const assignmentRows = await page.locator('.assignment-list .ig-row').all();
    const scrapedAssignments = [];

    console.log(`Detected ${assignmentRows.length} items. Extracting...`);

    for (const row of assignmentRows) {
      try {
        const title = await row.locator('.ig-title').innerText();

        const dueDateElement = row.locator('.assignment-date-due');
        const dueDate = (await dueDateElement.count()) > 0
          ? await dueDateElement.innerText()
          : 'No due date';

        const statusElement = row.locator('.submission-status-container');
        const status = (await statusElement.count()) > 0
          ? await statusElement.innerText()
          : 'Unknown';

        scrapedAssignments.push({
          title: title.trim().replace(/\n/g, ' '),
          dueDate: dueDate.trim().replace(/\n/g, ' '),
          status: status.trim().replace(/\n/g, ' ')
        });
      } catch (error) {
        console.log('Skipped one row:', error.message);
      }
    }

    console.log('\n--- SCRAPED ASSIGNMENT DATA ---');
    console.table(scrapedAssignments);

    const outputFilename = 'canvas_assignments.json';
    fs.writeFileSync(outputFilename, JSON.stringify(scrapedAssignments, null, 2), 'utf-8');
    console.log(`\nSuccess! Saved to ./${outputFilename}`);

    await page.waitForTimeout(3000);
  } catch (error) {
    console.error('Scraper failed:', error.message);
  } finally {
    await browser.close();
  }
}

scrapeALUCanvas();