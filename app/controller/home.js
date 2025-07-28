const { getSocket, isReady } = require('./../middleware/baileys');

const lib = require('jarmlib');

const homeController = {};

homeController.index = async (req, res) => {
  // res.render("home/index", { qrCode: global.qrCodeBase64 || null });

  // if (!isReady()) {
  //   return res.send("⚠️ WhatsApp ainda não está conectado. Escaneie o QR no terminal.");
  // }

  // const sock = getSocket();
  // const msg = "Olá! Esta é uma mensagem de teste.";
  // const numero = "5533999999961@s.whatsapp.net";

  // sock.sendMessage(numero, { text: msg });

  // res.send("✅ Mensagem enviada via WhatsApp!");
};

module.exports = homeController;
