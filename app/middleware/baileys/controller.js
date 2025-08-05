const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");

function getProfilePicWithTimeout(waSocket, jid, timeout = 5000) {
  return Promise.race([
    (async () => {
      try {
        return await waSocket.profilePictureUrl(jid, 'image');
      } catch (err) {
        return null;
      }
    })(),
    new Promise((resolve) => setTimeout(() => resolve(null), timeout))
  ]);
}

async function downloadMedia(data, sock) {
  const supportedTypes = {
    imageMessage: "image",
    audioMessage: "audio",
    videoMessage: "video",
  };

  try {
    const buffer = await downloadMediaMessage(
      data,
      "buffer",
      {},
      { reuploadRequest: sock.updateMediaMessage }
    );

    const key = Object.keys(data.message || {}).find((k) => supportedTypes[k]);
    if (!key) return null;

    const mimetype = data.message[key].mimetype;
    const ext = mime.extension(mimetype) || "bin";
    const type = supportedTypes[key];
    const fileName = `whatsapp_file_${Date.now()}.${ext}`;
    const filePath = path.join(__dirname, `../../../public/download/${type}`, fileName);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);

    return `/download/${type}/${fileName}`;
  } catch (err) {
    console.error("Erro ao salvar imagem do WhatsApp:", err);
    return null;
  }
}

module.exports = {
  getProfilePicWithTimeout,
  downloadMedia
};