// /middleware/baileys/whatsapp-session.js
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  proto
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const fs = require('fs');
const waEmitter = require('./emitter');

const bailey_sessions = new Map(); // userId -> session object


/* -----------------------------------------------------------
   🔥 CRIA OU CARREGA SESSÃO
------------------------------------------------------------*/
async function createOrGetSession(userId) {

  // Se já existe, retornar a atual
  if (bailey_sessions.has(userId)) {
    const s = bailey_sessions.get(userId);
    if (s?.sock?.ws?.readyState === 1) return s;
  }

  const authPath = `./app/middleware/baileys/auth/${userId}`;
  if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`📦 Baileys versão: ${version.join('.')}`);

  const sessionData = await startSocket(userId, state, saveCreds, version);
  bailey_sessions.set(userId, sessionData);

  return sessionData;
}


/* -----------------------------------------------------------
   🚀 INICIA O WEBSOCKET
------------------------------------------------------------*/
async function startSocket(userId, state, saveCreds, version) {

  const sock = makeWASocket({
    version,
    auth: state,
    browser: ['Ghost', 'Chrome', '1.0.0'],

    // 🔥 ESSENCIAL: sem isso, cai com 20–30 minutos ocioso
    keepAliveIntervalMs: 30_000,

    // Modo ghost seguro
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => true,
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: false,

    // NÃO DESATIVAR (precisa para protocolo)
    fireInitQueries: true,

    emitOwnEvents: true,
    getMessage: async () => undefined,

    connectTimeoutMs: 45_000,
    defaultQueryTimeoutMs: 60_000,

    logger: {
      info() { }, warn() { }, error() { },
      debug() { }, trace() { },
      child() { return this; }
    }
  });

  // ⚠️ Somente estas podem ser apagadas (safe)
  sock.sendPresenceUpdate = async () => { };
  sock.readMessages = async () => { };

  // NUNCA APAGAR AS OUTRAS → quebra o protocolo e derruba stream

  const session = {
    sock,
    userId,
    connected: false,
    qr: null,
    reconnecting: false,
    manualClose: false
  };

  /* ---------------------------------------------
     🔔 EVENTOS DE CONEXÃO
  ----------------------------------------------*/
  sock.ev.process(async (events) => {
    if (events['creds.update']) await saveCreds();

    if (events['connection.update']) {
      const { connection, lastDisconnect, qr } = events['connection.update'];

      if (qr) {
        session.qr = qr;
        console.log(`📲 [${userId}] QR gerado.`);
      }

      if (connection === 'open') {
        session.connected = true;
        session.qr = null;
        console.log(`✅ [${userId}] Conectado.`);
      }

      if (connection === 'close') {
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || 'unknown';

        console.log(`❌ [${userId}] Conexão encerrada: ${reason}`);

        session.connected = false;

        // Fechamento manual
        if (session.manualClose) {
          console.log(`🧩 [${userId}] Desconexão manual confirmada.`);
          session.manualClose = false;
          return;
        }

        const isLoggedOut = code === DisconnectReason.loggedOut;
        const isConflict = /conflict|Replaced/i.test(reason);

        // Conflito → outra instância conectou
        if (isConflict) {
          console.log(`⚠️ [${userId}] Sessão substituída — pausa reconexão.`);
          return;
        }

        // Logout total → apagar auth
        if (isLoggedOut) {
          console.log(`📴 [${userId}] Logout detectado. Removendo sessão.`);
          removeSession(userId, { permanent: true });
          return;
        }

        // 🔄 Realizar reconexão
        reconnect(userId);
      }
    }

    // if (events['messages.upsert']) {
    //   const { messages } = events['messages.upsert'];

    //   console.log('messages', messages);

    //   for (const msg of messages) {
    //     if (!msg.message) continue;

    //     waEmitter.emit('received-message', {
    //       userId,
    //       data: proto.WebMessageInfo.toObject(msg)
    //     });
    //   }
    // }
  });

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (!['notify', 'append', 'history'].includes(type)) return;

    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.remoteJid === 'status@broadcast') continue;

      waEmitter.emit('received-message', {
        userId,
        data: proto.WebMessageInfo.create(msg)
      });
    }
  });

  return session;
}

/* -----------------------------------------------------------
   🔄 RECONEXÃO AUTOMÁTICA
------------------------------------------------------------*/
async function reconnect(userId) {
  const old = bailey_sessions.get(userId);
  if (!old || old.reconnecting) return;

  old.reconnecting = true;
  console.log(`♻️ [${userId}] Tentando reconectar...`);

  const authPath = `./app/middleware/baileys/auth/${userId}`;
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  // Criar sessão nova
  const session = await startSocket(userId, state, saveCreds, version);

  bailey_sessions.set(userId, session);
  old.reconnecting = false;
}


/* -----------------------------------------------------------
   🔎 FUNÇÕES ÚTEIS
------------------------------------------------------------*/
function getSession(userId) {
  return bailey_sessions.get(userId);
}

function isSocketAlive(session) {
  return session?.sock?.ws?.readyState === 1;
}

function isBaileysConnected(session) {
  return session?.connected === true && isSocketAlive(session);
}


/* -----------------------------------------------------------
   ⛔ REMOVER SESSÃO
------------------------------------------------------------*/
function removeSession(userId, options = { permanent: false }) {
  const session = bailey_sessions.get(userId);
  if (!session) return;

  console.log(`🚪 [${userId}] Encerrando sessão...`);
  session.manualClose = true;

  try {
    session.sock?.ws?.close();
    session.sock?.end?.();
  } catch { }

  bailey_sessions.delete(userId);

  if (options.permanent) {
    const authPath = `./app/middleware/baileys/auth/${userId}`;
    try {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log(`🧹 [${userId}] Auth removido permanentemente.`);
    } catch { }
  }
}

async function waitForSessionState(session, timeoutMs = 15000, intervalMs = 200) {
  return new Promise(resolve => {
    let elapsed = 0;

    const interval = setInterval(() => {
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

    function cleanup() {
      clearInterval(interval);
    }
  });
};

/* -----------------------------------------------------------
   EXPORTS
------------------------------------------------------------*/
module.exports = {
  createOrGetSession,
  getSession,
  isSocketAlive,
  isBaileysConnected,
  removeSession,
  waitForSessionState
};