const lib = require('jarmlib');

const ContactAgenda = require("../../model/contact/agenda");
const { pushNotification } = require("../../middleware/webpush/main");

const contactAgendaController = {};

contactAgendaController.create = async (req, res) => {
  if (req.user?.id != 1) {
    return res.send({ msg: "Você não tem permissão para executar essa ação." });
  }

  try {
    const contact_agenda = new ContactAgenda();
    contact_agenda.datetime = req.body.datetime;
    contact_agenda.status = req.body.status;
    contact_agenda.contact_jid = req.body.contact_jid;
    contact_agenda.content = req.body.content;

    const create_response = await contact_agenda.create();
    if (create_response.err) {
      return res.status(500).send({ msg: create_response.err });
    }

    return res.send({ done: "Agenda criada com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ msg: "Erro ao criar mapa." });
  }
};

contactAgendaController.update = async (req, res) => {
  if (req.user.id != 1) {
    return res.send({ msg: "Você não tem autorização para realizar essa ação" });
  }

  try {
    const contact_agenda = new ContactAgenda();
    contact_agenda.id = req.body.id;
    contact_agenda.status = req.body.status;
    contact_agenda.datetime = req.body.datetime;

    const update_response = await contact_agenda.update();
    if (update_response.err) {
      return res.status(500).send({ msg: update_response.err });
    }

    return res.send({ done: "Agenda concluída com sucesso!" });
  } catch (err) {
    console.error("❌ Erro ao atualizar:", err);
    return res.send({ msg: "Ocorreu um erro ao atualizar" });
  }
};

contactAgendaController.filter = async (req, res) => {
  try {
    let contact_agenda_options = {
      props: [
        "contact_agenda.*",
        "contact.profile_picture",
        "contact.business",
        "contact.name"
      ],
      lefts: [
        ["cms_prospector.contact", "contact.jid", "contact_agenda.contact_jid"]
      ],
      period: { key: "contact_agenda.datetime", start: req.body.period_start, end: req.body.period_end },
      strict_params: { keys: [], values: [] },
    };

    lib.Query.fillParam("contact_agenda.contact_jid", req.body.contact_jid, contact_agenda_options.strict_params);
    lib.Query.fillParam("contact_agenda.status", req.body.status, contact_agenda_options.strict_params);
    lib.Query.fillParam("contact_agenda.content", req.body.map_id, contact_agenda_options.strict_params);
    let contact_agendas = await ContactAgenda.filter(contact_agenda_options);

    res.send(contact_agendas);
  } catch (error) {
    console.log(error);
    res.send({ msg: "Ocorreu um erro ao filtrar os contatos" });
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

contactAgendaController.notify = async () => {
  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  const NINETY_DAYS = 720 * 24 * 60 * 60 * 1000;
  const ONE_HOUR = 60 * 60 * 1000;

  while (true) {
    try {
      const now = Date.now();

      let contact_agenda_options = {
        props: [
          "contact_agenda.*",
          "contact.profile_picture",
          "contact.business",
          "contact.name"
        ],
        lefts: [
          ["cms_prospector.contact", "contact.jid", "contact_agenda.contact_jid"]
        ],
        period: {
          key: "contact_agenda.datetime",
          start: now - NINETY_DAYS, // 90 dias atrás
          end: now + ONE_HOUR       // 1 hora à frente
        },
        strict_params: { keys: [], values: [] },
      };

      lib.Query.fillParam(
        "contact_agenda.status",
        "Pendente",
        contact_agenda_options.strict_params
      );

      let contact_agendas = await ContactAgenda.filter(contact_agenda_options);

      for (let i in contact_agendas) {
        await pushNotification({
          title: `Agenda: ${contact_agendas[i].business || contact_agendas[i].name} - ${contact_agendas[i].contact_jid.split("@")[0]}`,
          body: `${lib.date.timestamp.toDate(contact_agendas[i].datetime)} - ${contact_agendas[i].content}`
        });

        await sleep(2000);
      };
    } catch (error) {
      console.error("Erro no notify:", error);
    }

    // ⏳ espera 15 minutos antes da próxima execução
    await sleep(FIFTEEN_MINUTES);
  }
};

contactAgendaController.notify();

module.exports = contactAgendaController;