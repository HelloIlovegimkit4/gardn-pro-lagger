const WebSocket = require('ws');


const messages = {
  spawn: '020668696775797A00',
  heartbeat: '01000000',
  connect: '0000c39c5889c7b4aaed68',
  death: '0180ac0280ac0200',
  movement: '0180ac020000',
  custom: '051f626f6f6d666461206f72206869677579732062657374207363726970746572'
};


const numConnections = 50;
const maxRetries = 3;
const retryDelay = 2000;
const connectionDelay = 100;


setInterval(() => {}, 1000 * 60 * 60);


function createConnection(retryCount = 0) {
  const ws = new WebSocket('wss://gardn.pro/ws/');
  ws.binaryType = 'arraybuffer';

  let heartbeatInterval;

  ws.on('open', () => {
    if (ws.readyState === WebSocket.OPEN) {
      sendBinaryMessage(ws, messages.spawn);
      sendBinaryMessage(ws, messages.connect);
      sendBinaryMessage(ws, messages.death);
      sendBinaryMessage(ws, messages.movement);
    }

    heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        sendBinaryMessage(ws, messages.heartbeat);
        sendBinaryMessage(ws, messages.movement);
        sendBinaryMessage(ws, messages.custom);
      }
    }, 800);

    ws.on('close', () => {
      clearInterval(heartbeatInterval);
      if (retryCount < maxRetries) {
        setTimeout(() => createConnection(retryCount + 1), retryDelay + Math.random() * 100);
      }
    });
  });

  ws.on('error', () => {
    if (retryCount < maxRetries) {
      setTimeout(() => createConnection(retryCount + 1), retryDelay + Math.random() * 100);
    }
  });
}

function hexToArrayBuffer(hex) {
  try {
    return Buffer.from(hex.replace(/[^0-9a-fA-F]/g, ''), 'hex');
  } catch {
    return null;
  }
}

function sendBinaryMessage(ws, hex) {
  try {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const buffer = hexToArrayBuffer(hex);
    if (buffer) {
      ws.send(buffer, { binary: true });
    }
  } catch {
  }
}
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

(function connectAll(i = 0) {
  if (i < numConnections) {
    createConnection();
    setTimeout(() => connectAll(i + 1), connectionDelay);
  }
})();

process.on('SIGINT', () => {
  process.exit();
});
