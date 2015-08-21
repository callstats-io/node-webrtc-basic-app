
var localVideo;
var localStream;
var userPCs = [];
var isChannelReady = false;
var calls;

var isScreenSharingOn = false;
var isFirefox = false;
var isChrome = false;

var room = 'foo';
console.log("Room is " + room);

var temp = Math.floor(Math.random()*10000);
var myUserId = temp.toString();

var constraints = {
  audio: true,
  video: true
};

var socket = io.connect();

if (room !== ''){
  console.log('participant', room,myUserId);
  //socket.emit('participant', room,myUserId);
  doGetUserMedia(function(status){
    if (status === true) {
      socket.emit('participant', room,myUserId);
    }
  });
}

if(window.navigator.userAgent.match('Chrome')) {
  isChrome = true;
  isFirefox = false;
}
else if (window.navigator.userAgent.match('Firefox')) {
  isChrome = false;
  isFirefox = true;
}

var appConfig = AppConfiguration();
var appId = appConfig.appId;
var appSecret = appConfig.appSecret;

var callStats = new callstats($,io,jsSHA);

function csInitCallback (err, msg){
  console.log("CallStats Initializing Status: err="+err+" msg="+msg);
}

function getMinQuality (quality) {
  var i;
  var retQuality = 0;
  var retQualityString;
  for (i = 0; i < quality.length; i++) {
    var tempQuality;
    if (quality[i] === "excellent") {
      tempQuality = 3;
    } else if (quality[i] === "fair") {
      tempQuality = 2;
    } else if (quality[i] === "bad") {
      tempQuality = 1;
    }
    if (retQuality === 0 || tempQuality < retQuality) {
      retQuality = tempQuality;
    }
  }

  if (retQuality === 1) {
    retQualityString = "Red";
  } else if (retQuality === 2) {
    retQualityString = "Yellow";
  } else if (retQuality === 3) {
    retQualityString = "Green";
  }
  return retQualityString;
}


function statsCallback (stats){
  console.log("processed stats ",stats);
  var $bitrate = $('#bitrate');
  var $network = $('#network');

  $network.text(stats.connectionState+"/"+stats.fabricState);

  var userId;
  var bitrateForSsrc = 0;
  var quality = [];
  for(userId in userPCs)
  {
    bitrateForSsrc = 0;
    var $bitratetemp = $('#bitrate_'+userId);
    var $networktemp = $('#network_'+userId);
    var $qualitytemp = $('#quality_'+userId);
    var ssrcs = userPCs[userId].getSSRCs();
    $networktemp.text(stats.connectionState+"/"+stats.fabricState);
    var ssrc;
    var reportType;
    var i;
    quality = [];
    for( i = 0; i < ssrcs.length; i++) {
      ssrc = ssrcs[i];
      if(stats.streams[ssrc]) {
        if(stats.streams[ssrc].bitrate) {
          bitrateForSsrc = bitrateForSsrc + stats.streams[ssrc].bitrate;
        }
        if(stats.streams[ssrc].quality) {
          quality.push(stats.streams[ssrc].quality);
        }
      }
    }
    if(bitrateForSsrc > 0) {
      bitrateForSsrc = bitrateForSsrc.toFixed(2);
      $bitratetemp.text(bitrateForSsrc+"Kbps");
      var processedQuality = getMinQuality(quality);
      $qualitytemp.text("Q - "+processedQuality);
      console.log("Quality is ",quality);
    }
    console.log("Userid and ssrcs ",userId,ssrcs);
  }
}


function csReportErrorCallback (err, msg){
  console.log("CallStats report  error: err="+err+" msg="+msg);
}

callStats.initialize(appId, appSecret, myUserId, csInitCallback,statsCallback);

document.getElementById("switchBtn").onclick = switchScreen;

var onPCInitialized = function(pc, receiver){
  console.log("Add new Fabric event to CS ",pc);
  callStats.addNewFabric(pc, receiver, callStats.fabricUsage.multiplex, room, csCallback);
}

var onPCConnectionError = function(pc,error,funcname) {
  callStats.sendFabricEvent(pc, callStats.fabricEvent.fabricSetupFailed, room);
  if(funcname === "createOffer") {
    console.log("PC Connection Error in  createOffer",error);
    callStats.reportError(pc,room,callStats.webRTCFunctions.createOffer,error);
  } else if (funcname === "createAnswer") {
    console.log("PC Connection Error createAnswer",error);
    callStats.reportError(pc,room,callStats.webRTCFunctions.createAnswer,error);
  }

  //callStats.sendFabricEvent(pc,callStats.fabricEvent.fabricSetupFailed,room);
}

