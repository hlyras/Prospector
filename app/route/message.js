const router = require("express").Router();
const lib = require('jarmlib');

const waEmitter = require('./../middleware/baileys/emitter');
const activeWebSockets = require('./../middleware/websocket/connectionStore'); // <== Aqui

const Message = require("../controller/message/main");

router.post('/send', lib.route.toHttps, Message.send);
// router.post('/update', lib.route.toHttps, Message.update);
// router.post('/filter', lib.route.toHttps, Message.filter);
// router.delete('/delete/:id', lib.route.toHttps, Message.delete);

// const delayResponse = (min = 2000, max = 5000) => {
//   const delay = Math.floor(Math.random() * (max - min + 1)) + min;
//   return new Promise(resolve => setTimeout(resolve, delay));
// };
// await delayResponse();

module.exports = router;