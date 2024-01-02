document.addEventListener('DOMContentLoaded', () => {
    const socket = io('http://localhost:8000');
    let localStream;
    let roomID;

    const chatBox = document.getElementById('chatBox');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    let localVideo = document.getElementById('localVideo');
    let remoteVideo = document.getElementById('remoteVideo');
    const localThumbnailBox = document.getElementById('localThumbnailBox');

    async function getPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            handlePermissionGranted(stream);
            return 'granted';
        } catch (error) {
            console.error('Error accessing media devices:', error);
            return 'denied';
        }
    }

    function handlePermissionGranted(stream) {
        localStream = stream;
        if (localVideo) {
            localVideo.srcObject = stream;
            createLocalThumbnail(stream);
        } else {
            console.error('Local video element not found.');
        }
    }

    function createLocalThumbnail(stream) {
        const localThumbnail = document.createElement('video');
        localThumbnail.srcObject = stream;
        localThumbnail.muted = true;
        localThumbnail.autoplay = true;
        localThumbnail.width = 160;
        localThumbnail.height = 120;
        localThumbnailBox.appendChild(localVideo);
    }

    getPermission().then((permission) => {
        socket.emit('permissionResponse', permission);
    });


    // Function to handle sending chat messages
    sendButton.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message !== '') {
            socket.emit('chatMessage', message);
            displayMessage('You', message); // Display message as 'You' locally
            messageInput.value = '';
        }
    });

    // Event listener for receiving chat messages from server
    socket.on('chatMessage', (sender, message) => {
        if (sender === socket.id) {
            // Display sender's message as 'You'
            displayMessage('You', message);
        } else {
            // Display other users' messages as 'Anonymous'
            displayMessage('Anonymous', message);
        }
    });

    // Function to display chat messages
    function displayMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.textContent = `${sender}: ${message}`;
        chatBox.appendChild(messageElement);
    }

    // Event listener for receiving video call match from server
    socket.on('match', ({ roomId, videoEnabled }) => {
        roomID = roomId; // Set the current room ID
        if (videoEnabled) {
            startVideoChat();
        } else {
            // Video not enabled, handle chat-only mode
        }
    });

    // Function to start video chat
    function startVideoChat() {
        localVideo.srcObject = localStream;
        socket.emit('videoChatReady', roomID);

        socket.on('remoteStream', (stream) => {
            remoteVideo.srcObject = stream;
        });
    }

    // Handle user disconnecting from video chat upon "Esc" key press
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (roomID) {
                socket.emit('leaveRoom', roomID);
                roomID = null;
            }
        }
    });
});
