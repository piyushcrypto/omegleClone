const express = require('express');
const fs = require('fs');
const app = express();
const axios = require('axios');
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer, {
  cors: {
    origin: '*', // update this to match the client's origin
    methods: ["GET", "POST"]
  }
});

app.set('trust proxy', 1);

const cors = require('cors');

// Enable all CORS requests
app.use(cors());

const waitingUsers = []; // Queue of waiting users
const matchedUsers = {}; // Object to track matched users

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Ask for camera and microphone permissions
    socket.emit('permissionRequest');

    // Handle permission response from the client
    socket.on('permissionResponse', (permission) => {
        if (permission === 'granted') {
            // User granted permission, enable video chat
            socket.videoEnabled = true;
        } else {
            // No permission for video, only enable chat
            socket.videoEnabled = false;
        }

        // Add user to the waiting queue
        waitingUsers.push(socket);

        // Attempt to match users when there are enough people waiting
        if (waitingUsers.length >= 2) {
            const user1 = waitingUsers.shift();
            const user2 = waitingUsers.shift();

            const roomID = `room_${user1.id}_${user2.id}`;

            // Create a room for the matched users
            user1.join(roomID);
            user2.join(roomID);

            // Track matched users and their video capabilities
            matchedUsers[user1.id] = { roomID, videoEnabled: user1.videoEnabled };
            matchedUsers[user2.id] = { roomID, videoEnabled: user2.videoEnabled };

            // Notify users about the match and their video mode
            user1.emit('match', { roomID, videoEnabled: user1.videoEnabled });
            user2.emit('match', { roomID, videoEnabled: user2.videoEnabled });
        }
    });

    // Handle chat and video events within the room
    socket.on('chatMessage', (message) => {
        const user = matchedUsers[socket.id];
        if (user && io.sockets.adapter.rooms.get(user.roomID)) {
            io.to(user.roomID).emit('chatMessage', message);
        } else {
            socket.emit('errorMessage', 'Chat room not found');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        const user = matchedUsers[socket.id];
        if (user && io.sockets.adapter.rooms.get(user.roomID)) {
            // Notify the other user about disconnection
            socket.to(user.roomID).emit('userDisconnected');
            
            // Remove the users from the matched users object
            delete matchedUsers[socket.id];
        }

        // Remove disconnected user from the waiting queue
        const index = waitingUsers.indexOf(socket);
        if (index !== -1) {
            waitingUsers.splice(index, 1);
        }
    });
});

// Handle server error events
io.on('error', (error) => {
    console.error('Server error:', error);
    // Implement appropriate error handling, e.g., restart server, log the error, etc.
});

httpServer.listen(8000, () => {
    console.log(`Server is up and running.....`);
});