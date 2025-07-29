const wsEmitter = require('./emitter'); // EventEmitter global
const activeWebSockets = require('./connectionStore'); // <== Aqui

const websocketHandler = async (ws, req) => {
  const sessionID = req.sessionID;
  ws.send(JSON.stringify({ type: "websocketKey", key: sessionID }));

  console.log('Novo WebSocket conectado: ' + sessionID);
  activeWebSockets.set(sessionID, ws);

  ws.on('close', () => {
    activeWebSockets.delete(sessionID);
  });
};

module.exports = websocketHandler;