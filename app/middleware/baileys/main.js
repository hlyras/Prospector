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

    // process all events com ev.process
    this.sock.ev.process(async (events) => {
      if (events['creds.update']) {
        await saveCreds();
      }

      if (events['connection.update']) {
        const { connection, lastDisconnect, qr } = events['connection.update'];

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
            this.connect();
          } else {
            console.log('📴 Sessão finalizada, necessário escanear QR novamente.');
          }
        }

        if (connection === 'open') {
          console.log('✅ Conectado com sucesso!');
          this.connected = true;
          this.qrCodeString = null;
        }
      }

      if (events['messages.upsert']) {
        const { messages } = events['messages.upsert'];
        for (const msg of messages) {
          if (!msg.message) continue;

          const data = msg;
          waEmitter.emit('received-message', { data });
        }
      }

      // if (events['message-receipt.update']) {
      //   console.log('📩 RECEIPT update:', JSON.stringify(events['message-receipt.update'], null, 2));
      // }

      // if (events['messages.update']) {
      //   console.log('📤 MESSAGE STATUS update:', JSON.stringify(events['messages.update'], null, 2));
      // }

      // (opcional) Adicione outros eventos que queira monitorar:
      // if (events['message-receipt.update']) {
      //   console.log(events['message-receipt.update'])
      // }

      // if (events['presence.update']) {
      //   console.log('👤 PRESENCE update:', events['presence.update']);
      // }

      // if (events['chats.update']) {
      //   console.log('💬 CHATS update:', events['chats.update']);
      // }

      // if (events['contacts.update']) {
      //   console.log('📇 CONTACTS update:', events['contacts.update']);
      // }

      // if (events['messages.reaction']) {
      //   console.log('❤️ REACTION:', events['messages.reaction']);
      // }
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