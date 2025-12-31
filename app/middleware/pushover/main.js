const fetch = require("node-fetch");

class PushoverService {
  static async notify({ title, message, priority = 0 }) {
    if (!message) return;

    return fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: process.env.PUSHOVER_APP_TOKEN,
        user: process.env.PUSHOVER_USER_KEY,
        title,
        message,
        priority
      })
    });
  }
}

module.exports = PushoverService;