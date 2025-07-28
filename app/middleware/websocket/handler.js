const wsEmitter = require('./emitter'); // EventEmitter global
const activeWebSockets = require('./connectionStore'); // <== Aqui

const websocketHandler = async (ws, req) => {
  const sessionID = req.sessionID;
  ws.send(JSON.stringify({ type: "websocketKey", key: sessionID }));

  console.log('Novo WebSocket conectado: ' + sessionID);

  activeWebSockets.set(sessionID, ws);

  // console.log(activeWebSockets.length);
  // console.log('Novo WebSocket conectado: ' + sessionID);

  // for (const [key, websocket] of activeWebSockets.entries()) {
  //   websocket.send(JSON.stringify({
  //     type: "webhook",
  //     message: "Essa msg!"
  //   }));
  //   // websocket.close();
  // };

  // ws.send(JSON.stringify({ type: "webhook", message: "Pix recebido com sucesso!" }));
  // ws.close();

  ws.on('close', () => {
    activeWebSockets.delete(sessionID);
  });
};

// 🔁 Escuta os eventos emitidos no backend e envia ao WebSocket correspondente
wsEmitter.on('send-to-client', ({ sender, content, raw }) => {
  console.log("sender", sender);
  console.log("content", content);
  console.log("raw", raw);
  ws.send(JSON.stringify({ sender, content, raw }));
});

// const socket = activeWebSockets.get(sessionID);
// if (socket && socket.readyState === 1) { // 1 = OPEN
//   socket.send(JSON.stringify(data));
// } else {
//   console.warn('WebSocket não encontrado ou desconectado para sessão:', sessionID);
// }
module.exports = websocketHandler;