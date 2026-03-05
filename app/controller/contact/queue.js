const lib = require('jarmlib');

const Queue = require("../../model/queue/main");

const contactQueueController = {};

contactQueueController.update = async (req, res) => {
  if (req.user.id != 1) {
    return res.send({ msg: "Você não tem autorização para realizar essa ação" });
  }

  try {
    let queue = new Queue();
    queue.id = req.body.id;
    queue.status = req.body.status;

    let response = await queue.update();
    if (response.err) { return res.send({ msg: response.err }); }

    res.send({ done: "Atualizado com sucesso!" });
  } catch (err) {
    console.error("Erro em check:", err);
    return res.status(500).send({ msg: err.message });
  }
};

contactQueueController.filter = async (req, res) => {
  if (req.user.id != 1) {
    return res.send({ msg: "Você não tem autorização para realizar essa ação" });
  }

  try {
    let queues = await Queue.filter({
      in_params: {
        keys: ['status'],
        values: [[['Pendente', 'Processando', 'Cancelado']]]
      }
    });

    res.send({ queues });
  } catch (err) {
    console.error("Erro em check:", err);
    return res.status(500).send({ msg: err.message });
  }
};

contactQueueController.delete = async (req, res) => {
  if (req.user.id != 1) {
    return res.send({ msg: "Você não tem autorização para realizar essa ação" });
  }

  if (!req.params.id) {
    return res.send({ msg: "Id inválido" });
  }

  try {
    let response = await Query.delete(req.params.id);
    if (!response) { return res.send({ msg: "Erro ao excluir" }) }

    res.send({ done: "Excluído com sucesso!" });
  } catch (err) {
    console.error("Erro em check:", err);
    return res.status(500).send({ msg: err.message });
  }
};

module.exports = contactQueueController;