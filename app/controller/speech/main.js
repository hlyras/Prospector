const lib = require('jarmlib');

const { ChatGPTTTS } = require('../../middleware/chatgpt/main');
const Speech = require("../../model/speech/main");
const fs = require("fs");
const path = require("path");

const speechController = {};

speechController.create = async (req, res) => {
  if (req.user?.id != 1) {
    return res.send({ msg: "sem autorização" });
  }

  let url = await ChatGPTTTS(req.body.text, req.body.voice);

  let speech = new Speech();
  speech.content = req.body.text;
  speech.url = url;
  speech.voice = req.body.voice;

  try {
    let speech_create = await speech.create();
    if (speech_create.err) { return res.send({ msg: speech_create.err }); }

    speech.id = speech_create.insertId;

    res.send(speech);
  } catch (error) {
    console.log(error);
  }
};

speechController.filter = async (req, res) => {
  if (req.user?.id != 1) {
    return res.send({ msg: "sem autorização" });
  }

  try {
    let speechs = await Speech.filter({});

    res.send({ speechs });
  } catch (error) {
    console.log(error);
  }
};

speechController.delete = async (req, res) => {
  if (req.user?.id != 1) {
    return res.send({ msg: "sem autorização" });
  }

  try {
    let speech = (await Speech.filter({
      strict_params: { keys: ["id"], values: [req.params?.id] }
    }))[0];

    if (speech.id != req.params.id) { return res.send({ msg: "Áudio inválido!" }); }

    try {
      const filePath = path.join(process.cwd(), "public", speech.url);
      await fs.promises.unlink(filePath);
    } catch (error) {
      console.log(error);
    }

    await Speech.delete(req.params.id);

    res.send({ done: "Excluído com sucesso!" });
  } catch (error) {
    console.log(error);
  }
};

module.exports = speechController;