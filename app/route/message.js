const router = require("express").Router();
const lib = require('jarmlib');

const waEmitter = require('./../middleware/baileys/emitter');
const Message = require("./../controller/message/main");

waEmitter.on('received-message', Message.receipt);

router.post('/send', lib.route.toHttps, Message.send);
router.post('/filter', lib.route.toHttps, Message.filter);

module.exports = router;