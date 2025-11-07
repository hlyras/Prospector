// /middleware/baileys/whatsapp-session.js
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const waEmitter = require('./emitter');

const bailey_sessions = new Map(); // userId -> WhatsAppSession

async function createOrGetSession(userId) {
  // 🔹 Reutiliza sessão ativa
  if (bailey_sessions.has(userId)) {
    const existing = bailey_sessions.get(userId);
    if (existing?.sock?.ws?.readyState === 1) return existing;
  }

  const authPath = `./app/middleware/baileys/auth/${userId}`;
  if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();
  console.log(`📦 Baileys versão: ${version.join('.')}`);

  const sock = makeWASocket({
    version,
    auth: state,
    browser: ['Ghost', 'Chrome', '1.0.0'],

    // ⚙️ Configurações de modo "ghost"
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    shouldSendHistorySync: false,
    fireInitQueries: false,
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: false,
    retryRequestDelayMs: 0,
    emitOwnEvents: true,
    getMessage: async () => undefined,
    connectTimeoutMs: 45_000,
    defaultQueryTimeoutMs: 60_000,

    // ✅ Logger silencioso e compatível
    logger: {
      info() { },
      error() { },
      warn() { },
      debug() { },
      trace() { },
      child() { return this; },
    },
  });

  // 🧩 Comportamento passivo
  Object.assign(sock, {
    sendPresenceUpdate: async () => { },
    sendReceipts: async () => { },
    readMessages: async () => { },
    chatModify: async () => { },
    presenceSubscribe: async () => { },
    groupMetadata: async () => { },
    fetchPrivacySettings: async () => ({}),
    fetchBlocklist: async () => [],
    updateProfileStatus: async () => { },
    profilePictureUrl: async () => null,
  });

  const sessionData = { sock, connected: false, qr: null, reconnecting: false };
  bailey_sessions.set(userId, sessionData);

  sock.ev.process(async (events) => {
    if (events['creds.update']) await saveCreds();

    if (events['connection.update']) {
      const { connection, lastDisconnect, qr } = events['connection.update'];

      if (qr) {
        sessionData.qr = qr;
        console.log(`📲 [${userId}] QR gerado`);
      }

      if (connection === 'open') {
        console.log(`✅ [${userId}] Conectado`);
        sessionData.connected = true;
        sessionData.qr = null;
      }

      if (connection === 'close') {
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || 'unknown';
        console.log(`❌ [${userId}] Conexão encerrada: ${reason}`);

        sessionData.connected = false;

        // 🔒 Evita loop infinito de conflito
        const isConflict = reason.includes('conflict') || reason.includes('Replaced');
        const shouldReconnect =
          code !== DisconnectReason.loggedOut &&
          !reason.includes('Connection Failure') &&
          !isConflict;

        if (sessionData.sock?.ws) {
          try { sessionData.sock.ws.close(); } catch { }
        }

        if (isConflict) {
          console.log(`⚠️ [${userId}] Conexão encerrada por conflito — outra instância está ativa. Sessão pausada.`);
          return; // 🔒 não reconecta automaticamente
        }

        if (shouldReconnect) {
          if (sessionData.reconnecting) return;
          sessionData.reconnecting = true;

          const delay = reason.includes('Stream Errored') ? 8000 : 4000;
          console.log(`🔄 [${userId}] Tentando reconectar em ${delay / 1000}s...`);

          setTimeout(async () => {
            try {
              console.log(`♻️ [${userId}] Recriando sessão...`);
              bailey_sessions.delete(userId);
              sessionData.reconnecting = false;
              const newSession = await createOrGetSession(userId);
              bailey_sessions.set(userId, newSession);
              console.log(`✅ [${userId}] Sessão recriada com sucesso`);
            } catch (err) {
              console.error(`💥 [${userId}] Erro ao tentar reconectar:`, err);
              sessionData.reconnecting = false;
            }
          }, delay);
        } else {
          console.log(`📴 [${userId}] Sessão encerrada permanentemente.`);
          bailey_sessions.delete(userId);
          try { fs.rmSync(authPath, { recursive: true, force: true }); } catch { }
        }
      }
    }

    if (events['messages.upsert']) {
      const { messages } = events['messages.upsert'];
      for (const msg of messages) {
        if (!msg.message) continue;
        waEmitter.emit('received-message', { userId, data: msg });
      }
    }
  });

  return sessionData;
}

function getSession(userId) {
  return bailey_sessions.get(userId);
}

module.exports = { createOrGetSession, getSession };