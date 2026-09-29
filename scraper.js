const { JSDOM } = require("jsdom");
const jqueryFactory = require("jquery");

const BASE_URL = "https://alueducation.instructure.com";

async function main() {
  const dom = await JSDOM.fromFile("assignments.html", { url: BASE_URL });
  const $ = jqueryFactory(dom.window);

  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const rows = $(".ig-row");
  console.log(`Found ${rows.length} assignments\n`);

  rows.each((i, el) => {

    const title =
      clean($row.find(".ig-title").first().text()) ||
      clean($row.find("a").first().text());
    const due = clean($row.find(".assignment-date-due").first().text());
    const status = clean($row.find(".submission-status-container").first().text());
    const href =
      $row.find("a.ig-title").attr("href") || $row.find("a").first().attr("href");

    console.log(`Assignment Title: ${title || "N/A"}`);
    console.log(`Status:           ${status || "Not Submitted / Available"}`);
    console.log(`Due Date:         ${due || "No due date"}`);
    if (href) console.log(`Link:             ${new URL(href, BASE_URL).href}`);
    console.log("-".repeat(50));
  });
}

main().catch(console.error);