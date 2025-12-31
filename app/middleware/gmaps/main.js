const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const path = require("path");

puppeteer.use(StealthPlugin());

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function randomDelay(min = 2000, max = 5000) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  await sleep(ms);
}

// Função para rolar até o fim da lista
async function scrollToEnd(page, scrollContainer = "div[role='feed']") {
  let previousHeight = await page.evaluate(
    (sel) => document.querySelector(sel)?.scrollHeight || 0,
    scrollContainer
  );

  while (true) {
    await page.evaluate(
      (sel) => {
        const el = document.querySelector(sel);
        if (el) el.scrollBy(0, el.scrollHeight);
      },
      scrollContainer
    );

    await randomDelay(6000, 10000);

    const newHeight = await page.evaluate(
      (sel) => document.querySelector(sel)?.scrollHeight || 0,
      scrollContainer
    );

    if (newHeight === previousHeight) break;
    previousHeight = newHeight;
  }
}

async function scrapeMapsFromUrl({
  url,
  limit = 10,
  startIndex = 0,
  onProgress = null,
  onFound = null
}) {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: path.resolve(__dirname, "./puppeteer-profile"), // 🔐 SESSÃO LOGADA
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled"
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(url, { waitUntil: "networkidle2" });
  await randomDelay();

  await scrollToEnd(page, "div[role='feed']");

  const links = await page.$$eval("a.hfpxzc", as =>
    as.map(a => a.href)
  );

  onProgress?.({ totalEncontrado: links.length });

  const slice = links.slice(startIndex, limit);

  for (let i = 0; i < slice.length; i++) {
    const absoluteIndex = startIndex + i;
    const link = slice[i];

    try {
      await page.goto(link, { waitUntil: "networkidle2" });
      await randomDelay(4000, 7000);

      const data = await page.evaluate(() => {
        const nome =
          document.querySelector("h1.DUwDvf")?.innerText.trim() || null;
        const endereco =
          document.querySelector("button[data-item-id='address']")
            ?.innerText.trim() || null;
        const telefone =
          document.querySelector("button[data-item-id*='phone']")
            ?.innerText.trim() || null;
        const site =
          document.querySelector("a[data-item-id='authority']")?.href || null;

        return { nome, endereco, telefone, site };
      });

      if (data?.nome) {
        await onFound?.(data, absoluteIndex);
      }

    } catch (err) {
      console.log(`⚠️ Erro no índice ${absoluteIndex}:`, err);
    }
  }

  await browser.close();
}

// Exporta a função
module.exports = {
  scrapeMapsFromUrl,
};