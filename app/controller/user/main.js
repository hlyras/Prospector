const User = require("../../model/user/main");
const lib = require('jarmlib');
const fs = require("fs");
const path = require("path");
const fetch = require('node-fetch');

const qrcode = require('qrcode');
const { createOrGetSession, getSession, waitForSessionState, removeSession } = require('../../middleware/baileys/main');

const userController = {};

/* ========================= LOGIN ========================= */

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

/* ========================= SESSÃO ========================= */

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

    /* 🔍 Verificação direta do estado atual */
    const wsAlive = session?.sock?.ws?.readyState === session?.sock?.ws?.OPEN;
    const baileysAlive = session?.sock?.state === "open";
    const isConnected = wsAlive && baileysAlive;

    if (isConnected) {
      console.log(`✅ [${user_id}] Sessão conectada.`);
      return res.send({ connected: true, qrCode: null });
    }

    /* 🔄 Aguardar evento de mudança (QR ou reconexão) */
    let result = null;

    if (typeof waitForSessionState === "function") {
      result = await waitForSessionState(session, 15000);
    } else {
      console.warn("⚠ waitForSessionState NÃO existe. QR pode falhar.");
      result = { connected: false, qr: session.qr || null };
    }

    /* 🔄 Reavaliar após aguardar */
    const wsNowAlive = session?.sock?.ws?.readyState === session?.sock?.ws?.OPEN;
    const baileysNowAlive = session?.sock?.state === "open";
    const nowConnected = wsNowAlive && baileysNowAlive;

    if (nowConnected || result?.connected) {
      console.log(`✅ [${user_id}] Sessão conectada após espera.`);
      return res.send({ connected: true, qrCode: null });
    }

    /* 📡 Se QR aparecer */
    if (result?.qr) {
      const qrImage = await qrcode.toDataURL(result.qr);
      console.log(`🔄 [${user_id}] QR gerado.`);
      return res.send({ connected: false, qrCode: qrImage });
    }

    /* 🚫 Continua desconectado */
    console.log(`😴 [${user_id}] Sessão offline.`);
    return res.send({ connected: false, qrCode: null });

  } catch (error) {
    console.error("💥 Erro em userController.session:", error);
    res.status(500).send({ msg: "Erro ao verificar sessão", error: error.message });
  }
};

/* ========================= CONECTAR ========================= */

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
      return res.send({ connected: true, qrCode: null });
    }

    if (session.qr) {
      const qrImage = await qrcode.toDataURL(session.qr);
      console.log('session.qr');
      return res.send({ connected: false, qrCode: qrImage });
    }

    let result = null;

    if (typeof waitForSessionState === "function") {
      result = await waitForSessionState(session, 15000);
    } else {
      result = { connected: false, qr: session.qr || null };
    }

    if (result.connected) {
      console.log('session.connected');
      return res.send({ connected: true, qrCode: null });
    }

    if (result.qr) {
      const qrImage = await qrcode.toDataURL(result.qr);
      console.log('session.qr');
      return res.send({ connected: false, qrCode: qrImage });
    }

    console.log('Sem conexão...');
    return res.send({ connected: false, qrCode: null });

  } catch (err) {
    console.error("Erro /admin/socket/connect:", err);

    return res.status(500).send({
      success: false,
      error: err.message
    });
  }
};

/* ========================= DESCONECTAR ========================= */

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

/* ========================= LISTA USUÁRIOS ========================= */

userController.filter = async (req, res) => {
  try {
    const users = await User.filter({});
    res.send(users);
  } catch (error) {
    console.log(error);
  }
};

module.exports = userController;