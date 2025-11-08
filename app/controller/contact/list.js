const lib = require('jarmlib');

// const wa = require('../../middleware/baileys/main');
const { getSession } = require('../../middleware/baileys/main');
const { scrapeMapsFromUrl } = require("../../middleware/gmaps/main");

const Contact = require("../../model/contact/main");
const ContactList = require("../../model/contact/list");
const ContactMap = require("../../model/contact/map");

const contactListController = {};

contactListController.create = async (req, res) => {
  let contact_map = new ContactMap();
  contact_map.datetime = lib.date.timestamp.generate();
  contact_map.cidade = req.body.cidade;
  contact_map.bairro = req.body.bairro;
  contact_map.uf = req.body.uf;

  const session = getSession(req.user.id);
  if (!session || !session.sock || !session.connected) {
    return res.send({ msg: "Sessão WhatsApp não conectada!" });
  }

  try {
    let contact_map_create = await contact_map.create();
    if (contact_map_create.err) {
      return res.send({ msg: contact_map_create.err });
    }

    let contacts = await scrapeMapsFromUrl(req.body.url, 200, async (c) => {
      c.telefone = c.telefone?.replace(/\D/g, "");

      const [wa_contact] = await session.sock.onWhatsApp(`55${c.telefone}@s.whatsapp.net`);
      if (!wa_contact?.exists) {
        return console.log({ msg: `Esse número não existe! ${c.nome}` });
      }

      if ((await Contact.findByJid(wa_contact.jid)).length) {
        return console.log({ msg: `Este contato já foi cadastrado! ${c.nome}` });
      }

      if ((await ContactList.findByJid(wa_contact.jid)).length) {
        return console.log({ msg: `Esse número já está listado! ${c.nome}` });
      }

      if (!c.nome) {
        return console.log({ msg: "Informe o nome da empresa ou do contato" });
      }

      let contact_list = new ContactList();
      contact_list.business = c.nome;
      contact_list.jid = wa_contact.jid;
      contact_list.datetime = lib.date.timestamp.generate();
      contact_list.status = "Pendente";
      contact_list.cidade = req.body.cidade;
      contact_list.bairro = req.body.bairro;
      contact_list.uf = req.body.uf;
      contact_list.segment = req.body.segment;
      contact_list.seller_id = req.body.seller_id;

      let contact_create_response = await contact_list.create();
      if (contact_create_response.err) {
        return res.status(500).send({
          msg: contact_create_response.err
        });
      }
    });

    res.status(201).send({ done: "Concluído com sucesso!", contacts });
  } catch (error) {
    console.error("Erro durante a prospecção:", error);
    res.status(500).send({ msg: "Erro durante a prospecção.", error });
  }
};

contactListController.filter = async (req, res) => {
  try {
    let contact_list_options = {
      props: [
        "contact_list.*",
        // "last_message.type last_message_type",
        // "last_message.content last_message_content",
        // "last_message.wa_id last_message_wa_id",
        // "last_message.participant last_message_participant",
        // "last_message.from_me last_message_from_me",
        // "last_message.datetime last_message_datetime",
      ],
      lefts: [
        // ["cms_prospector.message last_message",
        //   "last_message.jid", "contact.jid",
        //   "last_message.datetime", "(SELECT MAX(datetime) FROM cms_prospector.message WHERE jid = contact.jid)"
        // ]
      ],
      period: { key: "contact_list.sent_datetime", start: req.body.period_start, end: req.body.period_end },
      strict_params: { keys: [], values: [] },
      // order_params: [["last_message.datetime", "desc"]]
    };

    lib.Query.fillParam("contact_list.jid", req.body.jid, contact_list_options.strict_params);
    lib.Query.fillParam("contact_list.status", req.body.status, contact_list_options.strict_params);
    lib.Query.fillParam("contact_list.seller_id", req.user.id, contact_list_options.strict_params);
    let contact_lists = await ContactList.filter(contact_list_options);

    res.send(contact_lists);
  } catch (error) {
    console.log(error);
    res.send({ msg: "Ocorreu um erro ao filtrar os contatos" });
  }
};

module.exports = contactListController;