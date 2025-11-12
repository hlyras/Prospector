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

        const isConflict = reason.includes('conflict') || reason.includes('Replaced');
        const shouldReconnect =
          code !== DisconnectReason.loggedOut &&
          !reason.includes('Connection Failure') &&
          !isConflict;

        // ✅ se o fechamento foi manual, não reconectar
        if (sessionData.manualClose) {
          console.log(`🧩 [${userId}] Desconexão manual — reconexão automática desativada.`);
          sessionData.manualClose = false; // limpa flag (caso reconecte depois manualmente)
          return;
        }

        if (sessionData.sock?.ws) {
          try { sessionData.sock.ws.close(); } catch { }
        }

        if (isConflict) {
          console.log(`⚠️ [${userId}] Conexão encerrada por conflito — outra instância está ativa. Sessão pausada.`);
          return;
        }

        if (shouldReconnect) {
          // ... resto do seu código de reconexão
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
};

function isSocketAlive(session) {
  try {
    return (
      session?.sock?.ws &&
      session.sock.ws.readyState === session.sock.ws.OPEN
    );
  } catch {
    return false;
  }
}

function isBaileysConnected(session) {
  try {
    const wsAlive = session?.sock?.ws?.readyState === session.sock.ws.OPEN;
    const stateAlive = session?.sock?.state === 'open';
    return wsAlive && stateAlive;
  } catch {
    return false;
  }
}

async function waitForSessionState(session, timeoutMs = 15000, intervalMs = 200) {
  return new Promise(resolve => {
    let elapsed = 0;

    const interval = setInterval(() => {
      // se já conectou ou gerou QR, retorna imediatamente
      if (session.connected || session.qr) {
        cleanup();
        return resolve({
          connected: session.connected || false,
          qr: session.qr || null
        });
      }

      elapsed += intervalMs;
      if (elapsed >= timeoutMs) {
        cleanup();
        return resolve({
          connected: session.connected || false,
          qr: session.qr || null
        });
      }
    }, intervalMs);

    // opcional: ainda escuta eventos se quiser resposta mais imediata
    function onUpdate() {
      if (session.connected || session.qr) {
        cleanup();
        resolve({
          connected: session.connected || false,
          qr: session.qr || null
        });
      }
    }

    session.ev?.on("connection.update", onUpdate);

    function cleanup() {
      clearInterval(interval);
      session.ev?.off("connection.update", onUpdate);
    }
  });
};

function removeSession(userId, options = { permanent: false }) {
  const session = bailey_sessions.get(userId);
  if (!session) return;

  console.log(`🚪 [${userId}] Encerrando sessão manualmente...`);
  session.manualClose = true;

  try {
    // encerra o socket WebSocket
    session.sock?.ws?.close();

    // opcional: encerra o loop interno do baileys
    session.sock?.end?.();
  } catch (err) {
    console.warn(`⚠️ [${userId}] Erro ao encerrar socket:`, err.message);
  }

  // remove da memória (socket some)
  bailey_sessions.delete(userId);

  // se for logout total, apaga também o auth
  if (options.permanent) {
    const authPath = `./app/middleware/baileys/auth/${userId}`;
    try {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log(`🧹 [${userId}] Auth removido permanentemente.`);
    } catch { }
  }
}

module.exports = { createOrGetSession, getSession, isSocketAlive, isBaileysConnected, waitForSessionState, removeSession };