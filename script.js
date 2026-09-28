$(function () {
  const SAMPLE = [
    { title: "Formative Assignment 1 - Quiz", dueDate: "Due Sep 27 at 11:59pm", status: "Submitted" },
    { title: "Web Scraping with Playwright", dueDate: "Due Sep 30 at 11:59pm", status: "Not Submitted / Available" },
    { title: "HTML and CSS Portfolio", dueDate: "Due Sep 20 at 11:59pm", status: "Missing" },
    { title: "JavaScript DOM Lab", dueDate: "No due date", status: "Not Submitted / Available" }
  ];
  const SAMPLE_NOTE = "Showing sample data. Load your scraped file to see your own assignments.";
  const KINDS = ["done", "pending", "missing"];
  const LABELS = { done: "submitted", pending: "to do", missing: "missing" };

  const $bar = $("#bar");
  const $legend = $("#legend");
  const $filters = $("#filters");
  const $list = $("#list");
  const $source = $("#source");

  let items = [];
  let filter = "all";

  function classify(status) {
    const s = status.toLowerCase();
    if (s.includes("missing")) return "missing";
    if (s.includes("not submitted")) return "pending";
    if (s.includes("submitted")) return "done";
    if (s.includes("late")) return "missing";
    return "pending";
  }

  // Build the filter buttons once so keyboard focus is kept when you click one
  const filterDefs = [["all", "All"], ["pending", "To do"], ["missing", "Missing"], ["done", "Submitted"]];
  $filters.append(
    filterDefs.map(([key, text]) =>
      $("<button>", { type: "button", class: "chip", text: text, "data-filter": key })
    )
  );

  // One click handler for all buttons (event delegation)
  $filters.on("click", ".chip", function () {
    filter = $(this).data("filter");
    render();
  });

  function render() {
    const counts = { done: 0, pending: 0, missing: 0 };
    items.forEach(function (i) { counts[i.kind]++; });
    const total = items.length || 1;

    $bar.empty().append(
      KINDS.map(function (k) {
        return $("<span>", { class: k }).css("width", (counts[k] / total * 100) + "%");
      })
    ).attr("aria-label",
      counts.done + " submitted, " + counts.pending + " to do, " + counts.missing + " missing");

    $legend.empty().append(
      KINDS.map(function (k) {
        return $("<li>").append($("<strong>").text(counts[k]), document.createTextNode(LABELS[k]));
      })
    );

    $filters.find(".chip").each(function () {
      $(this).attr("aria-pressed", String($(this).data("filter") === filter));
    });

    const shown = items.filter(function (i) { return filter === "all" || i.kind === filter; });

    if (!shown.length) {
      $list.empty().append(
        $("<li>", { class: "empty", text: "No assignments match this filter. Choose All to see everything." })
      );
      return;
    }

    $list.empty().append(
      shown.map(function (i) {
        return $("<li>", { class: "item " + i.kind }).append(
          $("<span>", { class: "title", text: i.title }),
          $("<span>", { class: "due", text: i.dueDate }),
          $("<span>", { class: "status", text: i.status })
        );
      })
    );
  }

  function setData(data, note) {
    items = data.map(function (r) {
      return {
        title: r.title || "Untitled",
        dueDate: r.dueDate || "No due date",
        status: r.status || "Unknown",
        kind: classify(r.status || "")
      };
    });
    $source.text(note);
    render();
  }

  $("#loadBtn").on("click", function () { $("#fileInput").trigger("click"); });

  $("#fileInput").on("change", function () {
    const file = this.files[0];
    if (!file) return;
    file.text().then(function (text) {
      try {
        setData(JSON.parse(text), "Loaded " + file.name);
      } catch (err) {
        $source.text("That file isn't valid JSON. Choose the canvas_assignments.json that scraper.js created.");
      }
    });
  });

  // Works over http (for example: npx serve); on file:// it falls back to sample data
  $.getJSON("canvas_assignments.json")
    .done(function (data) { setData(data, "Loaded canvas_assignments.json"); })
    .fail(function () { setData(SAMPLE, SAMPLE_NOTE); });
});