const Queue = require("../../model/queue/main");
const wa = require('../../middleware/baileys/main');

const lib = require("jarmlib");

// Função de sleep/pause
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para gerar delay aleatório entre min e max (ms)
function randomDelay(min = 5000, max = 10000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Função para registrar mensagem na fila
async function enqueueMessage(item) {
  let queue = new Queue();
  queue.datetime = lib.date.timestamp.generate();
  queue.contact_jid = item.contact_jid;
  queue.message = item.message;
  queue.status = "Pendente";
  await queue.create();
};

// Worker que processa a fila
async function processQueue() {
  while (true) {
    let queue_message = (await Queue.filter({
      limit: 1,
      strict_params: {
        keys: ["status"],
        values: ["Pendente"]
      },
      order: [["queue.id", "asc"]]
    }))[0];

    console.log(queue_message);

    if (!queue_message) {
      await sleep(1000);
      continue;
    }

    wa.getSocket().sendPresenceUpdate("composing", queue_message.contact_jid);
    const delay = randomDelay(3000, 12000);
    await sleep(delay);

    try {
      await wa.getSocket()
        .sendMessage(queue_message.contact_jid, {
          text: queue_message.message
        });

      let queue = new Queue();
      queue.id = queue_message.id;
      queue.status = "Enviado";
      await queue.update();

      await wa.getSocket().sendPresenceUpdate("available", queue_message.contact_jid);
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    }
  }
};

// Exporta funções
module.exports = {
  enqueueMessage,
  processQueue
};