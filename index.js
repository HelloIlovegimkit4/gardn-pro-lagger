const WebSocket = require('ws');
// Import HttpsProxyAgent correctly for newer versions
const { HttpsProxyAgent } = require('https-proxy-agent');

// List of proxies (format: 'http://ip:port')
const proxies = [
  'add ur proxies here',
];

const messages = {
  spawn: '020668696775797A00', // this spawns them in with the name higuyz
  heartbeat: '01000000', // just a keep alive packet
  connect: '00001a2b3c4d5e6f7aed68', // keep this the same it connects them
  death: '0180ac0280ac0200', // don't do anything with this don't add it anywhere unless you want them to die and disconnect at a point
  movement: '0180ac020000', // moves them to the right
  custom: '051f626f6f6d666461206f72206869677579732062657374207363726970746572' // sends a message
};

const numConnections = 500;
const maxRetries = 3;
const retryDelay = 1000;


setInterval(() => {}, 1000 * 60 * 60);
function createConnection(proxyIndex = 0, retryCount = 0) {
  const proxy = proxies[proxyIndex % proxies.length];
  const agent = new HttpsProxyAgent(proxy);
  const ws = new WebSocket('wss://gardn.pro/ws/', { agent });
  ws.binaryType = 'arraybuffer';

  let heartbeatInterval;

  ws.on('open', () => {
    console.log(`Connected through proxy: ${proxy}`);
    if (ws.readyState === WebSocket.OPEN) {
      sendBinaryMessage(ws, messages.connect);
      sendBinaryMessage(ws, messages.spawn);
      sendBinaryMessage(ws, messages.movement);
    }
    heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        sendBinaryMessage(ws, messages.heartbeat);
        sendBinaryMessage(ws, messages.movement);
        sendBinaryMessage(ws, messages.custom);
      }
    }, 800);
  });

  ws.on('close', () => {
    clearInterval(heartbeatInterval);
    if (retryCount < maxRetries) {
      console.log(`Retrying connection through proxy ${proxy} (Attempt ${retryCount + 1}/${maxRetries})`);
      setTimeout(() => createConnection(proxyIndex, retryCount + 1), retryDelay);
    }
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error with proxy ${proxy}: ${error.message}`);
    if (retryCount < maxRetries) {
      const nextProxyIndex = (proxyIndex + 1) % proxies.length;
      setTimeout(() => createConnection(nextProxyIndex, retryCount + 1), retryDelay);
    }
  });
}

function hexToArrayBuffer(hex) {
  if (!hex || typeof hex !== 'string' || hex.length % 2 !== 0) {
    return null;
  }
  hex = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.substr(i, 2), 16);
    if (isNaN(byte)) {
      return null;
    }
    bytes.push(byte);
  }
  const buffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(buffer);
  view.set(bytes);
  return buffer;
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
  } catch (error) {
    console.error(`Error sending message: ${error.message}`);
  }
}

process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
});
process.on('unhandledRejection', (reason) => {
  console.error(`Unhandled Rejection: ${reason}`);
});

for (let i = 0; i < numConnections; i++) {
  createConnection(i);
}

process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit();
});
