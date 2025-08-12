const lib = require('jarmlib');

const wa = require('../../middleware/baileys/main');
const { getProfilePicWithTimeout } = require('../../middleware/baileys/controller');
const ChatGPTAPI = require('../../middleware/chatgpt/main');

const Contact = require("../../model/contact/main");
const Message = require("../../model/message/main");

const contactController = {};

contactController.create = async (req, res) => {
  const [wa_contact] = await wa.getSocket().onWhatsApp(`${req.body.jid}@s.whatsapp.net`);
  if (!wa_contact?.exists) {
    return res.send({ msg: "Esse número não existe!" });
  }

  if (!req.body.business) {
    return res.send({ msg: "Informe o nome da empresa ou do contato" });
  }

  let contact = new Contact();
  contact.business = req.body.business;
  contact.jid = wa_contact.jid;
  contact.participant = null;
  contact.name = req.body.name;
  contact.autochat = !isNaN(req.body.autochat)
    ? parseInt(req.body.autochat) : 0;
  contact.created = 1;
  contact.flow_step = 1;

  let profile_picture = null;
  profile_picture = await getProfilePicWithTimeout(wa.getSocket(), contact.jid);
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
        let response = await ChatGPTAPI({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `
Preciso identificar se o nome da empresa deve ser referido como masculino ou feminino.
Complete .. com "da" ou "do" levando em consideração o nome da empresa.

Exemplo:
Boa tarde, é da Coca-cola?
Boa tarde, é do atacadão?

Frase base da resposta:
Boa tarde, é .. ${contact.business}?

Atenção o JSON precisa ser formatado corretamente, sem blocos de código, sem texto explicativo, sem comentários.  
Todas as chaves e strings devem estar entre aspas duplas e as quebras de linha devem ser representadas como \n.
{
  "output": "Retorne com a melhor resposta."
}
      `
            }
          ]
        });

        // console.log("Resposta do CHATGPT: ", response);

        await wa.getSocket().sendMessage(contact.jid, {
          text: JSON.parse(response).output
        });
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
  contact.jid = req.body.jid;
  contact.business = req.body.business;
  contact.name = req.body.name;
  contact.autochat = req.body.autochat;
  contact.profile_picture = req.body.profile_picture;
  contact.notify = req.body.notify;

  try {
    let contact_update_response = await contact.update();
    if (contact_update_response.err) {
      return res.status(500).send({ msg: contact_update_response.err });
    }

    if (contact.autochat) {
      if (wa.isConnected()) {
        await wa.getSocket().sendMessage(contact.jid, { text: `Olá é da ${contact.business}` });
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
        "last_message.participant last_message_participant",
        "last_message.from_me last_message_from_me",
        "last_message.datetime last_message_datetime",
      ],
      lefts: [
        ["cms_prospector.message last_message",
          "last_message.jid", "contact.jid",
          "last_message.datetime", "(SELECT MAX(datetime) FROM cms_prospector.message WHERE jid = contact.jid)"
        ]
      ],
      strict_params: { keys: [], values: [] },
      order_params: [["last_message.datetime", "desc"]]
    };

    lib.Query.fillParam("contact.jid", req.body.jid, contact_options.strict_params);
    lib.Query.fillParam("contact.status", req.body.status, contact_options.strict_params);
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
