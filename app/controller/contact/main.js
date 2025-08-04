const lib = require('jarmlib');

const wa = require('../../middleware/baileys/main');
const { getProfilePicWithTimeout } = require('../../middleware/baileys/controller');

const Contact = require("../../model/contact/main");
const Message = require("../../model/message/main");

const contactController = {};

contactController.create = async (req, res) => {
  let contact = new Contact();
  contact.business = req.body.business;
  contact.phone = req.body.phone;
  contact.participant = req.body.participant;
  contact.name = req.body.name;
  contact.autochat = !isNaN(req.body.autochat)
    ? parseInt(req.body.autochat) : 0;
  contact.created = 1;

  const jid = `${contact.phone}@s.whatsapp.net`;

  let profile_picture = null;
  profile_picture = await getProfilePicWithTimeout(wa.getSocket(), jid);
  contact.profile_picture = profile_picture;

  try {
    let contact_create_response = await contact.create();
    if (contact_create_response.err) {
      return res.status(500).send({
        msg: contact_create_response.err
      });
    }

    if (contact.autochat) {
      if (wa.isConnected()) {
        await wa.getSocket().sendMessage(jid, { text: `Olá é da ${contact.business}` });
      } else {
        console.warn("WhatsApp não está pronto para enviar mensagens.");
      }
    }

    res.status(201).send({ done: "Contato criado com sucesso!", contact });
  } catch (error) {
    console.error("Erro ao criar contact:", error);
    res.status(500).send({ msg: "Erro ao criar contact.", error });
  }
};

contactController.update = async (req, res) => {
  let contact = new Contact();
  contact.phone = req.body.phone;
  contact.business = req.body.business;
  contact.name = req.body.name;
  contact.autochat = req.body.autochat;
  contact.profile_picture = req.body.profile_picture;

  try {
    let contact_update_response = await contact.update();
    if (contact_update_response.err) {
      return res.status(500).send({ msg: contact_update_response.err });
    }

    if (contact.autochat) {
      if (wa.isConnected()) {
        const jid = contact.phone + '@s.whatsapp.net';
        await wa.getSocket().sendMessage(jid, { text: `Olá é da ${contact.business}` });
      } else {
        console.warn("WhatsApp não está pronto para enviar mensagens.");
      }
    }

    res.status(201).send({ done: "Contato criado com sucesso!" });
  } catch (error) {
    console.error("Erro ao criar contact:", error);
    res.status(500).send({ msg: "Erro ao criar contact.", error });
  }
};

contactController.filter = async (req, res) => {
  try {
    let contact_options = {
      props: [
        "contact.*",
        "last_message.type last_message_type",
        "last_message.content last_message_content",
        "last_message.wa_id last_message_wa_id",
        "last_message.from_me last_message_from_me",
        "last_message.datetime last_message_datetime",
      ],
      lefts: [
        ["cms_prospector.message last_message",
          "last_message.contact_phone", "contact.phone",
          "last_message.datetime", "(SELECT MAX(datetime) FROM cms_prospector.message WHERE contact_phone = contact.phone)"
        ]
      ],
      strict_params: { keys: [], values: [] }
    };

    lib.Query.fillParam("contact.phone", req.body.phone, contact_options.strict_params);

    let contacts = await Contact.filter(contact_options);

    if (!contacts.length) {
      return res.send(contacts);
    }

    res.send(contacts);
  } catch (error) {
    console.log(error);
    res.send({ msg: "Ocorreu um erro ao filtrar os contatos" });
  }
};

contactController.delete = async (req, res) => {
};

module.exports = contactController;
