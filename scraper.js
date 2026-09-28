const { chromium } = require('playwright');
const fs = require('fs');

// Course names come from the command line. Default: Responsible Enterprise
// Example: node scraper.js "Responsible Enterprise" "Frontend Web Development"
const courseNames = process.argv.slice(2).length ? process.argv.slice(2) : ['Responsible Enterprise'];
const BASE_URL = 'https://alueducation.instructure.com';

// Read a Canvas API list (all pages) using the logged-in browser session
async function api(page, path) {
  let url = BASE_URL + path, out = [];
  while (url) {
    const res = await page.request.get(url);
    if (!res.ok()) throw new Error(res.status() + ' ' + url);
    // Canvas prefixes session-authenticated JSON with "while(1);"
    const text = (await res.text()).replace(/^while\(1\);/, '');
    out = out.concat(JSON.parse(text));
    const next = /<([^>]+)>;\s*rel="next"/.exec(res.headers()['link'] || '');
    url = next ? next[1] : null;
  }
  return out;
}

const clean = s => s.trim().replace(/\s*\n\s*/g, ' ');

async function scrapeCourse(page, courseName) {
  console.log(`\nOpening the "${courseName}" course...`);
  await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: courseName }).first().click({ timeout: 20000 });
  await page.waitForURL(/\/courses\/\d+/, { timeout: 20000 });
  const courseId = /\/courses\/(\d+)/.exec(page.url())[1];
  const courseUrl = `${BASE_URL}/courses/${courseId}`;

  // Assignments (your original scraping logic)
  await page.getByRole('link', { name: 'Assignments' }).first().click({ timeout: 20000 });
  await page.waitForSelector('.ig-row', { timeout: 20000 });

  const rows = await page.locator('.ig-row').all();
  const assignments = [];
  console.log(`Detected ${rows.length} items. Extracting...`);

  for (const row of rows) {
    try {
      const title = await row.locator('.ig-title').first().innerText();

      const dueEl = row.locator('.assignment-date-due').first();
      const dueDate = (await dueEl.count()) > 0 ? await dueEl.innerText() : 'No due date';

      const statusEl = row.locator('.submission-status-container').first();
      const status = (await statusEl.count()) > 0 ? await statusEl.innerText() : 'Unknown';

      const href = await row.locator('a.ig-title').first().getAttribute('href').catch(() => null);

      assignments.push({
        title: clean(title),
        dueDate: clean(dueDate),
        status: clean(status),
        url: href ? new URL(href, BASE_URL).href : ''
      });
    } catch (error) {
      console.log('Skipped one row:', error.message.split('\n')[0]);
    }
  }

  // Modules
  let modules = [];
  try {
    const raw = await api(page, `/api/v1/courses/${courseId}/modules?include%5B%5D=items&per_page=100`);
    modules = raw.map(m => ({
      name: m.name,
      items: (m.items || []).map(i => ({
        title: i.title,
        type: i.type,
        url: i.html_url || i.external_url || ''
      }))
    }));
  } catch (e) { console.log('Modules skipped:', e.message.split('\n')[0]); }

  // Announcements
  let announcements = [];
  try {
    const raw = await api(page, `/api/v1/announcements?context_codes%5B%5D=course_${courseId}&per_page=10`);
    announcements = raw.map(a => ({ title: a.title, postedAt: a.posted_at, url: a.html_url }));
  } catch (e) { console.log('Announcements skipped:', e.message.split('\n')[0]); }

  return { name: courseName, url: courseUrl, assignments, modules, announcements };
}

async function scrapeALUCanvas() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to ALU Canvas...');
    await page.goto(BASE_URL, { timeout: 60000, waitUntil: 'domcontentloaded' });

    console.log('\n======================================================');
    console.log('ACTION REQUIRED: Log in using your student account.');
    console.log('Complete any 2FA prompts, then leave this window alone.');
    console.log('======================================================\n');

    // Wait until you are on Canvas and no longer on a login page
    await page.waitForURL(
      url => url.hostname.includes('instructure.com') && !url.pathname.includes('login'),
      { timeout: 0 }
    );
    console.log('Login verified!');

    const courses = [];
    for (const name of courseNames) {
      try {
        courses.push(await scrapeCourse(page, name));
      } catch (error) {
        console.error(`Could not scrape "${name}":`, error.message.split('\n')[0]);
        try { await page.screenshot({ path: `error-${name.replace(/\W+/g, '_')}.png` }); } catch (e) {}
      }
    }

    console.log('\n--- SCRAPED ASSIGNMENT DATA ---');
    console.table(courses.flatMap(c => c.assignments.map(a => ({ course: c.name, ...a }))));

    fs.writeFileSync('canvas_data.json', JSON.stringify({ courses }, null, 2), 'utf-8');
    console.log('\nSuccess! Saved to ./canvas_data.json');

    await page.waitForTimeout(3000);
  } catch (error) {
    console.error('\nScraper failed:', error.message.split('\n')[0]);
  } finally {
    await browser.close();
  }
}

scrapeALUCanvas();