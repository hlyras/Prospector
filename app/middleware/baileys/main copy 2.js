const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const waEmitter = require('./emitter');
const fs = require('fs');
const path = require('path');

let instance = null;

class WhatsAppSession {
  constructor(authPath = './app/middleware/baileys/auth') {
    if (instance) return instance;

    this.authPath = authPath;
    this.sock = null;
    this.qrCodeString = null;
    this.connected = false;
    instance = this;
  }

  async connect() {
    const authExists = fs.existsSync(path.join(this.authPath, 'creds.json'));
    if (!authExists) console.log('⚙️ Nenhuma credencial encontrada, um novo QR será gerado.');

    const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
    const { version } = await fetchLatestBaileysVersion();
    console.log('Baileys version:', version);

    this.sock = makeWASocket({
      version,
      auth: state,
      browser: ["Ghost", "Chrome", "0.0.1"],
      syncFullHistory: false, // ❌ não sincroniza nada
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false, // ❌ não envia presença "online"
      connectTimeoutMs: 45_000,
      defaultQueryTimeoutMs: 60_000,
      getMessage: async () => undefined, // ❌ não tenta buscar mensagens antigas
      shouldSyncHistoryMessage: () => false, // ❌ ignora sync
      emitOwnEvents: true, // ❌ não emite eventos do próprio número
      retryRequestDelayMs: 0, // ❌ não reenvia nada
    });

    // Evita ACK e PRESENCE (não responde nada ao servidor)
    this.sock.sendPresenceUpdate = async () => { }; // ⚰️ desativa presence
    this.sock.readMessages = async () => { }; // ⚰️ desativa leitura
    this.sock.sendReceipts = async () => { }; // ⚰️ desativa "mensagem entregue"
    this.sock.chatModify = async () => { }; // ⚰️ não altera status do chat

    this.sock.ev.process(async (events) => {
      if (events['creds.update']) await saveCreds();

      if (events['connection.update']) {
        const { connection, lastDisconnect, qr } = events['connection.update'];

        if (qr) {
          const qrcode = require('qrcode-terminal');
          qrcode.generate(qr, { small: true });
          console.log('📲 Escaneie este QR Code com seu WhatsApp!');
        }

        if (connection === 'open') {
          console.log('✅ Conectado no modo GHOST');
          this.connected = true;
          this.qrCodeString = null;
        }

        if (connection === 'close') {
          const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
          const shouldReconnect = code !== DisconnectReason.loggedOut;
          console.log('❌ Conexão encerrada:', lastDisconnect?.error?.message);
          this.connected = false;
          this.sock = null;

          if (shouldReconnect) {
            console.log('🔄 Tentando reconectar em 10s...');
            setTimeout(() => this.connect(), 10_000);
          } else {
            console.log('📴 Sessão finalizada, necessário escanear QR novamente.');
          }
        }
      }

      // ✅ ÚNICO EVENTO ATIVO
      if (events['messages.upsert']) {
        const { messages } = events['messages.upsert'];
        for (const msg of messages) {
          if (!msg.message) continue;
          waEmitter.emit('received-message', { data: msg });
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
}

module.exports = new WhatsAppSession();