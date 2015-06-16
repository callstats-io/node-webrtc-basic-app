
var localVideo;
var localStream;
var userPCs = [];
var isChannelReady = false;
var calls;

var room = 'foo';
console.log("Room is " + room);

var temp = Math.floor(Math.random()*10000);
var myUserId = temp.toString();

var constraints = {
  audio: true,
  video: true
};

var socket = io.connect();

if (room !== '') {
  console.log('participant', room,myUserId);
  //socket.emit('participant', room,myUserId);
  doGetUserMedia(function(status){
    if (status === true) {
      socket.emit('participant', room,myUserId);
    }
  });
}

socket.on('created', function (room){
  console.log('Created room ' + room);
  //isInitiator = true;
});

socket.on('newUserJoined', function (userId){
  console.log('This peer has joined ' + userId);
  //isInitiator = true;
  if(userId !== myUserId)
    isChannelReady = true;
  var _div = 'videos';
  if ((userId !== myUserId) && (isChannelReady === true)) {
    console.log("newUser detected. Invoking call()");

    userPCs[userId] = new PeerConnectionChannel(userId,myUserId,_div,localStream);

    userPCs[userId].call(function(status){
      if (status===true) {
        if (localStream === null)
          localStream = userPCs[userId].getLocalStream();
      }
    });
  }
});

socket.on('log', function (array){
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message,to,from){
  console.log('Client sending message: ', message);
  socket.emit('message', message,to,from);
}

socket.on('onSignaling', function (message,to,from) {
  console.log("onSignaling called; msg=" + message);
  onSignaling(message,to,from);
});

onSignaling = function(message,to,from) {
  var msg = message;
  if ((userPCs[to] === undefined) || (userPCs[to] === null)) {
    // var msg = JSON.parse(message);
    if (msg.type === "bye") {
      console.log("bye message", message);
      userPCs[to]=null;
    } else {
      //Call does not exist
      //var _div = document.getElementById('videos');
      var _div = 'videos';
      console.log("Call does not exist, create one ",localStream,msg.type);
      userPCs[to] = new PeerConnectionChannel(to,from,_div,localStream);

      //stats.beginFabricMonitoring(confID);

      userPCs[to].answer(function(status){
        if (status === true) {
          console.log("Call is received now");
          calls++;
          if (localStream === null)
            localStream = userPCs[to].getLocalStream();
            userPCs[to].onChannelMessage(message);
        }
      });
    }
  } else if (userPCs[to]) {
    console.log("Call does  exist,no need to create one");
    userPCs[to].onChannelMessage(message);
    // var msg = JSON.parse(message);
    if (msg.type === "bye") {
      var pc = userPCs[to].getPeerConnection();
      userPCs[to]=null;
      calls = calls - 1;
      console.log("bye message counter", message, calls);
      if (calls === 0) {
        console.log("userLeave");
      }
    }
  } else {
    console.log("Unexpected error, message:" + message);
  }
};



function successCallback(stream) {
  window.stream = stream; // stream available to console
  if (window.URL) {
    localVideo.src = window.URL.createObjectURL(stream);
  } else {
    localVideo.src = stream;
  }
  localStream = stream;
  console.log("Local Stream in success is ",localStream);
}

//error callback function for getUserMedia
function errorCallback(error) {
  console.log('navigator.getUserMedia error: ', error);
}

function doGetUserMedia(callback)
{
    localVideo = document.querySelector('#localVideo');
    console.log("Do get User Media");
    getUserMedia(constraints, function(stream) {
          console.log("User has granted access to local media.");
          attachMediaStream(localVideo,stream);
          localVideo.style.opacity = 1;
          localStream = stream;
          if (callback)
              callback(true);
          },errorCallback);
}






