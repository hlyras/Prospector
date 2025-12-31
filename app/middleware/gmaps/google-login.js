const puppeteer = require("puppeteer");

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: "./puppeteer-profile",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled"
        ],
    });

    const page = await browser.newPage();
    await page.goto("https://accounts.google.com", {
        waitUntil: "networkidle2",
    });

    console.log("👉 Faça login manualmente no Google.");
    console.log("👉 Depois feche o navegador.");
})();