const Contact = require("../../model/contact/main");
const ContactList = require("../../model/contact/list");
const Message = require("../../model/message/main");
const Queue = require("../../model/queue/main");
const { enqueueMessage } = require("../../middleware/queue/main");
const { getSession } = require('../../middleware/baileys/main');
const { getDownloadPath, getPublicPath } = require("../../middleware/baileys/download");
const downloadProfilePicture = require("../../middleware/baileys/profile");
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { ChatGPTTranscription } = require('../../middleware/chatgpt/main');

const fs = require("fs");
const path = require("path");

const lib = require('jarmlib');

const activeWebSockets = require('../../middleware/websocket/connectionStore');

const messageController = {};

messageController.send = async (req, res) => {
  if (!req.user || req.user.id != 1) {
    return res.send({ unauthorized: "Você não tem permissão para realizar essa ação!" });
  }

  const message = {};
  const options = {};
  const { type, content, jid, reply } = req.body;

  // Verifica contato
  const contact = (await Contact.filter({
    strict_params: { keys: ['jid'], values: [jid] }
  }))[0];

  if (!contact) return res.send({ msg: "Contato não encontrado!" });
  if (!contact.seller_id) return res.send({ msg: "Contato não está sendo atendido!" });

  const session = getSession(contact.seller_id);

  if (!session?.sock || !session.connected) {
    return res.send({ msg: "Sessão do usuário não conectada!" });
  }

  // Tratamento de reply
  if (reply) {
    const r = JSON.parse(reply.message);

    options.quoted = {
      key: {
        id: r.key.id,
        remoteJid: r.key.remoteJid,
        fromMe: r.key.fromMe
      },
      message: r.message
    };
  }

  // Tratamento por tipo
  switch (type) {
    case "text":
      message.text = content;
      break;

    case "image":
      if (!content?.buffer) return res.status(400).send({ msg: "Imagem inválida" });
      message.image = content.buffer;
      message.caption = content.caption || "";
      break;

    case "audio":
      if (!content?.buffer) return res.status(400).send({ msg: "Áudio inválido" });
      message.audio = content.buffer;
      message.ptt = content.ptt ?? true;
      break;

    case "video":
      if (!content?.buffer) return res.status(400).send({ msg: "Vídeo inválido" });
      message.video = content.buffer;
      message.caption = content.caption || "";
      break;

    case "document":
      if (!content?.buffer) return res.status(400).send({ msg: "Documento inválido" });
      message.document = content.buffer;
      message.mimetype = content.mimetype;
      message.fileName = content.filename;
      break;

    default:
      return res.status(400).send({ msg: "Tipo inválido" });
  }

  try {
    await session.sock.sendMessage(jid, message, options);
    return res.send({ success: true });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: "Erro ao enviar mensagem" });
  }
};

messageController.react = async (req, res) => {
  // Verifica contato
  const contact = (await Contact.filter({
    strict_params: { keys: ['jid'], values: [req.body.jid] }
  }))[0];

  if (!contact) return res.send({ msg: "Contato não encontrado!" });
  if (contact.jid != req.body.jid) return res.send({ msg: "Contato diferente do enviado!" });
  if (!contact.seller_id) return res.send({ msg: "Contato não está sendo atendido!" });

  const session = getSession(contact.seller_id);

  if (!session?.sock || !session.connected) {
    return res.send({ msg: "Sessão do usuário não conectada!" });
  }

  let response = await session.sock.sendMessage(contact.jid, {
    react: {
      text: req.body.content,
      key: req.body.key,
      participant: req.body.participant ?
        req.body.participant : null
    }
  });
  res.send(response);
};

