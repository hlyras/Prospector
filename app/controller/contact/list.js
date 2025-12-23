const lib = require('jarmlib');

// const wa = require('../../middleware/baileys/main');
const { createOrGetSession, getSession } = require('../../middleware/baileys/main');
const { scrapeMapsFromUrl } = require("../../middleware/gmaps/main");
const { enqueueMessage } = require("../../middleware/queue/main");
const downloadProfilePicture = require("../../middleware/baileys/profile");

const Contact = require("../../model/contact/main");
const ContactList = require("../../model/contact/list");
const ContactMap = require("../../model/contact/map");

const contactListController = {};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// contactListController.create = async (req, res) => {
//   if (req.user?.id != 1) {
//     return res.send({ msg: "Você não tem permissão para executar essa ação." });
//   }

//   let contact_map = new ContactMap();
//   contact_map.datetime = lib.date.timestamp.generate();
//   contact_map.cidade = req.body.cidade;
//   contact_map.bairro = req.body.bairro;
//   contact_map.uf = req.body.uf;
//   contact_map.segment = req.body.segment;

//   const session = getSession(req.user.id);
//   if (!session || !session.sock || !session.connected) {
//     console.log('create');
//     return res.send({ msg: "Sessão WhatsApp não conectada!" });
//   }

//   try {
//     let contact_map_create = await contact_map.create();
//     if (contact_map_create.err) {
//       return res.send({ msg: contact_map_create.err });
//     }

//     contact_map.id = contact_map_create.insertId;

//     let contacts = await scrapeMapsFromUrl(req.body.url, 200, async (c) => {
//       c.telefone = c.telefone?.replace(/\D/g, "");

//       let session = getSession(req.user.id);

//       // -------------------------------
//       // 1. Verificar se a sessão caiu
//       // -------------------------------
//       if (!session || !session.sock || !session.connected) {
//         console.log("Sessão caiu, tentando reconectar...");

//         // Tentar recriar/recuperar sessão
//         session = await createOrGetSession(req.user.id);

//         // Aguardar reconexão usando a mesma lógica do seu controller
//         let status = { connected: false };

//         if (typeof waitForSessionState === "function") {
//           status = await waitForSessionState(session, 15000);
//         }

//         if (!status.connected) {
//           console.log("Falha ao reconectar. Ignorando número:", c.telefone);
//           return;
//         }

//         console.log("Sessão reconectada com sucesso!");
//       }

//       const [wa_contact] = await session.sock.onWhatsApp(`55${c.telefone}@s.whatsapp.net`);
//       if (!wa_contact?.exists) {
//         return console.log({ msg: `Esse número não existe! ${c.nome}` });
//       }

//       if ((await Contact.findByJid(wa_contact.jid)).length) {
//         return console.log({ msg: `Este contato já foi cadastrado! ${c.nome}` });
//       }

//       if ((await ContactList.findByJid(wa_contact.jid)).length) {
//         return console.log({ msg: `Esse número já está listado! ${c.nome}` });
//       }

//       if (!c.nome) {
//         return console.log({ msg: "Informe o nome da empresa ou do contato" });
//       }

//       let contact_list = new ContactList();
//       contact_list.map_id = contact_map.id;
//       contact_list.business = c.nome;
//       contact_list.jid = wa_contact.jid;
//       contact_list.datetime = lib.date.timestamp.generate();
//       contact_list.status = "Pendente";
//       contact_list.cidade = req.body.cidade;
//       contact_list.bairro = req.body.bairro;
//       contact_list.uf = req.body.uf;
//       contact_list.segment = req.body.segment;
//       contact_list.seller_id = req.body.seller_id;

//       let contact_create_response = await contact_list.create();
//       if (contact_create_response.err) {
//         return res.status(500).send({
//           msg: contact_create_response.err
//         });
//       }
//     });

