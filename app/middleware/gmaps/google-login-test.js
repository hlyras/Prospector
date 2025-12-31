const puppeteer = require("puppeteer");
const path = require("path");

// 🔒 PERFIL FIXO (NUNCA MUDE ESSE CAMINHO)
const PROFILE_DIR = path.resolve(__dirname, "./puppeteer-profile");

(async () => {
    console.log("Chrome usado:", puppeteer.executablePath());
    console.log("Perfil:", PROFILE_DIR);

    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: PROFILE_DIR,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox"
        ]
    });

    const page = await browser.newPage();

    // Abre página que só entra se estiver logado
    await page.goto("https://myaccount.google.com", {
        waitUntil: "networkidle2",
    });

    console.log("\n👉 Se NÃO estiver logado:");
    console.log("   - Faça login manualmente");
    console.log("   - Aguarde a página carregar completamente");
    console.log("   - Volte aqui e pressione ENTER\n");

    process.stdin.resume();
    process.stdin.once("data", async () => {
        console.log("Salvando sessão e fechando...");
        await browser.close();
        process.exit(0);
    });
})();