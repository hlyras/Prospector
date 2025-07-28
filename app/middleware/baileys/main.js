const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const waEmitter = require('./emitter');

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

  async connect(/*sessionID*/) {
    if (this.sock) {
      console.log('⚠️ Já existe uma sessão ativa.');
      return this.sock;
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.authPath);

    this.sock = makeWASocket({
      auth: state,
      getMessage: async () => ({ conversation: 'Mensagem não encontrada localmente.' }),
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCodeString = qr;
        console.log('📲 Escaneie o QR Code para conectar.');
      }

      if (connection === 'close') {
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        console.log('❌ Conexão encerrada:', lastDisconnect?.error?.message);
        this.connected = false;
        this.sock = null;

        if (shouldReconnect) {
          console.log('🔄 Reconectando...');
          this.connect(this.sessionID);
        } else {
          console.log('📴 Sessão finalizada, necessário escanear QR novamente.');
        }
      }

      if (connection === 'open') {
        console.log('✅ Conectado com sucesso!');
        this.connected = true;
        this.qrCodeString = null;
      }
    });

    this.sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const sender = msg.key.remoteJid;
        const type = Object.keys(msg.message)[0];
        let content = '';

        if (type === 'conversation') {
          content = msg.message.conversation;
        } else if (type === 'extendedTextMessage') {
          content = msg.message.extendedTextMessage.text;
        } else {
          content = '[Mensagem não textual]';
        }

        // console.log(`📥 Mensagem de ${sender}: ${content}`);

        // Emitir evento do WhatsApp para o sistema
        console.log('Emitindo evento received-message...', {
          sender, content
        });

        waEmitter.emit('received-message', {
          sender,
          content,
          raw: msg
        });
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