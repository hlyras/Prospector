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
        if (!msg.message) continue;

        const data = msg;

        const getProfilePicWithTimeout = (jid, timeout = 5000) => {
          return Promise.race([
            this.sock.profilePictureUrl(jid, 'image'),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout ao buscar foto de perfil')), timeout)
            )
          ]);
        };

        let profile_picture = null;
        profile_picture = await getProfilePicWithTimeout(msg.key.remoteJid);
        data.profile_picture = profile_picture;

        // msg.key.fromMe
        // console.log('DATA: ', data);

        // if (msg.key.fromMe) {
        //   // message.extendedTextMessage.contextInfo.stanzaId
        //   console.log('FROM ME: ', data);
        //   continue;
        // }

        waEmitter.emit('received-message', { data });
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