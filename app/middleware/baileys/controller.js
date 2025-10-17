const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function getProfilePicWithTimeout(waSocket, jid, timeout = 5000) {
  // sanity checks
  try {
    if (!waSocket) return null;
    // se o socket não estiver autenticado, espere um pouco ou retorne null
    if (!waSocket?.user) return null;

    // não tenta perfil de grupo
    if (jid?.endsWith?.('@g.us')) return null;

    // Promise que obtém a url (envolvemos em try/catch para evitar rejeições não tratadas)
    const getUrl = (async () => {
      try {
        const url = await waSocket.profilePictureUrl(jid, 'image');
        return url || null;
      } catch (err) {
        // erro comum: 404 / not_found ou Boom -> retornamos null silenciosamente
        return null;
      }
    })();

    // Promise de timeout
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve(null), timeout);
    });

    // race entre obter a url e o timeout
    const res = await Promise.race([getUrl, timeoutPromise]);

    return res; // url string ou null
  } catch (err) {
    // qualquer erro inesperado aqui -> log e retorna null
    console.error('Erro em getProfilePicWithTimeout:', err);
    return null;
  }
};

async function downloadMedia(data, waSocket) {
  try {
    if (!data?.message) return null;

    // pasta de destino
    const tempFolder = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempFolder)) {
      fs.mkdirSync(tempFolder, { recursive: true });
    }

    let mediaType = null;
    if (data.message.imageMessage) mediaType = 'image';
    else if (data.message.audioMessage) mediaType = 'audio';
    else if (data.message.videoMessage) mediaType = 'video';
    if (!mediaType) return null;

    // nome do arquivo
    const ext = mediaType === 'image' ? 'jpg' : mediaType === 'audio' ? 'ogg' : 'mp4';
    const fileName = `media_${Date.now()}.${ext}`;
    const filePath = path.join(tempFolder, fileName);

    // download da mídia
    const stream = await downloadContentFromMessage(data.message, mediaType, waSocket);
    const buffer = [];
    for await (const chunk of stream) buffer.push(chunk);
    const mediaBuffer = Buffer.concat(buffer);

    // salva no disco
    fs.writeFileSync(filePath, mediaBuffer);

    return filePath; // retorna o caminho salvo
  } catch (err) {
    console.error('❌ Erro ao baixar mídia:', err);
    return null;
  }
}

module.exports = {
  getProfilePicWithTimeout,
  downloadMedia
}