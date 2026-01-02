const webpush = require("web-push");
const fs = require("fs");
const path = require("path");

// 📁 mesmo diretório deste arquivo
const SUBSCRIPTION_FILE = path.join(__dirname, "subscriptions.json");

webpush.setVapidDetails(
  "mailto:lead@prospector.com",
  process.env.VAPID_PUBLIC,
  process.env.VAPID_PRIVATE
);

function loadAll() {
  if (!fs.existsSync(SUBSCRIPTION_FILE)) return [];

  try {
    const raw = fs.readFileSync(SUBSCRIPTION_FILE, "utf8");
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    // garante array
    if (Array.isArray(parsed)) return parsed;
    if (parsed?.endpoint) return [parsed];

    return [];
  } catch (err) {
    console.error("❌ Erro ao ler subscriptions:", err.message);
    return [];
  }
}

function saveAll(list) {
  // escrita atômica no mesmo diretório
  const tmp = SUBSCRIPTION_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
  fs.renameSync(tmp, SUBSCRIPTION_FILE);
}

function setSubscription(subscription) {
  if (!subscription?.endpoint) return;

  const list = loadAll();

  // evita duplicar o mesmo device
  if (list.some(s => s.endpoint === subscription.endpoint)) return;

  list.push(subscription);
  saveAll(list);
}

async function pushNotification({ title, body }) {
  const list = loadAll();
  if (!list.length) return;

  const payload = JSON.stringify({ title, body });
  const valid = [];

  for (const sub of list) {
    try {
      await webpush.sendNotification(sub, payload);
      valid.push(sub);
    } catch (err) {
      // 410 = subscription expirada
      if (err.statusCode !== 410) {
        valid.push(sub);
      }
    }
  }

  saveAll(valid);
}

module.exports = {
  setSubscription,
  pushNotification
};