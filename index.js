const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(__dirname + '/public'));

let connectedPeers = [];

io.on('connection', (socket) => {
  console.log('a user connected');

  connectedPeers.push(socket.id);
  io.emit('peer-list', connectedPeers);

  socket.on('disconnect', () => {
    console.log('user disconnected');
    connectedPeers = connectedPeers.filter(peerId => peerId !== socket.id);
    io.emit('peer-list', connectedPeers);
  });

  socket.on('offer', (offer, targetSocketId) => {
    socket.to(targetSocketId).emit('offer', offer, socket.id);
  });

  socket.on('answer', (answer, targetSocketId) => {
    socket.to(targetSocketId).emit('answer', answer);
  });

  socket.on('ice-candidate', (candidate, targetSocketId) => {
    socket.to(targetSocketId).emit('ice-candidate', candidate);
  });
});

server.listen(8000, () => {
  console.log('Server is running on port 8000');
});
