const wa = require('./../../middleware/baileys/main');
const Lead = require("./../../model/lead/main");

const lib = require('jarmlib');

const leadController = {};

leadController.create = async (req, res) => {
  let lead = new Lead();
  lead.business = req.body.business;
  lead.phone = req.body.phone;
  lead.name = req.body.name;
  lead.autochat = req.body.autochat || 0;

  try {
    let lead_save_response = await lead.create();
    if (lead_save_response.err) {
      return res.status(500).send({ msg: lead_save_response.err });
    }

    if (lead.autochat) {
      if (wa.isConnected()) {
        const jid = lead.phone + '@s.whatsapp.net';
        await wa.getSocket().sendMessage(jid, { text: `Olá é da ${lead.business}` });
      } else {
        console.warn("WhatsApp não está pronto para enviar mensagens.");
      }
    }

    res.status(201).send({ done: "Lead criado com sucesso!", lead });
  } catch (error) {
    console.error("Erro ao criar lead:", error);
    res.status(500).send({ msg: "Erro ao criar lead.", error });
  }
};

leadController.update = async (req, res) => {

};

leadController.filter = async (req, res) => {

};

leadController.delete = async (req, res) => {

};

module.exports = leadController;
