const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

async function getWappMessages(userId, startTime, endTime) {
  const authPath = path.resolve(`./app/middleware/baileys/auth/${userId}`);
  if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    browser: ['TempAudit', 'Chrome', '1.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    logger: { info() { }, error() { }, warn() { }, debug() { }, trace() { }, child() { return this; } },
  });

  // Salva credenciais
  sock.ev.on('creds.update', saveCreds);

  // Aguarda conexão abrir
  await new Promise((resolve, reject) => {
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'open') resolve();
      if (connection === 'close') reject(new Error(lastDisconnect?.error?.message || 'Erro desconhecido'));
    });
  });

  // Lista todos os chats
  const chats = Array.from(sock.chats.values ? sock.chats.values() : []);

  const allMessages = [];

  for (const chat of chats) {
    const jid = chat.id;
    let lastMessageId;
    let sentMessages = [];

    while (true) {
      const messages = await sock.loadMessages(jid, 50, lastMessageId);
      if (!messages || messages.length === 0) break;

      const fromMe = messages.filter(msg => {
        if (!msg.key.fromMe) return false;
        const ts = msg.messageTimestamp * 1000;
        return ts >= startTime.getTime() && ts <= endTime.getTime();
      });

      sentMessages.push(...fromMe);

      lastMessageId = messages[messages.length - 1].key.id;
      const oldestMessageTs = messages[messages.length - 1].messageTimestamp * 1000;
      if (oldestMessageTs < startTime.getTime()) break;
    }

    if (sentMessages.length > 0) {
      allMessages.push({
        jid,
        messages: sentMessages
      });
    }
  }

  // Desconecta
  await sock.logout();
  sock.ws.close();

  return allMessages;
};

module.exports = getWappMessages;