messageController.receipt = async ({ data }) => {
  // REMOVIDO: impedía receber imagem/áudio
  // if (!data.message.extendedTextMessage && !data.message.conversation) { return; }
  // console.log('data', data);

  const isGroup =
    data.key.remoteJid?.endsWith("@g.us") ||
    data.key.remoteJidAlt?.endsWith("@g.us");
  if (isGroup) return;

  const correctJid =
    (data.key.remoteJid?.endsWith("s.whatsapp.net") && data.key.remoteJid) ||
    (data.key.remoteJidAlt?.endsWith("s.whatsapp.net") && data.key.remoteJidAlt) ||
    null;

  if (!correctJid) return;

  let contact = (await Contact.findByJid(correctJid))[0] || null;

  if (!contact) {
    contact = new Contact();
    contact.autochat = correctJid;
    contact.datetime = lib.date.timestamp.generate();
    contact.autochat = 0;
    contact.flow_step = 0;
    contact.created = 0;
    contact.notify = 1;
  }

  if (data.key.fromMe) {
    let contact_list = (await ContactList.filter({
      strict_params: {
        keys: ["jid"],
        values: [correctJid]
      },
      limit: 1
    }))[0];

    if (contact_list?.segment && contact_list?.status != 'Concluído') {
      contact.segment = contact_list.segment;
      contact.business = contact_list.business;

      let cl = new ContactList();
      cl.jid = contact.jid;
      cl.sent_datetime = lib.date.timestamp.generate();
      cl.status = "Concluído";
      await cl.update();
    }
  }

  let message = new Message();
  message.wa_id = data.key.id;
  message.jid = contact.jid;
  message.from_me = data.key.fromMe ? 1 : 0;
  message.datetime = data.messageTimestamp * 1000;
  message.raw = JSON.stringify(data);

  const msg = data.message;

  //
  // -------------------------
  // 🟩 1. TEXTO
  // -------------------------
  if (msg.conversation) {
    message.type = "text";
    message.content = msg.conversation;
  }

  if (msg.extendedTextMessage) {
    message.type = "text";
    message.content = msg.extendedTextMessage.text;
  }

  //
  // -------------------------
  // 🟩 2. IMAGEM
  // -------------------------
  if (msg.imageMessage) {
    message.type = "image";

    const filename = `image_${Date.now()}.jpg`;

    // Caminho real no disco (para fs)
    const absolutePath = getDownloadPath("image", filename);

    // Baixar arquivo
    const buffer = await downloadMediaMessage(
      { message: data.message },
      "buffer",
      {}
    );

    // Salvar fisicamente
    fs.writeFileSync(absolutePath, buffer);

    // Caminho salvo no banco (usado pelo front)
    message.content = getPublicPath("image", filename);
    message.caption = msg.imageMessage.caption || null;
  }

  //
  // -------------------------
  // 🟩 3. ÁUDIO
  // -------------------------
  if (msg.audioMessage) {
    message.type = "audio";

    const ext = "ogg";
    const filename = `audio_${Date.now()}.${ext}`;

    const absolutePath = getDownloadPath("audio", filename);

    const buffer = await downloadMediaMessage(
      { message: data.message },
      "buffer",
      {}
    );

    fs.writeFileSync(absolutePath, buffer);

    // 🔥 TRANSCRIÇÃO AUTOMÁTICA
    try {
      const transcript = await ChatGPTTranscription(absolutePath);

      if (transcript) {
        message.type = "text";
        message.content = transcript;
      } else {
        message.type = "audio";
        message.content = getPublicPath("audio", filename);
      }

    } catch (err) {
      console.error("Erro ao transcrever:", err);
    }
  }

  //
  // -------------------------
  // 🟩 4. VÍDEO
  // -------------------------
  if (msg.videoMessage) {
    message.type = "video";

    const filename = `video_${Date.now()}.mp4`;
    const absolutePath = getDownloadPath("video", filename);

    const buffer = await downloadMediaMessage(
      { message: data.message },
      "buffer",
      {}
    );

    fs.writeFileSync(absolutePath, buffer);

    message.content = getPublicPath("video", filename);
    message.caption = msg.videoMessage.caption || null;
  }

  //
  // -------------------------
  // 🟩 5. DOCUMENTO (PDF, DOCX, XLSX, etc.)
  // -------------------------
  if (msg.documentMessage) {
    message.type = "document";

    // Pega o nome real do arquivo ou gera um
    const original = msg.documentMessage.fileName || `file_${Date.now()}`;
    const ext = path.extname(original) || ".bin";

    const filename = `document_${Date.now()}${ext}`;
    const absolutePath = getDownloadPath("document", filename);

    const buffer = await downloadMediaMessage(
      { message: data.message },
      "buffer",
      {}
    );

    fs.writeFileSync(absolutePath, buffer);

    message.content = getPublicPath("document", filename);
    message.filename = original;
  }

  try {
    if (msg.reactionMessage) {
      message.type = "reaction";
      message.target_id = msg.reactionMessage.key?.id || null;
      message.content = msg.reactionMessage.text;

      if (!data.message.reactionMessage.text) {
        let reaction_message = (await Message.filter({
          strict_params: {
            keys: ["jid", "type", "target_id", "from_me"],
            values: [contact.jid, "reaction", message.target_id, data.key.fromMe ? 1 : 0]
          }
        }))[0];

        // ----------
        // Erro ao encontrar reaction_message.wa_id porque o filter pode estar errado.
        // ----------

        Message.delete(reaction_message.wa_id);
      } else {
        let reaction_message = (await Message.filter({
          strict_params: {
            keys: ["jid", "type", "target_id", "from_me"],
            values: [contact.jid, "reaction", message.target_id, data.key.fromMe ? 1 : 0]
          }
        }))[0];

        let message_create = await message.create();
        if (message_create.err) { console.log(message_create.err); }
        message.id = message_create.insertId;

        if (reaction_message) {
          Message.delete(reaction_message.wa_id);
        }
      }
    }

    if (!msg.reactionMessage) {
      let created = await message.create();
      if (created.err) console.log(created.err);
      message.id = created.insertId;
    }

    if (contact?.autochat == 1 && !data.key.fromMe && message.type === "text") {
      let queue_contact = (await Queue.filter({
        strict_params: {
          keys: ['contact_jid'],
          values: [contact.jid]
        },
        in_params: {
          keys: ['status'],
          values: [[['Pendente', 'Processando']]]
        }
      }))[0];

      if (!queue_contact) {
        enqueueMessage({
          contact_jid: contact.jid,
          priority: parseInt(contact.flow_step) + 1,
          user_id: contact.seller_id
        });
      }
    }

    let notify_alert = false;

    if (!data.key.fromMe) {
      let contact_notify = new Contact();
      contact_notify.jid = contact.jid;
      contact_notify.notify = 1;
      contact_notify.status = contact.status;

      contact_notify.update();

      if (["interessado", "demonstração", "acompanhar", "importante", "cliente", "pessoal"]
        .includes(contact.status)) {
        notify_alert = {
          status: contact.status,
          jid: contact.jid
        };
      }
    }

    for (const [sessionID, ws] of activeWebSockets.entries()) {
      if (ws.readyState === 1) {

        ws.send(JSON.stringify({
          data,
          contact,
          message,
          notify_alert
        }));
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
      strict_params: { keys: [], values: [] },
      order_params: [["message.datetime", "desc"]],
      limit: 200
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