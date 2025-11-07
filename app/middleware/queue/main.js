// queue-worker.js
const Queue = require("../../model/queue/main");
const Contact = require("../../model/contact/main");
const SendByAi = require("../../controller/message/send_by_ai");
const wa = require('../../middleware/baileys/main');
const lib = require("jarmlib");

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/* -------------------------------  PERFIS  ------------------------------- */
const HUMAN_PROFILES = {
  cuidadoso: {
    perCharMs: [600, 1200],
    pauses: [1, 3],
    reviewPause: [3000, 6000],
    skipTypingChance: 0.05
  },
  rapido: {
    perCharMs: [150, 300],
    pauses: [0, 1],
    reviewPause: [1500, 3000],
    skipTypingChance: 0.25
  },
  conversacional: {
    perCharMs: [300, 600],
    pauses: [0, 2],
    reviewPause: [2500, 5000],
    skipTypingChance: 0.12
  }
};

function pickProfile() {
  const roll = Math.random();
  if (roll < 0.3) return HUMAN_PROFILES.cuidadoso;
  if (roll < 0.55) return HUMAN_PROFILES.rapido;
  return HUMAN_PROFILES.conversacional;
}

/* ----------------------------  AUXILIARES  ----------------------------- */
async function safeMarkAsRead(socket, jid) {
  try {
    if (!socket) return;
    if (typeof socket.readMessages === 'function') {
      await socket.readMessages([jid]);
    } else if (typeof socket.sendReadReceipt === 'function') {
      await socket.sendReadReceipt(jid);
    }
  } catch (_) { }
}

function calcTypingDuration(messageLength, perCharRange, minMs = 700, cap = 70000) {
  const perCharMs = randInt(perCharRange[0], perCharRange[1]);
  const nonlinear = Math.pow(messageLength, 0.75) * perCharMs;
  const base = randInt(300, 1000);
  return Math.min(cap, Math.max(minMs, base + nonlinear));
}

/* ---------------------------  DIGITAÇÃO HUMANA  ------------------------- */
async function simulateTypingHuman(socket, jid, message, profile) {
  try {
    if (!socket || !jid || !message) return;

    console.log(`[simulateTypingHuman] Iniciando para ${jid}`);

    // Marca como lido com segurança
    await safeMarkAsRead(socket, jid);
    await sleep(randInt(4000, 12000));

    // Calcula tempo total de digitação (mensagens longas demoram mais)
    const typingDuration = calcTypingDuration(message.length, profile.perCharMs);
    console.log(`[simulateTypingHuman] Compondo por ${typingDuration}ms`);

    await socket.sendPresenceUpdate('composing', jid);
    const start = Date.now();

    while (Date.now() - start < typingDuration) {
      // reenvia 'composing' a cada 6–9 segundos para manter o efeito ativo
      await sleep(randInt(6000, 9000));
      await socket.sendPresenceUpdate('composing', jid);
      console.log(`[simulateTypingHuman] Compondo`);
    }

    // Um único "paused" no final
    await socket.sendPresenceUpdate('paused', jid);
    const reviewPause = randInt(profile.reviewPause[0], profile.reviewPause[1]);
    console.log(`[simulateTypingHuman] Revisando por ${reviewPause}ms`);
    await sleep(reviewPause);

    console.log(`[simulateTypingHuman] Finalizado para ${jid}`);
  } catch (err) {
    console.error('[simulateTypingHuman] Erro:', err?.message ?? err);
  }
};

/* -----------------------------  APÓS ENVIO  ----------------------------- */
async function simulateAfter(socket, jid, message) {
  try {
    if (!socket) return;
    const stay = randInt(1200, 4200) + Math.min(3000, message.length * 10);
    await sleep(stay);
  } catch (err) {
    console.error('[simulateAfter]', err?.message ?? err);
  }
}

/* -------------------------------  FILA  --------------------------------- */
async function enqueueMessage(item = {}) {
  const q = new Queue();
  q.datetime = lib.date.timestamp.generate();
  q.contact_jid = item.contact_jid;
  q.status = "Pendente";
  if (item.priority) q.priority = item.priority;
  await q.create();
}

/* --------------------------  PROCESSADOR  ------------------------------- */
async function processQueue() {
  while (true) {
    try {
      const results = await Queue.filter({
        in_params: {
          keys: ["status"],
          values: [[["Processando", "Pendente"]]]
        },
        order_params: [["queue.priority", "desc"], ["queue.datetime", "asc"]],
        limit: 1
      });

      const msg = results?.[0];
      if (!msg) {
        await sleep(randInt(800, 3000));
        continue;
      }

      let queue_delay = randInt(9000, 24000);
      await sleep(queue_delay);

      console.log(`Próxima mensagem em ${queue_delay}`, msg);

      const qProc = new Queue();
      qProc.id = msg.id;
      qProc.status = "Processando";
      await qProc.update();

      const socket = wa.getSocket();
      if (!socket) {
        const qFail = new Queue();
        qFail.id = msg.id;
        qFail.status = "ErroProcesso";
        qFail.error = "Socket indisponível";
        await qFail.update();
        await sleep(2000);
        continue;
      }

      const profile = pickProfile();
      await sleep(randInt(800, 3000));

      await simulateTypingHuman(socket, msg.contact_jid, msg.message, profile);

      const updated_contact = (await Contact.findByJid(msg.contact_jid))[0];

      let contact_info = new Contact();
      contact_info.jid = msg.contact_jid;
      contact_info.business = updated_contact.business;
      contact_info.name = updated_contact.name;
      contact_info.flow_step = parseInt(updated_contact.flow_step);
      contact_info.segment = updated_contact.segment;

      // enviar mensagem
      await SendByAi(contact_info);

      let contact = new Contact();
      contact.jid = msg.contact_jid;
      await contact.resetTyping();

      const qSent = new Queue();
      qSent.id = msg.id;
      qSent.status = "Enviado";
      await qSent.update();

      await sleep(randInt(800, 2500));
    } catch (err) {
      console.error('[processQueue]', err?.message ?? err);
      await sleep(randInt(1000, 5000));
    }
  }
}

/* ------------------------------  EXPORTS  ------------------------------- */

module.exports = {
  enqueueMessage,
  processQueue,
  simulateTypingHuman,
  simulateAfter,
  pickProfile
};