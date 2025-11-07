const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const waEmitter = require('./emitter');
const fs = require('fs');
const path = require('path');

// 🧭 Mapa global: armazena todas as sessões ativas
const bailey_sessions = new Map();

class WhatsAppSession {
  constructor(userId, baseAuthPath = './app/middleware/baileys/auth') {
    this.userId = userId;
    this.authPath = path.join(baseAuthPath, userId.toString());
    this.sock = null;
    this.connected = false;
    this.qrCodeString = null;
  }

  async connect() {
    // Cria pasta de autenticação do usuário, se não existir
    if (!fs.existsSync(this.authPath)) {
      fs.mkdirSync(this.authPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
    const { version } = await fetchLatestBaileysVersion();

    console.log(`🔌 Iniciando sessão do userId=${this.userId} | Baileys v${version.join('.')}`);

    this.sock = makeWASocket({
      version,
      auth: state,
      browser: ["Ghost", "Chrome", "0.0.1"],
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 45_000,
      defaultQueryTimeoutMs: 60_000,
      getMessage: async () => undefined,
      shouldSyncHistoryMessage: () => false,
      emitOwnEvents: true,
      retryRequestDelayMs: 0,
    });

    // Desativa comportamento padrão de presença e leitura
    this.sock.sendPresenceUpdate = async () => { };
    this.sock.readMessages = async () => { };
    this.sock.sendReceipts = async () => { };
    this.sock.chatModify = async () => { };

    this.sock.ev.process(async (events) => {
      // Salva credenciais
      if (events['creds.update']) await saveCreds();

      // Conexão
      if (events['connection.update']) {
        const { connection, lastDisconnect, qr } = events['connection.update'];

        if (qr) {
          const qrcode = require('qrcode-terminal');
          qrcode.generate(qr, { small: true });
          console.log(`📲 [${this.userId}] Escaneie este QR Code com seu WhatsApp!`);
          this.qrCodeString = qr;
        }

        if (connection === 'open') {
          console.log(`✅ [${this.userId}] Conectado no modo GHOST`);
          this.connected = true;
          this.qrCodeString = null;
        }

        if (connection === 'close') {
          const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
          const shouldReconnect = code !== DisconnectReason.loggedOut;
          console.log(`❌ [${this.userId}] Conexão encerrada: ${lastDisconnect?.error?.message}`);
          this.connected = false;
          this.sock = null;

          // Remove do Map global
          bailey_sessions.delete(this.userId);

          if (shouldReconnect) {
            console.log(`🔄 [${this.userId}] Tentando reconectar em 10s...`);
            setTimeout(() => this.connect(), 10_000);
          } else {
            console.log(`📴 [${this.userId}] Sessão finalizada, necessário escanear QR novamente.`);
          }
        }
      }

      // Evento de mensagens
      if (events['messages.upsert']) {
        const { messages } = events['messages.upsert'];
        for (const msg of messages) {
          if (!msg.message) continue;
          // 🔗 Envia o userId junto no evento
          waEmitter.emit('received-message', {
            userId: this.userId,
            data: msg
          });
        }
      }
    });

    return this.sock;
  }

  getSocket() {
    return this.sock;
  }

  getQRCode() {
    return this.qrCodeString;
  }

  isConnected() {
    return this.connected;
  }

  async close() {
    try {
      if (this.sock) await this.sock.ws.close();
      this.connected = false;
      bailey_sessions.delete(this.userId);
      console.log(`🔚 [${this.userId}] Sessão encerrada manualmente`);
    } catch (err) {
      console.error(`Erro ao encerrar sessão do userId=${this.userId}:`, err);
    }
  }
}

// 🔧 Função auxiliar: cria ou retorna sessão existente
async function createOrGetSession(userId) {
  // Se já existir uma sessão ativa, encerra antes
  if (bailey_sessions.has(userId)) {
    console.log(`♻️ [${userId}] Sessão antiga detectada. Encerrando...`);
    const old = bailey_sessions.get(userId);
    await old.close();
  }

  const session = new WhatsAppSession(userId);
  await session.connect();
  bailey_sessions.set(userId, session);

  return session;
}

// 🔍 Recupera sessão existente (se precisar em outras partes do sistema)
function getSession(userId) {
  return bailey_sessions.get(userId);
}

module.exports = {
  createOrGetSession,
  getSession,
  bailey_sessions,
};