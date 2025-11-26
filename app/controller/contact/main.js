const lib = require('jarmlib');

const wa = require('../../middleware/baileys/main');
const { getProfilePicWithTimeout } = require('../../middleware/baileys/controller');
const { ChatGPTAPI } = require('../../middleware/chatgpt/main');
const { scrapeMapsFromUrl } = require("../../middleware/gmaps/main");

const Contact = require("../../model/contact/main");
const ContactList = require("../../model/contact/list");
const Message = require("../../model/message/main");
const { enqueueMessage } = require("../../middleware/queue/main");

const contactController = {};

contactController.create = async (req, res) => {
  const [wa_contact] = await wa.getSocket().onWhatsApp(`${req.body.jid}@s.whatsapp.net`);
  if (!wa_contact?.exists) {
    return res.send({ msg: "Esse número não existe!" });
  }

  if ((await Contact.findByJid(wa_contact.jid)).length) {
    return res.send({ msg: "Esse número já está cadastrado!" });
  }

  if (!req.body.business) {
    return res.send({ msg: "Informe o nome da empresa ou do contato" });
  }

  let contact = new Contact();
  contact.business = req.body.business;
  contact.jid = wa_contact.jid;
  contact.datetime = lib.date.timestamp.generate();
  contact.participant = null;
  contact.autochat = !isNaN(req.body.autochat)
    ? parseInt(req.body.autochat) : 0;
  contact.created = 1;
  contact.flow_step = 1;
  contact.segment = req.body.segment;

  // let profile_picture = null;
  // profile_picture = await getProfilePicWithTimeout(wa.getSocket(), contact.jid);
  // contact.profile_picture = profile_picture;

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
Boa tarde, é da Apple?
Boa tarde, é do Google?

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

        // await wa.getSocket().sendMessage(contact.jid, {
        //   text: JSON.parse(response).output
        // });

        enqueueMessage({
          contact_jid: contact.jid,
          message: JSON.parse(response).output
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

contactController.prospect = async (req, res) => {
  try {
    let contacts = await scrapeMapsFromUrl(req.body.url, 200, async (c) => {
      c.telefone = c.telefone?.replace(/\D/g, "");

      const [wa_contact] = await wa.getSocket().onWhatsApp(`55${c.telefone}@s.whatsapp.net`);
      if (!wa_contact?.exists) {
        return console.log({ msg: `Esse número não existe! ${c.nome}` });
      }

      if ((await Contact.findByJid(wa_contact.jid)).length) {
        return console.log({ msg: `Esse número já está cadastrado! ${c.nome}` });
      }

      if (!c.nome) {
        return console.log({ msg: "Informe o nome da empresa ou do contato" });
      }

      let contact_list = new ContactList();
      contact_list.business = c.nome;
      contact_list.jid = wa_contact.jid;
      contact_list.datetime = lib.date.timestamp.generate();
      contact_list.participant = null;
      contact_list.autochat = 1;
      contact_list.created = 1;
      contact_list.flow_step = 1;
      contact_list.segment = req.body.segment;

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

            // await wa.getSocket().sendMessage(contact.jid, {
            //   text: JSON.parse(response).output
            // });

            enqueueMessage({
              contact_jid: contact.jid,
              message: JSON.parse(response).output
            });
          } else {
            console.warn("WhatsApp não está pronto para enviar mensagens.");
          }
        }
      } catch (error) {
        console.error("Erro ao criar contact:", error);
      }
    });

    res.status(201).send({ done: "Concluído com sucesso!", contacts });
  } catch (error) {
    console.error("Erro durante a prospecção:", error);
    res.status(500).send({ msg: "Erro durante a prospecção.", error });
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
        [
          "(SELECT jid, MAX(datetime) as max_dt FROM cms_prospector.message GROUP BY jid) msg_max",
          "msg_max.jid", "contact.jid"
        ],
        [
          "cms_prospector.message last_message",
          "last_message.jid", "msg_max.jid",
          "last_message.datetime", "msg_max.max_dt"
        ]
      ],
      period: { key: "contact.datetime", start: req.body.period_start, end: req.body.period_end },
      strict_params: { keys: [], values: [] },
      order_params: [["last_message.datetime", "desc"]],
      // limit: 300
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