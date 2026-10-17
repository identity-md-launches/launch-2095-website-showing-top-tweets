import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";

// Serve only the production export, at a subpath, and always close it after the run.
const root = resolve("dist");
const out = resolve("test/scratch/interaction");
await mkdir(out, { recursive: true });
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".txt": "text/plain",
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/preview/")) throw Error("Outside preview");
    const relative =
      decodeURIComponent(url.pathname.slice("/preview/".length)) ||
      "index.html";
    const path = resolve(root, relative);
    if (!path.startsWith(root + "/")) throw Error("Outside export");
    const contents = await readFile(path);
    res.writeHead(200, {
      "Content-Type": types[extname(path)] || "application/octet-stream",
    });
    res.end(contents);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
const data = JSON.parse(await readFile("src/posts.json", "utf8"));
const report = {
  checks: [],
  limitations: [],
  viewports: [],
  accessibility: [],
  errors: [],
};
let browser;
async function check(name, run) {
  try {
    const detail = await run();
    report.checks.push({ name, passed: true, detail });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.checks.push({ name, passed: false, error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
function inOrder(records, key) {
  return [...records]
    .sort((a, b) => b[key] - a[key] || b.timestamp - a.timestamp)
    .map((p) => p.id);
}
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
  });
  // No external resource is necessary for the app. X destination checks are intercepted.
  await context.route("**/*", async (route) => {
    if (route.request().url().startsWith(url)) await route.continue();
    else if (route.request().url().startsWith("https://x.com/"))
      await route.fulfill({
        contentType: "text/html",
        body: "<title>Navigation target check</title>",
      });
    else await route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      report.errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(url);
  await page.evaluate(async () => {
    localStorage.clear();
    await document.fonts.ready;
  });
  await page.reload();
  await page.evaluate(() => document.fonts.ready);

  await check("Eight sourced tweets render at a gateway subpath", async () => {
    assert.equal(await page.locator(".post").count(), 8);
    assert.deepEqual(
      await page
        .locator(".post")
        .evaluateAll((es) => es.map((e) => e.dataset.postId)),
      inOrder(data, "likes"),
    );
    assert.equal(new Set(data.map((p) => p.id)).size, 8);
    assert(
      data.every((p) => p.url === `https://x.com/${p.handle}/status/${p.id}`),
    );
  });
  await check(
    "390px first screen includes tweet text and Read on X",
    async () => {
      const boxes = await page.evaluate(() => ({
        text: document
          .querySelector(".post blockquote")
          .getBoundingClientRect()
          .toJSON(),
        action: document
          .querySelector(".read-link")
          .getBoundingClientRect()
          .toJSON(),
        heading: document.querySelector("h1").getBoundingClientRect().toJSON(),
      }));
      assert(boxes.text.top < 844 && boxes.text.bottom <= 844);
      assert(boxes.action.top > 0 && boxes.action.bottom <= 844);
      assert(boxes.heading.top >= 0 && boxes.heading.bottom <= 844);
      return boxes;
    },
  );
  await check("Search finds authors and text, ignoring case", async () => {
    await page.getByLabel("Search tweets", { exact: true }).fill("TAYLOR");
    assert.equal(await page.locator(".post").count(), 2);
    await page
      .getByRole("button", { name: "Clear search", exact: true })
      .click();
    assert.equal(await page.locator(".post").count(), 8);
  });
  await check("Topic filtering and search combine", async () => {
    await page.getByRole("button", { name: "Builds", exact: true }).click();
    assert.equal(await page.locator(".post").count(), 3);
    await page.getByLabel("Search tweets", { exact: true }).fill("swarm");
    assert.equal(await page.locator(".post").count(), 2);
    await page
      .getByRole("button", { name: "Clear search", exact: true })
      .click();
  });
  await check(
    "Unmatched search gives a useful clear-filters recovery",
    async () => {
      await page
        .getByLabel("Search tweets", { exact: true })
        .fill("no-such-pond-post");
      assert.equal(await page.locator(".post").count(), 0);
      assert(
        await page
          .getByRole("heading", { name: "No tweets found." })
          .isVisible(),
      );
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      assert.equal(await page.locator(".post").count(), 8);
      assert.equal(
        await page
          .locator("#search")
          .evaluate((e) => e === document.activeElement),
        true,
      );
    },
  );
  await check("Most reposted and newest sort the actual data", async () => {
    for (const [option, key] of [
      ["reposts", "reposts"],
      ["newest", "timestamp"],
      ["likes", "likes"],
    ]) {
      await page.getByLabel("Sort by", { exact: true }).selectOption(option);
      assert.deepEqual(
        await page
          .locator(".post")
          .evaluateAll((es) => es.map((e) => e.dataset.postId)),
        inOrder(data, key),
      );
    }
  });
  await check(
    "Read on X opens the exact original post in a new tab",
    async () => {
      const [popup] = await Promise.all([
        page.waitForEvent("popup"),
        page.locator(".post .read-link").first().click(),
      ]);
      await popup.waitForLoadState();
      assert.equal(popup.url(), data[0].url);
      await popup.close();
      return "Destination intercepted; remote X rendering and login are outside this check.";
    },
  );
  await check(
    "Bookmark toggles, saved navigation and reload persistence",
    async () => {
      await page.locator(".post .save-button").first().click();
      assert.equal(
        await page
          .locator(".post .save-button")
          .first()
          .getAttribute("aria-pressed"),
        "true",
      );
      await page.locator('.primary-nav a[href="#saved"]').click();
      assert.equal(await page.locator(".post").count(), 1);
      await page.reload();
      assert.equal(await page.locator(".post").count(), 1);
      assert.match(
        await page.locator("#feed-title").innerText(),
        /Saved tweets\s*1/,
      );
      await page.locator(".post .save-button").click();
      assert(
        await page
          .getByRole("heading", { name: "Keep a little signal." })
          .isVisible(),
      );
      await page
        .getByRole("link", { name: "Explore top tweets", exact: true })
        .click();
      assert.equal(await page.locator(".post").count(), 8);
    },
  );
  await check(
    "Hash navigation responds to browser back and forward",
    async () => {
      await page.locator('.primary-nav a[href="#saved"]').click();
      await page.locator('.primary-nav a[href="#feed"]').click();
      await page.goBack();
      assert.match(
        await page.locator("#feed-title").innerText(),
        /Saved tweets/,
      );
      await page.goForward();
      assert.match(await page.locator("#feed-title").innerText(), /Top tweets/);
    },
  );
  await check(
    "About dialog has an accessible name, traps focus, closes with Escape and returns focus",
    async () => {
      await page
        .getByRole("button", { name: "About the board", exact: true })
        .click();
      const modal = page.getByRole("dialog");
      assert(await modal.isVisible());
      assert.equal(await modal.getAttribute("aria-labelledby"), "about-title");
      assert.equal(
        await page
          .getByRole("button", { name: "Close about the board" })
          .evaluate((e) => e === document.activeElement),
        true,
      );
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Tab");
        assert(
          await page
            .locator("dialog")
            .evaluate((e) => e.contains(document.activeElement)),
        );
      }
      await page.keyboard.press("Escape");
      assert.equal(await modal.isVisible(), false);
      assert.equal(
        await page
          .locator(".about-trigger")
          .evaluate((e) => e === document.activeElement),
        true,
      );
      await page
        .getByRole("button", { name: "About the board", exact: true })
        .click();
      await page.mouse.click(5, 5);
      assert.equal(await modal.isVisible(), false);
      await page
        .getByRole("button", { name: "About the board", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Close about the board", exact: true })
        .click();
      assert.equal(await modal.isVisible(), false);
    },
  );
  await check(
    "Original source list and downloadable JSON contain all eight posts",
    async () => {
      await page
        .getByRole("button", { name: "About the board", exact: true })
        .click();
      await page.locator("dialog summary").click();
      assert.equal(await page.locator(".source-list a").count(), 8);
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("link", { name: "Download source records" }).click(),
      ]);
      await download.saveAs(resolve(out, "downloaded-sources.json"));
      const sources = JSON.parse(
        await readFile(resolve(out, "downloaded-sources.json"), "utf8"),
      );
      assert.deepEqual(
        sources.map((s) => s.id),
        data.map((p) => p.id),
      );
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "Keyboard skip, search, filters, bookmarks and navigation work with visible focus",
    async () => {
      await page.goto(url);
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() => document.activeElement.textContent),
        "Skip to tweets",
      );
      await page.keyboard.press("Enter");
      assert.equal(
        await page.evaluate(() => document.activeElement.id),
        "content",
      );
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() => document.activeElement.id),
        "search",
      );
      const ring = await page.locator(".input-wrap").evaluate((e) => ({
        style: getComputedStyle(e).outlineStyle,
        width: getComputedStyle(e).outlineWidth,
      }));
      assert.equal(ring.style, "solid");
      assert.equal(ring.width, "2px");
      await page.screenshot({ path: resolve(out, "mobile-focus.png") });
      async function tabTo(selector, reverse = false) {
        for (let count = 0; count < 80; count++) {
          if (
            await page.evaluate(
              (selector) => document.activeElement?.matches(selector),
              selector,
            )
          )
            return;
          await page.keyboard.press(reverse ? "Shift+Tab" : "Tab");
        }
        throw new Error(`Keyboard could not reach ${selector}`);
      }
      await page.keyboard.type("taylor");
      assert.equal(await page.locator(".post").count(), 2);
      await tabTo(".clear-search");
      await page.keyboard.press("Enter");
      assert.equal(await page.locator(".post").count(), 8);
      await tabTo(".topic-filters button:nth-child(2)");
      await page.keyboard.press("Space");
      assert.equal(await page.locator(".post").count(), 3);
      await tabTo(".post:first-child .save-button");
      await page.keyboard.press("Space");
      assert.equal(
        await page
          .locator(".post:first-child .save-button")
          .getAttribute("aria-pressed"),
        "true",
      );
      await tabTo('.primary-nav a[href="#saved"]', true);
      await page.keyboard.press("Enter");
      assert.equal(await page.locator(".post").count(), 1);
      await tabTo(".post .save-button");
      await page.keyboard.press("Space");
      assert.equal(await page.locator(".post").count(), 0);
      await tabTo(".empty-state a");
      await page.keyboard.press("Enter");
      assert.equal(await page.locator(".post").count(), 8);
    },
  );
  await check("axe WCAG 2 A/AA scan: feed and open dialog", async () => {
    for (const state of ["feed", "dialog"]) {
      if (state === "dialog")
        await page
          .getByRole("button", { name: "About the board", exact: true })
          .click();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      report.accessibility.push({
        state,
        violations: result.violations,
        incomplete: result.incomplete.map((x) => ({
          id: x.id,
          impact: x.impact,
          nodes: x.nodes.length,
        })),
      });
      assert.equal(
        result.violations.length,
        0,
        JSON.stringify(
          result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        ),
      );
      assert.equal(
        result.incomplete.length,
        0,
        JSON.stringify(
          result.incomplete.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        ),
      );
    }
    await page.keyboard.press("Escape");
  });
  await check(
    "Responsive export has no horizontal overflow at 320, 390, 720, 960 and 1440",
    async () => {
      for (const width of [320, 390, 720, 960, 1440]) {
        await page.setViewportSize({
          width,
          height: width === 1440 ? 1000 : 844,
        });
        await page.goto(url);
        await page.evaluate(async () => {
          await document.fonts.ready;
          document
            .querySelectorAll("img")
            .forEach((i) => (i.loading = "eager"));
        });
        await page.waitForFunction(() =>
          [...document.images]
            .filter((i) => !i.closest("dialog"))
            .every((i) => i.complete && i.naturalWidth > 0),
        );
        const size = await page.evaluate(() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
        }));
        report.viewports.push(size);
        assert(size.document <= size.viewport);
        await page.screenshot({
          path: resolve(out, `viewport-${width}.png`),
          fullPage: width === 1440,
        });
      }
    },
  );
  await check("200% text enlargement reflows at 390px", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    const size = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    await page.screenshot({
      path: resolve(out, "text-200.png"),
      fullPage: true,
    });
    assert(size.document <= size.viewport, JSON.stringify(size));
    const selectFits = await page.locator("#sort").evaluate((element) => {
      const style = getComputedStyle(element);
      const context = document.createElement("canvas").getContext("2d");
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      return (
        element.clientWidth >=
        context.measureText(element.selectedOptions[0].text).width + 32
      );
    });
    assert(
      selectFits,
      "The selected sort label must remain readable at 200% text size.",
    );
    return "CSS text enlargement; browser-native zoom is not equivalent and was not measured.";
  });
  await check(
    "Reduced motion removes transitions and press transforms",
    async () => {
      await page.goto(url);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const styles = await page
        .locator(".topic-filters button")
        .first()
        .evaluate((e) => ({
          duration: getComputedStyle(e).transitionDuration,
          animations: document.getAnimations().length,
        }));
      assert.equal(styles.duration, "0s");
      assert.equal(styles.animations, 0);
      await page.emulateMedia({ reducedMotion: "no-preference" });
    },
  );
  await check("Metadata, local images, font and share image load", async () => {
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.title(), "The Pond · Top IdentityMD tweets");
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:title"]',
      'meta[property="og:image"]',
      'link[rel="icon"]',
    ])
      assert(await page.locator(selector).count());
    const image = await context.request.get(url + "assets/og-image.png");
    assert(image.ok());
    assert((await image.body()).length > 10000);
    assert(await page.evaluate(() => document.fonts.check("400 16px Manrope")));
  });
  await check(
    "Browser-storage failure has a truthful in-memory fallback",
    async () => {
      const isolated = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      await isolated.addInitScript(() => {
        Storage.prototype.setItem = function () {
          throw new DOMException("Storage unavailable", "SecurityError");
        };
      });
      const p = await isolated.newPage();
      await p.goto(url);
      await p.locator(".post .save-button").first().click();
      assert(
        await p
          .getByText("Browser storage is unavailable.", { exact: false })
          .isVisible(),
      );
      await p.locator('.primary-nav a[href="#saved"]').click();
      assert.equal(await p.locator(".post").count(), 1);
      await isolated.close();
    },
  );
  await check("Corrupted bookmarks are handled without a crash", async () => {
    await page.evaluate(() =>
      localStorage.setItem("the-pond:saved:v1", "not-json"),
    );
    await page.reload();
    assert.equal(await page.locator(".post").count(), 8);
    await page.locator('.primary-nav a[href="#saved"]').click();
    assert.equal(await page.locator(".post").count(), 0);
    await page.evaluate(() => localStorage.clear());
  });
  await check("No page errors or local HTTP failures", async () => {
    assert.deepEqual(report.errors, []);
  });
  await context.close();
  await browser.close();
  browser = null;
  try {
    const safari = await webkit.launch({ headless: true });
    browser = safari;
    const p = await safari.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(url);
    await check(
      "WebKit primary search, filter and bookmark interaction",
      async () => {
        await p.getByLabel("Search tweets", { exact: true }).fill("taylor");
        assert.equal(await p.locator(".post").count(), 2);
        await p
          .getByRole("button", { name: "Clear search", exact: true })
          .click();
        await p.getByRole("button", { name: "Builds", exact: true }).click();
        assert.equal(await p.locator(".post").count(), 3);
        await p.locator(".post .save-button").first().click();
        await p.locator('.primary-nav a[href="#saved"]').click();
        assert.equal(await p.locator(".post").count(), 1);
        await p.screenshot({ path: resolve(out, "webkit-mobile.png") });
      },
    );
  } catch (error) {
    report.limitations.push(
      `WebKit could not launch: ${
        error.message
          .split("\n")
          .filter(
            (x) =>
              x.includes("Missing") ||
              x.includes(".so") ||
              x.includes("Host system"),
          )
          .join(" ") || error.message.slice(0, 300)
      }`,
    );
    console.log("UNPERFORMED WebKit: runtime dependencies unavailable.");
  }
} finally {
  if (browser) await browser.close();
  await new Promise((r) => server.close(r));
  await writeFile(
    resolve(out, "results.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(
  `${report.checks.filter((c) => c.passed).length}/${report.checks.length} checks passed; ${report.limitations.length} limitations.`,
);
process.exitCode = report.checks.some((c) => !c.passed) ? 1 : 0;
