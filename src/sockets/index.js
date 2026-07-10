const { Server } = require('socket.io');
const { registerPythonHandlers } = require('./pythonHandler');
const { initEmitter } = require('./frontendEmitter');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Inisialisasi emitter dengan instance io untuk menghindari circular dependency
  initEmitter(io);

  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Daftarkan handler dari Python ML Pipeline
    registerPythonHandlers(socket);

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = { initSocket, getIO };
