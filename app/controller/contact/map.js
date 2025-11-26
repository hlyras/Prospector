const lib = require('jarmlib');

const ContactMap = require("../../model/contact/map");

const contactMapController = {};

contactMapController.filter = async (req, res) => {
  try {
    let contact_map_options = {
      period: { key: "contact_map.datetime", start: req.body.period_start, end: req.body.period_end },
      strict_params: { keys: [], values: [] },
    };

    lib.Query.fillParam("contact_map.cidade",
      req.body.cidade, contact_map_options.strict_params);
    lib.Query.fillParam("contact_map.bairro",
      req.body.bairro, contact_map_options.strict_params);
    lib.Query.fillParam("contact_map.uf",
      req.body.uf, contact_map_options.strict_params);
    lib.Query.fillParam("contact_map.segment",
      req.body.segment, contact_map_options.strict_params);
    let contact_maps = await ContactMap.filter(contact_map_options);

    res.send(contact_maps);
  } catch (error) {
    console.log(error);
    res.send({ msg: "Ocorreu um erro ao filtrar os contatos" });
  }
};

module.exports = contactMapController;