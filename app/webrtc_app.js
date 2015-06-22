
var localVideo;
var localStream;
var userPCs = [];
var isChannelReady = false;
var calls;

var isScreenSharingOn = false;

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

document.getElementById("switchBtn").onclick = switchScreen;

function switchScreen() {
    if(isScreenSharingOn)
    {
      removeLocalStream();
      doGetUserMedia(function(status){
        if (status === true) {
          //socket.emit('participant', room,myUserId);
          isScreenSharingOn = false;
          addLocalStream();
        }

      });
    }
    else
    {
      removeLocalStream();
      dogetScreenShare(function(status){
        if (status === true) {
          //console.log("Participant");
          //socket.emit('participant', room,myUserId);
          isScreenSharingOn = true;
          addLocalStream();
        }

      });
    }

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


function addLocalStream()
{
  for(userId in userPCs)
  {
    var pc = userPCs[userId].getPeerConnection()
    pc.addStream(localStream);
  }
}

function removeLocalStream()
{
  for(userId in userPCs)
  {
    var pc = userPCs[userId].getPeerConnection()
    pc.removeStream(localStream);
  }
}
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
    if (msg.type === "bye") {
      console.log("bye message", message);
      userPCs[to]=null;
    } else {
      var _div = 'videos';
      console.log("Call does not exist, create one ",localStream,msg.type);
      userPCs[to] = new PeerConnectionChannel(to,from,_div,localStream);
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
    console.log("Call does exist,no need to create one");
    userPCs[to].onChannelMessage(message);
    if (msg.type === "bye") {
      var pc = userPCs[to].getPeerConnection();
      pc.close();
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

function dogetScreenShare(callback)
{
  localVideo = document.querySelector('#localVideo');
  console.log("In dogetScreenShare ",window.sessionStorage.getItem('getScreenMediaJSExtensionId'));
  if (window.sessionStorage.getScreenMediaJSExtensionId) {
            chrome.runtime.sendMessage(window.sessionStorage.getScreenMediaJSExtensionId,
                {type:'getScreen', id: 1}, null,
                function (data) {
                    if (data.sourceId === '') { // user canceled
                        var error = new Error('NavigatorUserMediaError');
                        error.name = 'PERMISSION_DENIED';
                        console.log(error.name);
                        callback(error);
                    } else {
                        var constraints = constraints || {audio: false, video: {
                            mandatory: {
                                chromeMediaSource: 'desktop',
                                maxWidth: window.screen.width,
                                maxHeight: window.screen.height,
                                maxFrameRate: 3
                            },
                            optional: [
                                {googLeakyBucket: true},
                                {googTemporalLayeredScreencast: true}
                            ]
                        }};
                        constraints.video.mandatory.chromeMediaSourceId = data.sourceId;
                        getUserMedia(constraints,function(stream) {
                          console.log("User has granted access to local media.");
                          attachMediaStream(localVideo,stream);
                          localVideo.style.opacity = 1;
                          localStream = stream;
                          if (callback)
                              callback(true);
                          },errorCallback);
                    }
                }
            );
        }

}




