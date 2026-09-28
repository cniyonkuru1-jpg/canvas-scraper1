# Canvas Assignment Scraper

A Node.js script that logs into ALU Canvas, collects the assignments from the "Frontend Web development" course, and saves them to a JSON file. A small web dashboard then displays them with a progress summary and filters.

## What's in this project

| File | Purpose |
|---|---|
| `scraper.js` | Playwright script that scrapes assignment titles, due dates, and statuses |
| `index.html` | Dashboard page structure |
| `style.css` | Dashboard styling (includes dark mode and mobile layout) |
| `script.js` | jQuery code that loads the JSON and renders the list, progress bar, and filters |

## Requirements

- [Node.js](https://nodejs.org) (LTS version)
- An ALU student Canvas account

## Setup

```bash
npm init -y
npm install playwright
npx playwright install chromium
```

## Run the scraper

```bash
node scraper.js
```

1. A Chromium window opens on the Canvas login page.
2. Log in yourself with your student account and complete 2FA if asked. The script waits for you and never sees your password.
3. Once you reach Canvas, the script opens the course's Assignments page and reads each row.
4. Results print as a table in the terminal and save to `canvas_assignments.json`.

## View the dashboard

Open `index.html` in your browser. It shows sample data at first. Click **Load canvas_assignments.json** and choose the file the scraper created.

To load the file automatically instead, serve the folder locally:

```bash
npx serve
```

Then open the address it prints.

## How it works

- **Scraper:** Playwright runs a visible browser (`headless: false`) so you can log in manually. It reads each assignment row with scoped locators and skips any row it can't parse.
- **Dashboard:** each status is sorted into *Submitted*, *To do*, or *Missing*, which drives the progress bar, the counts, and the filter buttons. All text is inserted with jQuery's `.text()`, so scraped content can't inject HTML.

## Known limitations

- The selectors (`.assignment-list`, `.ig-row`, `.ig-title`) depend on Canvas's page markup. If Canvas changes it, the scraper will return nothing and the selectors need updating.
- You have to log in on every run.
- The course name is hard-coded as "Frontend Web development".

## Privacy

`canvas_assignments.json` contains your personal assignment data. It is listed in `.gitignore` so it isn't published by accident.

## Tech

Node.js, Playwright, HTML, CSS, JavaScript, jQuerys