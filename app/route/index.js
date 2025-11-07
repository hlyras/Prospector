const router = require("express").Router();

const User = require("./../model/user/main");

const qrcode = require('qrcode');
const { createOrGetSession, getSession } = require('../middleware/baileys/main');

const websocketHandler = require('./../middleware/websocket/handler');

router.get("/admin", async (req, res) => {
  if (!req.user?.id || req.user?.id != 1) {
    return res.redirect("/user/login");
  }

  let users = await User.filter({});

  let session = getSession(req.user.id);

  if (!session) {
    session = await createOrGetSession(req.user.id);
  }

  res.render("admin/index", {
    title: "WA Messager",
    isConnected: true,
    users
  });
});

// 🏠 Página inicial
router.get('/', async (req, res) => {
  if (!req.user) return res.redirect('/user/login');

  let session = getSession(req.user.id);

  if (!session) {
    session = await createOrGetSession(req.user.id);
  }

  if (session.connected) {
    return res.render('home/index', {
      title: 'WA Messager',
      isConnected: true,
      qrCode: null
    });
  }

  // Se ainda não conectado, gerar QR
  if (session.qr) {
    const qrImage = await qrcode.toDataURL(session.qr);

    console.log(qrImage);

    return res.render('home/index', {
      title: 'WA Messager',
      isConnected: false,
      qrCode: qrImage
    });
  }

  // Caso o QR ainda não tenha chegado
  res.render('home/index', {
    title: 'WA Messager',
    isConnected: false,
    qrCode: null,
    message: 'Aguardando geração do QR Code...'
  });
});

router.ws('/ws', websocketHandler);

router.use("/user", require("./user"));
router.use("/contact", require("./contact"));
router.use("/message", require("./message"));
router.use("/customer", require("./customer"));

module.exports = router;