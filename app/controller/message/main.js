const Contact = require("../../model/contact/main");
const Message = require("../../model/message/main");
const activeWebSockets = require('../../middleware/websocket/connectionStore'); // <== Aqui

const lib = require('jarmlib');

const messageController = {};

messageController.receipt = async ({ data }) => {
  let sender = data.key.remoteJid.split("@")[0];

  if (sender == "status") return;

  let message = new Message();
  message.wa_id = data.key.id;
  message.contact_phone = sender ? sender : null;
  message.datetime = data.messageTimestamp * 1000;

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
    message.content = data.message.imageMessage.url;
  }

  if (data.message.audioMessage) {
    message.type = "audio";
    message.content = data.message.audioMessage.url;
  }

  if (data.message.videoMessage) {
    message.type = "video";
    message.content = data.message.videoMessage.url;
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

module.exports = messageController;
