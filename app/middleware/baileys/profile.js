const fs = require("fs");
const path = require("path");
const axios = require("axios");

async function downloadProfilePicture(sock, jid) {
  try {
    const ppUrl = await sock.profilePictureUrl(jid, "image");
    if (!ppUrl) return null;

    const dir = path.join(process.cwd(), "public", "download", "profile");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filename = `${jid.replace("@s.whatsapp.net", "")}.jpg`;
    const filepath = path.join(dir, filename);

    const { data } = await axios.get(ppUrl, { responseType: "arraybuffer" });

    fs.writeFileSync(filepath, data);

    // ---------------------------
    // 🔥 Aqui o mais simples: só remove "public"
    // ---------------------------
    const publicUrl = filepath
      .replace(process.cwd(), "")   // remove path absoluto
      .replace(/\\/g, "/")          // Windows → barra normal
      .replace("/public", "");      // remove /public

    return publicUrl;

  } catch (err) {
    console.log("Erro ao baixar profile picture:", err.message);
    return null;
  }
}

module.exports = downloadProfilePicture;