
PeerConnectionChannel = function(to,from,div,localStreamParam,onPCInitialized,onPCError)
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
  var remotevideoText;
  var isCallActive = false;
  var ssrcs = [];

  var onPCInitializedCallback = onPCInitialized;
  var onPCErrorCallback = onPCError;

//  var stun_server = {
  //  urls: 'stun:stun.l.google.com:19302'
 // };

  var turn_server = {
    url: 'turn:turn-server-1.dialogue.io:3478',
    username: 'test',
    credential: '1234',
    realm: 'reTurn'
  };


  var turn_server_tls = {
    url: 'turn:turn-server-1.dialogue.io:5349',
    username: 'test',
    credential: '1234',
    realm: 'reTurn'
  };

  var iceServers = [turn_server,turn_server_tls];

  var pc_config = {'iceTransports': 'all','iceServers': iceServers};


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

  this.doCallIfActive = function(){
    if(isCallActive)
      doCall();
  }

  this.getPeerConnection = function() {
    return pc;
  };

  this.hangup = function() {
    if(pc)
      pc.close();
  };

  this.getSSRCs = function() {
    return ssrcs;
  }


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
      console.log("Offer sdp ",message);
      pc.setRemoteDescription(new RTCSessionDescription(message));
      doAnswer();
    } else if (message.type === 'answer' && isCallStarted) {
      console.log("Answer sdp ",message);
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
      pc = new RTCPeerConnection(pc_config,{optional: [{RtpDataChannels: true},{DtlsSrtpKeyAgreement: true}]});
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

    if ( window.webkitURL ) {
      attachMediaStream(remoteVideo,event.stream);
    } else if ( window.URL && window.URL.createObjectURL ) {
      remoteVideo.src = window.URL.createObjectURL( event.stream );
    } else {
      console.log('Remote stream not added.');
        //return null;
    }

    var validLine = RegExp.prototype.test.bind(/^([a-z])=(.*)/);
    var reg = /^ssrc:(\d*) ([\w_]*):(.*)/;
    pc.remoteDescription.sdp.split(/(\r\n|\r|\n)/).filter(validLine).forEach(function (l) {
        var type = l[0];
        var content = l.slice(2);
        if(type === 'a') {
          if (reg.test(content)) {
            var match = content.match(reg);
            if(($.inArray(match[1],ssrcs) === -1)) {
              ssrcs.push(match[1]);
            }
          }
        }
      });
    console.log("Available SSRCS: %o", ssrcs);
    console.log("Remote ID: %o",to);
    ssrcs.forEach(function(ssrc) {
      window.callStats.associateMstWithUserID(pc, to, "foo", ssrc, "camera");
    });

    //remoteVideo.src = window.URL.createObjectURL(event.stream);
    remoteStream = event.stream;
    isCallActive = true;
  }

  function handleCreateOfferError(event){
    console.log('createOffer() error: ', event);
      onPCErrorCallback(pc,event,"createOffer");
  }

  function doCall() {
    console.log('Sending offer to peer');
    onPCInitializedCallback(pc,to);
    pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
    setRemoteVideo(to,function(status){});

  }

  function doAnswer() {
    console.log("do answer");
    onPCInitializedCallback(pc,to);
    pc.createAnswer(setLocalAndSendMessage, function(error){
      console.log("create answer error ", error);
      onPCErrorCallback(pc,error,"createAnswer");
    }, sdpConstraints);
    setRemoteVideo(to,function(status){});

  }

  function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event: ', event);
  }

  function stop() {
    pc.close();
    pc = null;
    if ( window.webkitURL ) {
      attachMediaStream(remoteVideo, null);
      console.log("remotevideotext is ",remotevideoText);
      var _div = document.getElementById(div);
      console.log("remotevideotext is ",remotevideoText);
      _div.removeChild(remotevideoText);
      _div.removeChild(remoteVideo);
    }
    else {
      remoteVideo.style.opacity = 0;
      remoteVideo.src = "";
      var _div = document.getElementById(div);
      console.log("remotevideotext is ",remotevideoText);
      _div.removeChild(remotevideoText);
      _div.removeChild(remoteVideo);

    }
    console.log("Stop and remove child");
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

        remotevideoText = document.createElement("div");

        var paraBitrate = document.createElement("p");
        var bitrate = document.createTextNode("undefined");
        paraBitrate.setAttribute("id",'bitrate_'+tag);
        paraBitrate.setAttribute("class",'widgetRow');
        paraBitrate.appendChild(bitrate);

        var paraQuality = document.createElement("p");
        var quality = document.createTextNode("Q - undefined");
        paraQuality.setAttribute("id",'quality_'+tag);
        paraQuality.setAttribute("class",'widgetRow');
        paraQuality.appendChild(quality);

        var paraNetwork = document.createElement("p");
        var network = document.createTextNode("undefined");
        paraNetwork.setAttribute("id",'network_'+tag);
        paraNetwork.setAttribute("class",'widgetRow');
        paraNetwork.appendChild(network);

        remotevideoText.setAttribute("id",'widget-overlay'+tag);
        remotevideoText.appendChild(paraBitrate);
        remotevideoText.appendChild(paraQuality);
        remotevideoText.appendChild(paraNetwork);


        _div.appendChild(remoteVideo);
        _div.appendChild(remotevideoText);

        var $vid = $('#video_'+tag);
        var $msg = $('#widget-overlay'+tag);
        $vid.css({
          position: 'relative',
          zIndex: -1
        });
        $msg.css({
            zIndex: 1,
            position:'absolute',
            color: '#000000',
            background: '#e7e7e7',
            top:$vid.offset().top + (($vid.height()-10) - ($msg.height())),
            left:$vid.offset().left+10
        });

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
    console.log("Local SDP ",sessionDescription);
    pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message' , sessionDescription);
    sendMessage(sessionDescription,to,from);
  }
}
