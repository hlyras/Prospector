const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

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

    await randomDelay(2000, 4000);

    const newHeight = await page.evaluate(
      (sel) => document.querySelector(sel)?.scrollHeight || 0,
      scrollContainer
    );

    if (newHeight === previousHeight) break;
    previousHeight = newHeight;
  }
}

async function scrapeMapsFromUrl(url, limit = 10, onContact = null) {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(url, { waitUntil: "networkidle2" });
  await randomDelay();

  // Scroll até o fim para carregar todos os resultados
  await scrollToEnd(page, "div[role='feed']");

  // Pega links dos cards
  const links = await page.$$eval("a.hfpxzc", (as) => as.map((a) => a.href));

  console.log(`🔎 Encontrados ${links.length} resultados.`);

  let results = [];

  for (let link of links.slice(0, limit)) {
    try {
      await page.goto(link, { waitUntil: "networkidle2" });
      await randomDelay(4000, 7000);

      const data = await page.evaluate(() => {
        const nome =
          document.querySelector("h1.DUwDvf")?.innerText.trim() || null;
        const endereco =
          document
            .querySelector("button[data-item-id='address']")
            ?.innerText.trim() || null;
        const telefone =
          document
            .querySelector("button[data-item-id*='phone']")
            ?.innerText.trim() || null;
        const site =
          document.querySelector("a[data-item-id='authority']")?.href || null;

        return { nome, endereco, telefone, site };
      });

      if (data.nome) results.push(data);

      if (onContact) onContact(data);

      console.log("✅ Coletado:", data.nome);
      
      await randomDelay(3000, 6000);
    } catch (err) {
      console.log("⚠️ Erro ao pegar dados:", err);
    }
  }

  await browser.close();
  return results;
}

// Exporta a função
module.exports = {
  scrapeMapsFromUrl,
};