//     res.status(201).send({ done: "Concluído com sucesso!", contacts });
//   } catch (error) {
//     console.error("Erro durante a prospecção:", error);
//     res.status(500).send({ msg: "Erro durante a prospecção.", error });
//   }
// };

contactListController.create = async (req, res) => {
  if (req.user?.id != 1) {
    return res.send({ msg: "Você não tem permissão para executar essa ação." });
  }

  try {
    const contact_map = new ContactMap();
    contact_map.datetime = lib.date.timestamp.generate();
    contact_map.cidade = req.body.cidade;
    contact_map.bairro = req.body.bairro;
    contact_map.uf = req.body.uf;
    contact_map.segment = req.body.segment;
    contact_map.url = req.body.url;
    contact_map.seller_id = req.body.seller_id;
    contact_map.status = "Pendente";

    const create = await contact_map.create();
    if (create.err) {
      return res.status(500).send({ msg: create.err });
    }

    return res.status(201).send({
      done: "Mapa cadastrado e aguardando processamento.",
      map_id: create.insertId
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({ msg: "Erro ao criar mapa." });
  }
};

contactListController.queue = async () => {
  while (true) {
    try {
      const maps = await ContactMap.filter({
        in_params: {
          keys: ["status"],
          values: [[["Pendente", "Processando"]]]
        },
        order_params: [["contact_map.datetime", "asc"]],
        limit: 1
      });

      console.log(maps);

      const map = maps?.[0];
      if (!map) {
        await sleep(randInt(2000, 5000));
        continue;
      }

      const session = getSession(map.user_id || map.seller_id);
      if (!session || !session.sock || !session.connected) {
        console.log("Sessão não conectada, aguardando...");
        await sleep(randInt(10000, 20000));
        continue;
      }

      // Marca como processando (lock simples)
      if (map.status != "Processando") {
        const mapProc = new ContactMap();
        mapProc.id = map.id;
        mapProc.status = "Processando";
        await mapProc.update();
      }

      console.log(`Processando ContactMap ${map.id}`);

      await scrapeMapsFromUrl(map.url, 200, async (c) => {
        c.telefone = c.telefone?.replace(/\D/g, "");
        if (!c.telefone || !c.nome) return;

        const [wa_contact] =
          await session.sock.onWhatsApp(`55${c.telefone}@s.whatsapp.net`);

        if (!wa_contact?.exists) return;

        if ((await Contact.findByJid(wa_contact.jid)).length) return;
        if ((await ContactList.findByJid(wa_contact.jid)).length) return;

        const contact_list = new ContactList();
        contact_list.map_id = map.id;
        contact_list.business = c.nome;
        contact_list.jid = wa_contact.jid;
        contact_list.datetime = lib.date.timestamp.generate();
        contact_list.status = "Pendente";
        contact_list.cidade = map.cidade;
        contact_list.bairro = map.bairro;
        contact_list.uf = map.uf;
        contact_list.segment = map.segment;
        contact_list.seller_id = map.seller_id;

        await contact_list.create();

        // delay humano
        await sleep(randInt(1200, 4500));
      });

      // Finaliza o mapa
      const mapDone = new ContactMap();
      mapDone.id = map.id;
      mapDone.status = "Concluído";
      await mapDone.update();

      console.log(`ContactMap ${map.id} concluído`);

      await sleep(randInt(2000, 6000));

    } catch (err) {
      console.error("Erro no worker de ContactMap:", err);
      await sleep(randInt(3000, 8000));
    }
  }
};

contactListController.send = async (req, res) => {
  try {
    const session = getSession(req.user.id);
    if (!session || !session.sock) {
      console.log('send');
      return res.status(400).send({ msg: "Sessão WhatsApp não conectada!" });
    }

    let contact_list_verify = (await ContactList.filter({
      strict_params: {
        keys: ['id'],
        values: [req.body.id]
      }
    }))[0];

    if (contact_list_verify.seller_id != req.user.id) {
      return res.send({ msg: "Você não tem autorização para realizar essa ação" });
    }

    let contact_verify = (await Contact.filter({
      strict_params: {
        keys: ['jid'],
        values: [contact_list_verify.jid]
      }
    }))[0];

    if (contact_verify) {
      return res.send({ msg: "Esse contato já foi contatado." });
    }

    let contact_list = new ContactList();
    contact_list.jid = contact_list_verify.jid;
    contact_list.sent_datetime = lib.date.timestamp.generate();
    let contact_list_update_response = await contact_list.update();
    if (contact_list_update_response.err) { console.log(); }

    let contact = new Contact();
    contact.business = contact_list_verify.business;
    contact.jid = contact_list_verify.jid;
    contact.datetime = lib.date.timestamp.generate();
    contact.participant = null;
    contact.autochat = 1;
    contact.created = 1;
    contact.flow_step = 0;
    contact.segment = contact_list_verify.segment;
    contact.seller_id = req.user.id;

    const profilePicPath = await downloadProfilePicture(
      session.sock,
      contact_list_verify.jid
    );

    if (profilePicPath) {
      contact.profile_picture = profilePicPath;
    }

    let contact_create_response = await contact.create();
    if (contact_create_response.err) { return res.send({ msg: contact_create_response.err }); }

    enqueueMessage({
      contact_jid: contact.jid,
      priority: parseInt(contact.flow_step),
      user_id: req.user.id
    });

    return res.send({ done: "Mensagem incluída na fila" });
  } catch (err) {
    console.error("Erro em check:", err);
    return res.status(500).send({ msg: err.message });
  }
};

contactListController.filter = async (req, res) => {
  try {
    let contact_list_options = {
      props: [
        "contact_list.*",
        "contact.flow_step"
      ],
      lefts: [
        ["cms_prospector.contact", "contact_list.jid", "contact.jid"],
        ["cms_prospector.contact_map", "contact_map.id", "contact_list.map_id"]
      ],
      period: { key: "contact_list.sent_datetime", start: req.body.period_start, end: req.body.period_end },
      strict_params: { keys: [], values: [] },
    };

    lib.Query.fillParam("contact_list.jid", req.body.jid, contact_list_options.strict_params);
    lib.Query.fillParam("contact_list.map_id", req.body.map_id, contact_list_options.strict_params);
    lib.Query.fillParam("contact_list.status", req.body.status, contact_list_options.strict_params);
    lib.Query.fillParam("contact_list.seller_id", req.user.id, contact_list_options.strict_params);
    let contact_lists = await ContactList.filter(contact_list_options);

    res.send(contact_lists);
  } catch (error) {
    console.log(error);
    res.send({ msg: "Ocorreu um erro ao filtrar os contatos" });
  }
};

contactListController.check = async (req, res) => {
  try {
    const session = getSession(req.user.id);
    if (!session || !session.sock) {
      console.log('check');
      return res.status(400).send({ msg: "Sessão WhatsApp não conectada!" });
    }

    const sock = session.sock;

    const chats = await sock.chats?.all?.() || [];
    if (!chats.length) {
      console.log("⚠️ Nenhum chat encontrado.");
      return res.send({ msg: "Nenhum chat encontrado." });
    }

    // pega só 1 chat pra inspecionar
    const chat = chats[0];
    const jid = chat.id || chat.jid || chat.key?.remoteJid;
    console.log("🧩 Testando chat:", jid);

    const messages = await sock.loadMessages(jid, 20);
    console.log(`💬 Mensagens carregadas (${messages.length})`);

    // Mostra o conteúdo bruto das mensagens
    for (let i = 0; i < messages.length; i++) {
      console.log(`Mensagem ${i + 1}:`);
      console.dir(messages[i], { depth: 3 });
    }

    return res.send({ count: messages.length });
  } catch (err) {
    console.error("Erro em check:", err);
    return res.status(500).send({ msg: err.message });
  }
};

module.exports = contactListController;