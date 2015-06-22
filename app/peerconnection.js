
PeerConnectionChannel = function(to,from,div,localStreamParam,onPCInitialized)
{
  this.div = div;
  this.from = from;
  this.to = to;
  var localStream;
  var remoteStream;
  var pc;
  var isInitiator = false;
  var isCallStarted = false;
  var localVideo;
  var remoteVideo;
  var isCallActive = false;

  var onPCInitializedCallback = onPCInitialized;

  var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};

  var pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true}]};

  // Set up audio and video regardless of what devices are present.
  var sdpConstraints = {'mandatory': {
    'OfferToReceiveAudio':true,
    'OfferToReceiveVideo':true }};

  var constraints = {
    audio: true,
    video: true
  };

  if (localStreamParam !== null) {
    //console.log("Stream added previously ",localStreamParam,localStream);
    localStream = localStreamParam;
  }

  this.getLocalStream = function(){
    return localStream;
  };

  this.call = function(callback){
    //stats.call(17,function(err,msg){ console.log("err="+err+" msg="+msg) });
    setLocalVideo();
    setRemoteVideo(to,function(status){
      if (status === true) {
        isInitiator = true;
        doGetUserMedia(function(status){
          if (status === true) {
            callback(true);
          }
        });
      } else {
        //Build remotevideo tag
        return false;
      }
    });
  };

  this.answer = function(callback){
    //stats.call(17,function(err,msg){ console.log("err="+err+" msg="+msg) });
    setLocalVideo();
    setRemoteVideo(to,function(status){
      if (status === true) {
        doGetUserMedia(function(status){
          if (status === true) {
            callback(true);
          }
        });
      } else {
        //Build remotevideo tag
        return false;
      }
    });
  };

  this.getPeerConnection = function() {
    return pc;
  };

  this.hangup = function() {
    if(pc)
      pc.close();
  };


  this.onChannelMessage = function(message) {
    processSignalingMessage(message);
  };

  function processSignalingMessage(message) {
    //console.log("processSignalingMessage: %o",message);
    if (message.type === 'offer') {
      // Callee creates PeerConnection
      console.log("Initiator and is call started ",isInitiator,isCallStarted);
      if (!isInitiator && !isCallStarted) {
        maybeStart();
      }
      pc.setRemoteDescription(new RTCSessionDescription(message));
      doAnswer();
    } else if (message.type === 'answer' && isCallStarted) {
      pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate' && isCallStarted) {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      pc.addIceCandidate(candidate);
    } else if (message.type === 'bye' && isCallStarted) {
      console.log("WebRTC: received Hangup");
      onRemoteHangup();
    }
  }

  function onRemoteHangup(){
    stop();
  }

  function maybeStart() {
    console.log("maybeStart local stream is ",localStream)
    if (!isCallStarted && localStream) {
      console.log("may be start call");
      createPeerConnection();
      isCallStarted = true;
      if (isInitiator)
        doCall();
    }
  }

  function createPeerConnection() {
    try {
      pc = new RTCPeerConnection(pc_config,{optional: [{RtpDataChannels: true},{DtlsSrtpKeyAgreement: false}]});
      pc.addStream(localStream);
      pc.onicecandidate = handleIceCandidate;
      pc.onaddstream = handleRemoteStreamAdded;
      pc.onremovestream = handleRemoteStreamRemoved;
      pc.onnegotiationneeded = handleOnNegotiationNeeded;
      console.log('Created RTCPeerConnnection');
    } catch (e) {
      console.log('Failed to create PeerConnection, exception: ' + e.message);
      alert('Cannot create RTCPeerConnection object.');
      return;
    }
  }

  function handleOnNegotiationNeeded(event) {
    console.log("handleOnNegotiationNeeded");
    //pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
    if(isCallActive)
      doCall();
  }

  function handleIceCandidate(event) {
    console.log('handleIceCandidate event: ', event);
    if (event.candidate) {
      sendMessage({
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate},to,from);
    } else {
      console.log('End of candidates.');
    }
  }

  function handleRemoteStreamAdded(event) {
    console.log('Remote stream added.');
    remoteVideo.src = window.URL.createObjectURL(event.stream);
    remoteStream = event.stream;
    isCallActive = true;
  }

  function handleCreateOfferError(event){
    console.log('createOffer() error: ', e);
  }

  function doCall() {
    console.log('Sending offer to peer');
    pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
    setRemoteVideo(to,function(status){});

  }

  function doAnswer() {
    console.log("do answer");
    pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
    setRemoteVideo(to,function(status){});

  }

  function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event: ', event);
  }

  function stop() {
    pc.close();
    pc = null;
    remoteVideo.style.opacity = 0;
    remoteVideo.src = "";
    var _div = document.getElementById(div);
    _div.removeChild(remoteVideo);
    isInitiator = false;
    isCallStarted = false;
    isCallActive = false;
  }

  //error callback function for getUserMedia
  function errorCallback(error) {
    console.log('navigator.getUserMedia error: ', error);
  }

  function doGetUserMedia(callback)
  {
    console.log("Do get User Media");
    if (!localStream) {
      getUserMedia(constraints, function(stream) {
          console.log("User has granted access to local media.");
          attachMediaStream(localVideo,stream);
          localVideo.style.opacity = 1;
          localStream = stream;
          // Caller creates PeerConnection.
          if (isInitiator) maybeStart();
          if (callback)
            callback(true);
        },errorCallback);
    }
    else {
      if (isInitiator) maybeStart();
      if(callback)
        callback(true);
    }
  }

  function getElement(input,callback) {
    //console.log("Getting element form DOM: "+input);
    var element;
    if (typeof input === 'string') {
      //element = document.getElementById(input) || document.getElementsByTagName( input )[0];
      element = document.getElementById('video_'+input);
    } else if (!input) {
      callback(false);
    }
    callback(element);
  }

  setLocalVideo = function() {
    localVideo = document.querySelector('#localVideo');
  }

  setRemoteVideo = function(tag,callback) {
    getElement(tag, function(element)
    {
      if (element===false || element === null)
      {
        var _div = document.getElementById(div);
        remoteVideo = document.createElement("video");
        remoteVideo.setAttribute("id",'video_'+tag);
        remoteVideo.setAttribute("autoplay","autoplay");
        remoteVideo.setAttribute("style","-webkit-transition: opacity 2s; opacity: 1; margin-right: 3px;");
        remoteVideo.setAttribute("height","240px");
        remoteVideo.setAttribute("onclick","mainWindow(this)");
        _div.appendChild(remoteVideo);
        callback(true);
      } else {
        remoteVideo = element;
        callback(true);
      }
    });
  }

  function setLocalAndSendMessage(sessionDescription) {
    // Set Opus as the preferred codec in SDP if Opus is present.
    //sessionDescription.sdp = preferOpus(sessionDescription.sdp);
    pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message' , sessionDescription);
    onPCInitializedCallback(pc,to);
    sendMessage(sessionDescription,to,from);
  }
}