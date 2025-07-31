const router = require("express").Router();
const lib = require('jarmlib');

const waEmitter = require('./../middleware/baileys/emitter');

const Message = require("./../controller/message/main");

// router.post('/send', lib.route.toHttps, Message.send);

waEmitter.on('received-message', Message.receipt);

module.exports = router;