function switchScreen(){
    console.log("Switch Screen ",isScreenSharingOn);
    var pc;
    for(userId in userPCs)
    {
      pc = userPCs[userId].getPeerConnection();
      break;
    }
    if(isScreenSharingOn)
    {
      callStats.sendFabricEvent(pc, callStats.fabricEvent.videoResume, room);
      if(isChrome) {
        removeLocalStream();
      }
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
      callStats.sendFabricEvent(pc, callStats.fabricEvent.videoPause, room);
      if(isChrome){
        removeLocalStream();
      }
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
    userPCs[userId] = new PeerConnectionChannel(userId,myUserId,_div,localStream,onPCInitialized,onPCConnectionError);
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


function addLocalStream(){
  console.log("addLocalStream: %o",userPCs);
  for(userId in userPCs)
  {
    var pc = userPCs[userId].getPeerConnection();
    pc.addStream(localStream);
    console.log("Local stream: %o", localStream);
    //callStats.associateMstWithUserId(pc, userId, "foo", );
    if(isFirefox)
    {
      userPCs[userId].doCallIfActive();
    }
  }
}

function removeLocalStream(){
  for(userId in userPCs)
  {
    var pc = userPCs[userId].getPeerConnection();
    //pc.removeStream(localStream);
  }
}

function endCalls(){
  for(var username in userPCs) {
    var chan = userPCs[username];
    var pc = userPCs[username].getPeerConnection();
    sendMessage({type: 'bye'},chan.to,chan.from);
    callStats.sendFabricEvent(pc,callStats.fabricEvent.fabricTerminated,room);
    pc.close();
  }
}

window.addEventListener("beforeunload", function (e){
  endCalls();
});


////////////////////////////////////////////////

function sendMessage(message,to,from){
  console.log('Client sending message: ', message);
  socket.emit('signaling', message,to,from);
}

socket.on('onSignaling', function (message,to,from){
  console.log("onSignaling called; msg=" + message);
  onSignaling(message,to,from);
});

onSignaling = function(message,to,from){
  var msg = message;
  if ((userPCs[to] === undefined) || (userPCs[to] === null)) {
    if (msg.type === "bye") {
      console.log("bye message", message);
      var pc = userPCs[to].getPeerConnection();
      callStats.sendFabricEvent(pc,callStats.fabricEvent.fabricTerminated,room);
      userPCs[to]=null;
    } else {
      var _div = 'videos';
      console.log("Call does not exist, create one ",localStream,msg.type);
      userPCs[to] = new PeerConnectionChannel(to,from,_div,localStream,onPCInitialized,onPCConnectionError);
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
      callStats.sendFabricEvent(pc,callStats.fabricEvent.fabricTerminated,room);
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
function errorCallback(error){
  console.log('navigator.getUserMedia error: ', error);
}

function doGetUserMedia(callback){
  if(isChrome) {
    constraints = {
      audio: { optional: [{ echoCancellation: false, googTypingNoiseDetection: false,
        googHighpassFilter: false,
        googNoiseSuppression: false,
        googAutoGainControl: false,
        googEchoCancellation: false }] },
      video: true
    };
  } else {
    constraints = {
      audio: true,
      video: true
    };
  }

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

function csCallback (err, msg){
  console.log("StatsRTC: remote-id ", " status: ", err, " msg: ", msg);
}

function dogetScreenShare(callback){
  if(window.navigator.userAgent.match('Chrome')) {
    console.log("dogetChromeScreenShare");
    dogetChromeScreenShare(callback);
  }
  else if (window.navigator.userAgent.match('Firefox')) {
    console.log("dogetFirefoxScreenShare");
    dogetFirefoxScreenShare(callback);
  }

}

function dogetFirefoxScreenShare(callback){
  constraints = {audio: false,
    video: {
        mozMediaSource: 'window',
        mediaSource: 'window',
        maxWidth: 1920,
        maxHeight: 1080,
        minAspectRatio: 1.77
    }
  }
  getUserMedia(constraints, function (stream) {
    // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1045810
    console.log("firefox sucess callback");
    localVideo = document.querySelector('#localVideo');
    var lastTime = stream.currentTime;
    attachMediaStream(localVideo,stream);
    localVideo.style.opacity = 1;
    localStream = stream;
    var polly = window.setInterval(function () {
        if (!stream) window.clearInterval(polly);
        if (stream.currentTime == lastTime) {
            window.clearInterval(polly);
            if (stream.onended) {
                stream.onended();
            }
        }
        lastTime = stream.currentTime;
    }, 500);
    if (callback)
      callback(true);

  },errorCallback);
}

function successCallback (arg) {
  console.log("Chrome Extension Installed suceesfully");
  window.sessionStorage.setItem('getCSIOScreenMediaExtensionId','egdciadhlclicjafgmdlfigkdhipggck');
}

function failureCallback (arg) {
  console.log("Chrome Extension Installed failed");
}


function dogetChromeScreenShare(callback){
  localVideo = document.querySelector('#localVideo');
  console.log("In dogetScreenShare ",window.sessionStorage.getItem('getCSIOScreenMediaExtensionId'));
  if (window.sessionStorage.getCSIOScreenMediaExtensionId) {
    chrome.runtime.sendMessage(window.sessionStorage.getCSIOScreenMediaExtensionId,
        {type:'getScreen', id: 1}, null,
        function (data) {
          if (data.sourceId === '') { // user canceled
            var error = new Error('NavigatorUserMediaError');
            error.name = 'PERMISSION_DENIED';
            console.log(error.name);
            callback(error);
          } else {
            var constraints = {audio: false, video: {
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
  } else {
    chrome.webstore.install("https://chrome.google.com/webstore/detail/egdciadhlclicjafgmdlfigkdhipggck",
            successCallback, failureCallback);
  }
}




