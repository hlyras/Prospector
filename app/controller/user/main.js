const User = require("../../model/user/main");
const lib = require('jarmlib');
const fs = require("fs");
const path = require("path");
const fetch = require('node-fetch');

const qrcode = require('qrcode');
const { createOrGetSession, getSession, waitForSessionState, removeSession } = require('../../middleware/baileys/main');

const userController = {};

userController.login = (req, res) => {
  if (req.user) { return res.redirect("/"); }

  res.render('user/login/index', {
    user: req.user,
    message: req.flash('loginMessage')
  });
};

userController.logout = (req, res) => {
  req.logout(function (err) {
    res.redirect('/user/login');
  });
};

userController.session = async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).send({ msg: "Não autorizado!" });
  }

  try {
    const { user_id } = req.body;
    let session = getSession(user_id);

    if (!session) {
      console.log(`🚫 [${user_id}] Nenhuma sessão encontrada.`);
      return res.send({ connected: false, qrCode: null });
    }

    // 🔍 Verificação direta da conexão com o WhatsApp
    const wsAlive = session?.sock?.ws?.readyState === session?.sock?.ws?.OPEN;
    const baileysAlive = session?.sock?.state === "open";
    const isConnected = wsAlive && baileysAlive;

    if (isConnected) {
      console.log(`✅ [${user_id}] Sessão conectada (via WebSocket Baileys).`);
      return res.send({ connected: true, qrCode: null });
    }

    // Se não estiver conectado, aguarda brevemente por uma mudança (QR ou reconexão)
    const result = await waitForSessionState(session, 15000);

    const wsNowAlive = session?.sock?.ws?.readyState === session?.sock?.ws?.OPEN;
    const baileysNowAlive = session?.sock?.state === "open";
    const nowConnected = wsNowAlive && baileysNowAlive;

    if (nowConnected || result.connected) {
      console.log(`✅ [${user_id}] Sessão conectada após espera.`);
      return res.send({ connected: true, qrCode: result.qr || null });
    }

    console.log(`😴 [${user_id}] Sessão offline.`);
    return res.send({
      connected: false,
      qrCode: result.qr || null,
    });

  } catch (error) {
    console.error("💥 Erro em userController.session:", error);
    res.status(500).send({ msg: "Erro ao verificar sessão", error: error.message });
  }
};

userController.connect = async (req, res) => {
  if (!req.user?.id || req.user.id !== 1) {
    return res.status(401).send({ unauthorized: true });
  }

  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).send({ success: false, msg: "user_id ausente" });
  }

  try {
    let session = getSession(user_id);

    if (!session) {
      session = await createOrGetSession(user_id);
    }

    if (session.connected) {
      console.log('session.connected');
      return res.send({
        connected: true,
        qrCode: null,
      });
    }

    if (session.qr) {
      console.log('session.qr');
      const qrImage = await qrcode.toDataURL(session.qr);
      return res.send({
        connected: false,
        qrCode: qrImage,
      });
    }

    const result = await waitForSessionState(session, 15000);

    if (result.connected) {
      console.log('session.connected');
      return res.send({
        connected: true,
        qrCode: null,
      });
    }

    if (result.qr) {
      console.log('session.qr');
      const qrImage = await qrcode.toDataURL(result.qr);
      return res.send({
        connected: false,
        qrCode: qrImage,
      });
    }

    console.log('Sem conexão...');
    return res.send({
      connected: false,
      qrCode: null,
    });
  } catch (err) {
    console.error("Erro /admin/socket/connect:", err);

    return res.status(500).send({
      success: false,
      // msg: "Erro ao criar/obter sessão",
      error: err.message
    });
  }
};

userController.disconnect = async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).send({ success: false, msg: "user_id ausente" });
  }

  try {
    console.log(`🚪 [${user_id}] Desconectando sessão...`);
    removeSession(user_id);
    return res.send({ success: true });
  } catch (err) {
    console.error("Erro /admin/socket/disconnect:", err);
    return res.status(500).send({ success: false, error: err.message });
  }
};

userController.filter = async (req, res) => {
  try {
    let users = await User.filter({});

    res.send(users);
  } catch (error) {
    console.log(error);
    // res.send({ msg: "Ocorreu um erro ao filtrar os contatos" });
  }
};

module.exports = userController;