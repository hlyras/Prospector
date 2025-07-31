const wa = require('../../middleware/baileys/main');
const Contact = require("../../model/contact/main");
const Message = require("../../model/message/main");

const lib = require('jarmlib');

const contactController = {};

contactController.create = async (req, res) => {
  let contact = new Contact();
  contact.business = req.body.business;
  contact.phone = req.body.phone;
  contact.name = req.body.name;
  contact.autochat = req.body.autochat || 0;

  const getProfilePicWithTimeout = (jid, timeout = 5000) => {
    return Promise.race([
      wa.getSocket().profilePictureUrl(jid, 'image'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout ao buscar foto de perfil')), timeout)
      )
    ]);
  };

  let profile_picture = null;

  try {
    profile_picture = await getProfilePicWithTimeout(`${contact.phone}@s.whatsapp.net`);
    console.log('Foto do perfil:', profile_picture);
  } catch (err) {
    console.log('Erro ao buscar foto:', err.message);
  }

  contact.profile_picture = profile_picture;

  try {
    let contact_create_response = await contact.create();
    if (contact_create_response.err) {
      return res.status(500).send({
        msg: contact_create_response.err
      });
    }

    // if (contact.autochat) {
    //   if (wa.isConnected()) {
    //     const jid = contact.phone + '@s.whatsapp.net';
    //     await wa.getSocket().sendMessage(jid, { text: `Olá é da ${contact.business}` });
    //   } else {
    //     console.warn("WhatsApp não está pronto para enviar mensagens.");
    //   }
    // }

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
    let contacts = await Contact.filter({});

    if (!contacts.length) {
      return res.send({ contacts, messages: [] });
    }

    let contact_list = [];

    for (let i in contacts) {
      contact_list.push(contacts[i].phone);
    };

    let message_options = {
      props: [],
      in_params: { keys: [], values: [] },
      order_params: [["datetime", "desc"]]
    };

    lib.Query.fillParam("contact_phone",
      [contact_list], message_options.in_params);

    let messages = await Message.filter(message_options);

    res.send({ contacts, messages });
  } catch (error) {
    console.log(error);
    res.send({ msg: "Ocorreu um erro ao filtrar os contatos" });
  }
};

contactController.delete = async (req, res) => {
};

module.exports = contactController;
