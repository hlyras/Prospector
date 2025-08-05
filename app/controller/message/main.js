const Contact = require("../../model/contact/main");
const Message = require("../../model/message/main");
const activeWebSockets = require('../../middleware/websocket/connectionStore');
const { getProfilePicWithTimeout } = require('../../middleware/baileys/controller');

const lib = require('jarmlib');

const wa = require('../../middleware/baileys/main');
const { downloadMedia } = require('../../middleware/baileys/controller');

const messageController = {};

messageController.receipt = async ({ data }) => {
  let sender = data.key.remoteJid.split("@")[0];
  if (sender == "status") return;

  const isGroup = data.key.remoteJid.split("@")[1] == "g.us" ? true : false;

  let contact = (await Contact.findByJid(data.key.remoteJid))[0] || null;

  if (!contact) {
    let contact = new Contact();
    contact.jid = data.key.remoteJid;
    contact.autochat = 0;
    contact.created = 0;

    let profile_picture = await getProfilePicWithTimeout(wa.getSocket(), data.key.remoteJid);
    contact.profile_picture = profile_picture;
    data.profile_picture = profile_picture;

    if (isGroup) {
      const metadata = await wa.getSocket().groupMetadata(data.key.remoteJid);
      contact.name = metadata.subject ? metadata.subject : null;
    } else {
      contact.business = !data.key.fromMe && data.pushName ? data.pushName : null;
      contact.name = !data.key.fromMe && data.pushName ? data.pushName : null;
    }

    try { await contact.create(); }
    catch (error) { console.log("User not created: ", error); }
  }

  if (contact && !contact.name && !data.key.fromMe) {
    let contact = new Contact();
    contact.jid = data.key.remoteJid;

    if (isGroup) {
      const metadata = await wa.getSocket().groupMetadata(data.key.remoteJid);
      contact.name = metadata.subject ? metadata.subject : null;
    } else {
      contact.business = !data.key.fromMe && data.pushName ? data.pushName : null;
      contact.name = !data.key.fromMe && data.pushName ? data.pushName : null;
    }

    try { await contact.update(); }
    catch (error) { console.log("User not updated: ", error); }
  }

  let message = new Message();
  message.wa_id = data.key.id;
  message.jid = data.key.remoteJid;
  message.participant = isGroup ? data.key.participant : null;
  message.from_me = data.key.fromMe ? 1 : 0;
  message.datetime = data.messageTimestamp * 1000;
  message.raw = JSON.stringify(data);

  if (data.message.extendedTextMessage) {
    message.type = "text";
    message.content = data.message.extendedTextMessage.text;
  }

  if (data.message.conversation) {
    message.type = "conversation";
    message.content = data.message.conversation;
  }

  if (data.message.imageMessage) {
    message.type = "image";
    message.content = await downloadMedia(data, wa.getSocket());
  }

  if (data.message.audioMessage) {
    message.type = "audio";
    message.content = await downloadMedia(data, wa.getSocket());
  }

  if (data.message.videoMessage) {
    message.type = "video";
    message.content = await downloadMedia(data, wa.getSocket());
  }

  try {
    let message_create = await message.create();
    if (message_create.err) { console.log(message_create.err); }
    message.id = message_create.insertId;

    for (const [sessionID, ws] of activeWebSockets.entries()) {
      if (ws.readyState === 1) { // ws.OPEN
        ws.send(JSON.stringify({ data, message }));
      }
    };
  } catch (error) {
    console.log(error);
  }
};

messageController.filter = async (req, res) => {
  try {
    let message_options = {
      props: [],
      strict_params: { keys: [], values: [] }
    };

    lib.Query.fillParam("message.jid", req.body.jid, message_options.strict_params);

    let messages = await Message.filter(message_options);

    if (!messages.length) {
      return res.send(messages);
    }

    res.send(messages);
  } catch (error) {
    console.log(error);
    res.send({ msg: "Ocorreu um erro ao filtrar os contatos" });
  }
};

module.exports = messageController;
