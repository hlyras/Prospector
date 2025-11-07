const lib = require('jarmlib');

const ContactMap = require("../../model/contact/map");

const contactMapController = {};

contactMapController.filter = async (req, res) => {
  try {
    let contact_map_options = {
      props: [
        "contact_map.*",
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
      period: { key: "contact_map.datetime", start: req.body.period_start, end: req.body.period_end },
      strict_params: { keys: [], values: [] },
      // order_params: [["last_message.datetime", "desc"]]
    };

    lib.Query.fillParam("contact_map.cidade",
      req.body.cidade, contact_map_options.strict_params);
    lib.Query.fillParam("contact_map.bairro",
      req.body.bairro, contact_map_options.strict_params);
    lib.Query.fillParam("contact_map.uf",
      req.body.uf, contact_map_options.strict_params);
    let contact_maps = await ContactMap.filter(contact_map_options);

    res.send(contact_maps);
  } catch (error) {
    console.log(error);
    res.send({ msg: "Ocorreu um erro ao filtrar os contatos" });
  }
};

module.exports = contactMapController;