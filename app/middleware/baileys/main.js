const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
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

  async connect(/*sessionID*/) {
    const authExists = fs.existsSync(path.join(this.authPath, 'creds.json'));
    if (!authExists) {
      console.log('⚙️ Nenhuma credencial encontrada, um novo QR será gerado.');
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.authPath);

    const { fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

    const { version } = await fetchLatestBaileysVersion();

    console.log('Baileys version: ', version);

    this.sock = makeWASocket({
      version,                    // pega a versão mais recente do WhatsApp
      auth: state,
      browser: ["Chrome (Windows)", "Chrome", "22.20.0"],
      syncFullHistory: true, // 👈 importante!
    });

    // process all events com ev.process
    this.sock.ev.process(async (events) => {
      if (events['creds.update']) {
        await saveCreds();
      }

      if (events['connection.update']) {
        const { connection, lastDisconnect, qr } = events['connection.update'];

        if (qr) {
          // this.qrCodeString = qr;        // salva a string do QR
          // console.log('📲 QR Code gerado! Use um gerador de QR ou uma biblioteca para exibir.');
          const qrcode = require('qrcode-terminal');

          // dentro do if(qr)
          qrcode.generate(qr, { small: true });
          console.log('📲 Escaneie este QR Code com seu WhatsApp!');
        }

        if (connection === 'open') {
          console.log('✅ Conectado com sucesso!');
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
            console.log('🔄 Reconectando em 5s...');
            setTimeout(() => this.connect(), 5000);
          } else {
            console.log('📴 Sessão finalizada, necessário escanear QR novamente.');
          }
        }
      }

      if (events['messages.upsert']) {
        const { messages } = events['messages.upsert'];
        for (const msg of messages) {
          if (!msg.message) continue;

          // if (msg.message.imageMessage) {
          //   await this.sock.sendMessage(
          //     msg.key.remoteJid,
          //     { text: "okok" },
          //     { quoted: msg }
          //   );
          // }

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