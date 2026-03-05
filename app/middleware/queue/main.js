// queue-worker.js
const Queue = require("../../model/queue/main");
const Contact = require("../../model/contact/main");
const SendByAi = require("../../controller/message/send_by_ai");
const { getSession } = require('../../middleware/baileys/main');
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

function calcTypingDuration(messageLength, perCharRange, minMs = 1200, cap = 120000) {
  // Velocidade média de digitação humana: 35–65 caracteres por minuto (~1–2 chars/s)
  // Ajuste por perfil e tamanho de mensagem.
  const perCharMs = randInt(perCharRange[0], perCharRange[1]);

  // Tempo base proporcional ao comprimento (mas com saturação natural)
  const baseTyping = Math.pow(messageLength, 0.85) * perCharMs;

  // Microvariação humana: hesitação, revisão, correção etc.
  const hesitationFactor = 1 + Math.random() * 0.25; // até 25% mais lento
  const randomDelay = randInt(400, 1800);

  // “Fator de leitura” — quanto mais longa a mensagem, mais revisão antes de enviar
  const reviewFactor = messageLength > 80 ? 1.15 : 1;

  const total = (baseTyping * hesitationFactor * reviewFactor) + randomDelay;

  // Garante que seja realista, mas nunca instantâneo
  return Math.min(cap, Math.max(minMs, total));
}

/* ---------------------------  DIGITAÇÃO HUMANA  ------------------------- */
/* -------------------------  TEMPO DE DIGITAÇÃO  ------------------------ */
function calcTypingDuration(messageLength, perCharRange, minMs = 1200, cap = 120000) {
  // Velocidade média de digitação humana: 35–65 caracteres por minuto (~1–2 chars/s)
  const perCharMs = randInt(perCharRange[0], perCharRange[1]);

  // Tempo base proporcional ao comprimento (mas com saturação natural)
  const baseTyping = Math.pow(messageLength, 0.85) * perCharMs;

  // Microvariação humana: hesitação, revisão, correção etc.
  const hesitationFactor = 1 + Math.random() * 0.25; // até 25% mais lento
  const randomDelay = randInt(400, 1800);

  // “Fator de leitura”: quanto maior a mensagem, mais tempo de revisão
  const reviewFactor = messageLength > 80 ? 1.15 : 1;

  const total = (baseTyping * hesitationFactor * reviewFactor) + randomDelay;

  // Garante que seja realista, mas nunca instantâneo
  return Math.min(cap, Math.max(minMs, total));
}

/* --------------------------  DIGITAÇÃO HUMANA  ------------------------- */
async function simulateTypingHuman(socket, jid, message, profile) {
  try {
    if (!socket || !jid || !message) return;

    console.log(`[simulateTypingHuman] 🧠 Iniciando simulação para ${jid}`);

    // Marca como lido
    await safeMarkAsRead(socket, jid);
    const preDelay = randInt(3000, 9000);
    console.log(`[simulateTypingHuman] ⏳ Esperando antes de digitar (${preDelay}ms)`);
    await sleep(preDelay);

    // 1️⃣ Calcula tempo total de digitação
    const typingDuration = calcTypingDuration(message.length, profile.perCharMs);
    const variability = randInt(-1200, 1200);
    const totalDuration = Math.max(1000, typingDuration + variability);
    console.log(`[simulateTypingHuman] ✍️  Simulando digitação por ~${totalDuration}ms`);

    const start = Date.now();
    let elapsed = 0;

    // 2️⃣ Loop principal — simula blocos de digitação
    while (elapsed < totalDuration) {
      await socket.sendPresenceUpdate("composing", jid);

      const chunkDuration = randInt(4000, 10000);
      const pauseChance = Math.random();

      // chance de pausas humanas (pensar, revisar)
      if (pauseChance < 0.15) {
        const pauseTime = randInt(2000, 5000);
        console.log(`[simulateTypingHuman] 💭 Pausando por ${pauseTime}ms`);
        await socket.sendPresenceUpdate("paused", jid);
        await sleep(pauseTime);
        await socket.sendPresenceUpdate("composing", jid);
      }

      await sleep(chunkDuration);
      elapsed = Date.now() - start;
    }

    // 3️⃣ Revisão final antes de envio
    await socket.sendPresenceUpdate("paused", jid);
    const reviewPause = randInt(profile.reviewPause[0], profile.reviewPause[1]);
    console.log(`[simulateTypingHuman] 👀 Revisando por ${reviewPause}ms`);
    await sleep(reviewPause);

    console.log(`[simulateTypingHuman] ✅ Finalizado para ${jid}`);
  } catch (err) {
    console.error("[simulateTypingHuman] Erro:", err?.message ?? err);
  }
};

