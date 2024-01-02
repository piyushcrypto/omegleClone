const socket = io();
let localStream;
let pc;

socket.on('peer-list', (peerList) => {
  if (peerList.length >= 2) {
    startVideoChat(peerList[0], peerList[1]);
  }
});

function startVideoChat(user1, user2) {
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
      localStream = stream;
      const localVideo = document.getElementById('localVideo');
      localVideo.srcObject = stream;

      pc = new RTCPeerConnection();

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', event.candidate, user2);
        }
      };

      pc.addStream(localStream);

      pc.createOffer()
        .then((offer) => {
          pc.setLocalDescription(offer);
          socket.emit('offer', offer, user2);
        });

      socket.on('offer', (offer, targetSocketId) => {
        pc.setRemoteDescription(new RTCSessionDescription(offer));

        pc.createAnswer()
          .then((answer) => {
            pc.setLocalDescription(answer);
            socket.emit('answer', answer, user1);
          });
      });

      socket.on('answer', (answer) => {
        pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on('ice-candidate', (candidate) => {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      });
    })
    .catch((error) => {
      console.error('Error accessing media devices:', error);
    });
}
