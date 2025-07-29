const router = require("express").Router();

const wa = require('./../middleware/baileys/main');
const websocketHandler = require('./../middleware/websocket/handler');
const waEmitter = require('./../middleware/baileys/emitter');
const wsEmitter = require('./../middleware/websocket/emitter');
const activeWebSockets = require('./../middleware/websocket/connectionStore'); // <== Aqui

wa.connect(); // só vai conectar se não estiver conectado

router.get("/", async (req, res) => {
  res.render("home/index", {
    title: "WA Messager",
    isConnected: wa.isConnected()
  });
});

router.ws('/ws', websocketHandler);

router.get('/qrcode', (req, res) => {
  return res.send({
    qrcode: !wa.isConnected() ? wa.getQRCode() : null,
    isConnected: wa.isConnected()
  });
});

// Envia mensagem para um número
router.post('/send', async (req, res) => {
  const { number, message } = req.body;
  if (!wa.isConnected() || !sock) return res.status(500).send('❌ WhatsApp não conectado.');
  if (!number || !message) return res.status(400).send('⚠️ Envie number e message no body.');

  const jid = number + '@s.whatsapp.net';
  try {
    await wa.getSocket().sendMessage(jid, { text: message });
    res.send('📤 Mensagem enviada!');
  } catch (err) {
    console.error('Erro ao enviar:', err);
    res.status(500).send('❌ Erro ao enviar mensagem.');
  }
});

waEmitter.on('received-message', ({ sender, content, profile_picture, raw }) => {
  console.log(`📥 Mensagem de ${sender}: ${content}`);
  console.log('received-message', content);

  for (const [sessionID, ws] of activeWebSockets.entries()) {
    console.log('sessionID', sessionID);
    if (ws.readyState === 1) { // ws.OPEN
      ws.send(JSON.stringify({ sender, content, profile_picture, raw }));
    }
  };
});

router.use("/lead", require("./lead"));

module.exports = router;