const lib = require('jarmlib');

const ContactAgenda = require("../../model/contact/agenda");

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

contactAgendaController.update = async () => {
  if (req.user.id != 1) {
    return res.send({ msg: "Você não tem autorização para realizar essa ação" });
  }

  try {

  } catch (err) {
    console.error("❌ Erro no worker de ContactMap:", err);
    await sleep(randInt(3000, 8000));
  }
};

contactAgendaController.filter = async (req, res) => {
  try {
    let contact_agenda_options = {
      props: [
        "contact_agenda.*",
      ],
      lefts: [],
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

contactAgendaController.delete = async (req, res) => {

};

module.exports = contactAgendaController;