/* -----------------------------  APÓS ENVIO  ----------------------------- */
async function simulateAfter(socket, jid, message = "", profile = { reviewPause: [1500, 3500] }) {
  try {
    if (!socket) return 0;
    if (typeof message !== "string") message = String(message ?? "");

    const base = randInt(1200, 4200);
    const sizeAdd = Math.min(
      message.length < 150 ? 3000 : 6000,
      message.length * 12
    );

    // fator de perfil + leve variação aleatória
    const profileFactor = (() => {
      const avgReview = (profile?.reviewPause?.length === 2)
        ? (profile.reviewPause[0] + profile.reviewPause[1]) / 2
        : 2500;
      const baseFactor = Math.max(0.8, Math.min(1.3, avgReview / 2500));
      const randomDrift = 1 + (Math.random() - 0.5) * 0.1; // ±5%
      return baseFactor * randomDrift;
    })();

    const jitter = randInt(-600, 900);
    const stay = Math.max(500, Math.round((base + sizeAdd) * profileFactor + jitter));

    // chance de releitura final (humano revisando antes de sair)
    if (Math.random() < 0.15 && socket?.sendPresenceUpdate) {
      await socket.sendPresenceUpdate("paused", jid);
      const reread = randInt(2000, 5000);
      await sleep(reread);
    }

    await sleep(stay);
    return stay;
  } catch (err) {
    console.error("[simulateAfter] Erro:", err?.message ?? err);
    return 0;
  }
}

/* -------------------------------  FILA  --------------------------------- */
async function enqueueMessage(item = {}) {
  const q = new Queue();
  q.datetime = lib.date.timestamp.generate();
  q.contact_jid = item.contact_jid;
  q.status = "Pendente";
  q.user_id = item.user_id;
  if (item.priority) q.priority = item.priority;
  await q.create();
}

/* --------------------------  PROCESSADOR  ------------------------------- */
async function processQueue(worker_id) {
  while (true) {
    let msg = null;

    try {
      const results = await Queue.filter({
        in_params: {
          keys: ["status"],
          values: [[["Pendente"]]]
        },
        order_params: [["queue.priority", "desc"], ["queue.datetime", "asc"]],
        limit: 1
      });

      msg = results?.[0];
      if (!msg) {
        await sleep(randInt(800, 3000));
        continue;
      }

      // 🔒 RESERVA IMEDIATA
      const qProc = new Queue();
      qProc.id = msg.id;
      qProc.status = "Processando";
      await qProc.update();

      const session = getSession(msg.user_id);
      if (!session || !session.sock) {
        console.log({ msg: `Sessão WhatsApp não conectada! (${worker_id})` });

        // devolve para fila
        const qBack = new Queue();
        qBack.id = msg.id;
        qBack.status = "Pendente";
        await qBack.update();

        await sleep(randInt(15000, 30000));
        continue;
      }

      let queue_delay = randInt(9000, 47000);
      await sleep(queue_delay);

      const profile = pickProfile();
      await sleep(randInt(800, 3000));

      await simulateTypingHuman(
        session.sock,
        msg.contact_jid,
        msg.message,
        profile
      );

      const updated_contact = (await Contact.findByJid(msg.contact_jid))[0];

      let contact_info = new Contact();
      contact_info.jid = msg.contact_jid;
      contact_info.business = updated_contact.business;
      contact_info.name = updated_contact.name;
      contact_info.flow_step = parseInt(updated_contact.flow_step);
      contact_info.segment = updated_contact.segment;
      contact_info.seller_id = msg.user_id;

      let send_response = await SendByAi(contact_info);

      if (!send_response) {
        const qBack = new Queue();
        qBack.id = msg.id;
        qBack.status = "Pendente";
        await qBack.update();

        continue;
      }

      const qSent = new Queue();
      qSent.id = msg.id;
      qSent.status = "Enviado";
      await qSent.update();

      await sleep(randInt(800, 2500));

    } catch (err) {
      console.log(err);

      if (msg?.id) {
        const qBack = new Queue();
        qBack.id = msg.id;
        qBack.status = "Pendente";
        await qBack.update();
      }

      await sleep(randInt(1000, 5000));
    }
  }
};

/* ------------------------------  EXPORTS  ------------------------------- */

module.exports = {
  enqueueMessage,
  processQueue,
  simulateTypingHuman,
  simulateAfter,
  pickProfile
};