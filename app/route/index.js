const router = require("express").Router();

const User = require("./../model/user/main");

const websocketHandler = require('./../middleware/websocket/handler');
const { setSubscription } = require("./../middleware/webpush/main");

// 🏠 Página inicial
router.get('/manage', async (req, res) => {
  if (!req.user) return res.redirect('/user/login');

  return res.render('manage/index', { title: 'WA Messager' });

  // let session = getSession(req.user.id);

  // if (!session) {
  //   session = await createOrGetSession(req.user.id);
  // }

  // if (session.connected) {
  //   return res.render('home/index', {
  //     title: 'WA Messager',
  //     // isConnected: true,
  //     // qrCode: null
  //   });
  // }

  // Se ainda não conectado, gerar QR
  // if (session.qr) {
  //   const qrImage = await qrcode.toDataURL(session.qr);

  //   console.log(qrImage);

  //   return res.render('home/index', {
  //     title: 'WA Messager',
  //     isConnected: false,
  //     qrCode: qrImage
  //   });
  // }

  // // Caso o QR ainda não tenha chegado
  // res.render('home/index', {
  //   title: 'WA Messager',
  //   isConnected: false,
  //   qrCode: null,
  //   message: 'Aguardando geração do QR Code...'
  // });
});

router.get("/admin", async (req, res) => {
  if (!req.user?.id || req.user?.id != 1) {
    return res.redirect("/user/login");
  }

  let users = await User.filter({});

  res.render("admin/index", {
    title: "WA Messager",
    users,
    VAPID_PUBLIC: process.env.VAPID_PUBLIC
  });
});

router.get("/", async (req, res) => {
  console.log(req.user);
  if (!req.user) return res.redirect('/user/login');
  if (req.user.id == 1) return res.redirect('/admin');

  res.redirect('/queue');
});

// 🏠 Página inicial
router.get('/queue', async (req, res) => {
  if (!req.user) return res.redirect('/user/login');

  let user = (await User.filter({
    props: ["user.name", "user.phone"],
    strict_params: {
      keys: ['id'],
      values: [req.user.id]
    }
  }))[0];

  let users = await User.filter({});

  return res.render('home/index', { title: 'WA Messager', user, users });
});

router.post("/webpush/subscribe", (req, res) => {
  if (!req.body?.endpoint) {
    return res.sendStatus(400);
  }

  setSubscription(req.body);
  res.sendStatus(200);
});

router.ws('/ws', websocketHandler);

router.use("/user", require("./user"));
router.use("/contact", require("./contact"));
router.use("/message", require("./message"));
router.use("/customer", require("./customer"));
router.use("/speech", require("./speech"));

module.exports = router;