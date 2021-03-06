var localVideo;
var localScreenShare;
var localStream;
var localScreenStream;
var userPCs = [];
var isChannelReady = false;
var calls;

var isScreenSharingOn = false;
var isFirefox = false;
var isChrome = false;
var statsFromBrowser;
var inBoundLocalStatsKeys;
var outBoundLocalStatsKeys;
var inBoundRemoteStatsKeys;
var outBoundRemoteStatsKeys;
var pcKeys;

var room = "foo";
console.log("Room is " + room);

var temp = Math.floor(Math.random() * 10000);
var myUserId = temp.toString();

/**
 * Detect broswer os, name, version info
 * @memberOf callstats
 * @private
 */
function detectBrowserInfo() {
  var nAgt = navigator.userAgent;
  var browserName = navigator.appName;
  var nVer = navigator.appVersion;
  var fullVersion = "" + parseFloat(navigator.appVersion);
  var verOffset;
  var codeBase = {
    goog: "Chrome",
    moz: "Firefox",
    plugin: "Plugin",
    edge: "Edge",
  };

  var codeBaseType;

  // In Opera, the true version is after "Opera" or after "Version"
  if ((verOffset = nAgt.indexOf("Opera")) !== -1) {
    browserName = "Opera";
    fullVersion = nAgt.substring(verOffset + 6);
    if ((verOffset = nAgt.indexOf("Version")) !== -1) {
      fullVersion = nAgt.substring(verOffset + 8);
    }
    codeBaseType = codeBase.goog;
  } else if ((verOffset = nAgt.indexOf("OPR")) !== -1) {
    browserName = "Opera";
    fullVersion = nAgt.substring(verOffset + 4);
    if ((verOffset = nAgt.indexOf("Version")) !== -1) {
      fullVersion = nAgt.substring(verOffset + 8);
    }
    codeBaseType = codeBase.goog;
  } else if ((verOffset = nAgt.indexOf("MSIE")) !== -1) {
    // In MSIE, the true version is after "MSIE" in userAgent
    browserName = "Microsoft Internet Explorer";
    fullVersion = nAgt.substring(verOffset + 5);
    codeBaseType = codeBase.goog;
  } else if ((verOffset = nAgt.indexOf("Edge")) !== -1) {
    browserName = codeBase.edge;
    fullVersion = nAgt.substring(verOffset + 5);
    codeBaseType = codeBase.edge;
  } else if ((verOffset = nAgt.indexOf("Chrome")) !== -1) {
    // In Chrome, the true version is after "Chrome"
    browserName = codeBase.goog;
    fullVersion = nAgt.substring(verOffset + 7);
    codeBaseType = codeBase.goog;
  } else if ((verOffset = nAgt.indexOf("Safari")) !== -1) {
    // In Safari, the true version is after "Safari" or after "Version"
    browserName = "Safari";
    fullVersion = nAgt.substring(verOffset + 7);
    if ((verOffset = nAgt.indexOf("Version")) !== -1) {
      fullVersion = nAgt.substring(verOffset + 8);
    }
    codeBaseType = codeBase.goog;
  } else if ((verOffset = nAgt.indexOf("Firefox")) !== -1) {
    // In Firefox, the true version is after "Firefox"
    browserName = "Firefox";
    fullVersion = nAgt.substring(verOffset + 8);
    codeBaseType = codeBase.moz;
  } else if ((verOffset = nAgt.indexOf("Trident")) !== -1) {
    // IE 11 has no MSIE
    browserName = "Microsoft Internet Explorer";
    verOffset = nAgt.indexOf("rv"); // In IE11, the true version is after "rv"
    fullVersion = nAgt.substring(verOffset + 3, verOffset + 7);
    codeBaseType = codeBase.goog;
  }

  // system
  // source: http://jsfiddle.net/ChristianL/AVyND/
  var osName = null;
  var clientStrings = [
    { s: "Windows 3.11", r: /Win16/ },
    { s: "Windows 95", r: /(Windows 95|Win95|Windows_95)/ },
    { s: "Windows ME", r: /(Win 9x 4.90|Windows ME)/ },
    { s: "Windows 98", r: /(Windows 98|Win98)/ },
    { s: "Windows CE", r: /Windows CE/ },
    { s: "Windows 2000", r: /(Windows NT 5.0|Windows 2000)/ },
    { s: "Windows XP", r: /(Windows NT 5.1|Windows XP)/ },
    { s: "Windows Server 2003", r: /Windows NT 5.2/ },
    { s: "Windows Vista", r: /Windows NT 6.0/ },
    { s: "Windows 7", r: /(Windows 7|Windows NT 6.1)/ },
    { s: "Windows 8.1", r: /(Windows 8.1|Windows NT 6.3)/ },
    { s: "Windows 8", r: /(Windows 8|Windows NT 6.2)/ },
    { s: "Windows 10", r: /(Windows 10|Windows NT 10.0)/ },
    { s: "Windows NT 4.0", r: /(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/ },
    { s: "Windows ME", r: /Windows ME/ },
    { s: "Android", r: /Android/ },
    { s: "Open BSD", r: /OpenBSD/ },
    { s: "Sun OS", r: /SunOS/ },
    { s: "Linux", r: /(Linux|X11)/ },
    { s: "iOS", r: /(iPhone|iPad|iPod)/ },
    { s: "Mac OS X", r: /Mac OS X/ },
    { s: "Mac OS", r: /(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/ },
    { s: "QNX", r: /QNX/ },
    { s: "UNIX", r: /UNIX/ },
    { s: "BeOS", r: /BeOS/ },
    { s: "OS/2", r: /OS\/2/ },
    {
      s: "Search Bot",
      r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/,
    },
  ];

  var id, cs;
  for (id in clientStrings) {
    cs = clientStrings[id];
    if (cs.r.test(nAgt)) {
      osName = cs.s;
      break;
    }
  }

  var osVersion = null;
  if (/Windows/.test(osName)) {
    osVersion = /Windows (.*)/.exec(osName)[1];
    osName = "Windows";
  }

  switch (osName) {
    case "Mac OS X":
      osVersion = /Mac OS X (10[\.\_\d]+)/.exec(nAgt)[1];
      break;
    case "Android":
      osVersion = /Android ([\.\_\d]+)/.exec(nAgt)[1];
      break;
    case "iOS":
      osVersion = /OS (\d+)_(\d+)_?(\d+)?/.exec(nVer);
      osVersion = osVersion[1] + "." + osVersion[2] + "." + (osVersion[3] | 0);
      break;
  }

  return {
    name: browserName,
    ver: fullVersion.toString(),
    os: osName,
    osVersion: osVersion,
    codebase: codeBaseType,
    userAgent: nAgt,
  };
}

var browserInfo = detectBrowserInfo();
console.log("Browser details ", browserInfo);

var codeBaseType = {
  chrome: "Chrome",
  firefox: "Firefox",
  edge: "Edge",
};

var socket = io.connect();

if (window.navigator.userAgent.match("Chrome")) {
  isChrome = true;
  isFirefox = false;
} else if (window.navigator.userAgent.match("Firefox")) {
  isChrome = false;
  isFirefox = true;
}

if (isChrome) {
  constraints = {
    audio: {
      mandatory: {
        googEchoCancellation: true, // disabling audio processing
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: true,
        googTypingNoiseDetection: true,
      },
      optional: [{ echoCancellation: true }],
    },
    video: {
      mandatory: {
        /*minFrameRate: 20000*/
      },
      optional: [],
    },
  };
} else {
  constraints = {
    audio: true,
    video: { width: 4024, height: 4024 },
  };
}

if (window.location.pathname === "/dailystatstest") {
  console.log("Daily stats test, enable fake mozila");
  if (!isChrome) {
    constraints.fake = true;
  }
}

if (room !== "") {
  console.log("participant", room, myUserId);
  //socket.emit('participant', room,myUserId);
  doGetUserMedia(function (status) {
    if (status === true) {
      socket.emit("participant", room, myUserId);
    }
  });
}

var appConfig = AppConfiguration();
var appId = appConfig.appId;
var appSecret = appConfig.appSecret;

var callStats = new callstats();

function csInitCallback(err, msg) {
  console.log("CallStats Initializing Status: err=" + err + " msg=" + msg);
}

function getMinQuality(quality) {
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

function statsCallback(stats) {
  console.log("processed stats ", stats);
  var $bitrate = $("#bitrate");
  var $network = $("#network");

  $network.text(stats.connectionState + "/" + stats.fabricState);
  var userId;
  var bitrateForSsrc = 0;
  var quality = [];
  for (userId in userPCs) {
    bitrateForSsrc = 0;
    var $bitratetemp = $("#bitrate_" + userId);
    var $networktemp = $("#network_" + userId);
    var $qualitytemp = $("#quality_" + userId);
    var ssrcs = userPCs[userId].getSSRCs();
    $networktemp.text(stats.connectionState + "/" + stats.fabricState);
    var ssrc;
    var reportType;
    var i;
    quality = [];
    for (i = 0; i < ssrcs.length; i++) {
      ssrc = ssrcs[i];
      if (stats.streams[ssrc]) {
        if (stats.streams[ssrc].bitrate) {
          bitrateForSsrc = bitrateForSsrc + stats.streams[ssrc].bitrate;
        }
        if (stats.streams[ssrc].quality) {
          quality.push(stats.streams[ssrc].quality);
        }
      }
    }
    if (bitrateForSsrc > 0) {
      bitrateForSsrc = bitrateForSsrc.toFixed(2);
      $bitratetemp.text(bitrateForSsrc + "Kbps");
      var processedQuality = getMinQuality(quality);
      $qualitytemp.text("Q - " + processedQuality);
      console.log("Quality is ", quality);
    }
    console.log("Userid and ssrcs ", userId, ssrcs);
  }
}

function csReportErrorCallback(err, msg) {
  console.log("CallStats error: err=" + err + " msg=" + msg);
}

function parseStats(obj) {
  var statsString = "";
  statsString += '{"Timestamp":"';
  if (obj.timestamp instanceof Date) {
    statsString += obj.timestamp.getTime().toString();
  } else {
    statsString += obj.timestamp;
  }
  statsString += '",';
  if (obj.type) {
    statsString += '"type" : "' + obj.type + '",';
  }

  var i = 0;
  if (obj.names) {
    var names = obj.names();
    // statsString += 'names=[';
    for (i = 0; i < names.length; ++i) {
      statsString += '"';
      statsString += names[i];
      statsString += '" : "';
      statsString += obj.stat(names[i]);
      statsString += '"';
      if (i + 1 !== names.length) {
        statsString += ",";
      }
    }
    // statsString += ']';
  } else {
    var length = Object.keys(obj).length;
    i = 0;
    var key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        i++;
        if (key !== "timestamp") {
          statsString += '"';
          statsString += key;
          statsString += '" : "';
          statsString += obj[key];
          statsString += '"';
          if (i < length) {
            statsString += ",";
          }
        }
      }
    }
  }
  statsString += "}";
  return statsString;
}

function statsClassifier(obj, codeBase) {
  var retObj = {};
  if (codeBase === codeBaseType.firefox) {
    if (obj.type === "inboundrtp" || obj.type === "outboundrtp") {
      retObj.ssrc = obj.ssrc;
      retObj.inbound = obj.type === "inboundrtp" ? true : false;
      retObj.data = obj;
      retObj.mediaType = obj.mediaType;
      retObj.reportType = obj.isRemote === "true" ? "remote" : "local";
    } else if (obj.type === "candidatepair" && obj.selected) {
      retObj.Transport = obj;
    } else if (obj.type === "localcandidate") {
      retObj.localCandidate = obj;
    } else if (obj.type === "remotecandidate") {
      retObj.remoteCandidate = obj;
    }
  } else if (codeBase === codeBaseType.chrome) {
    if (obj.type === "ssrc") {
      retObj.reportType = "local";
      if (obj.bytesSent) {
        retObj.inbound = false;
      } else {
        //retObj.reportType = "remote";
        retObj.inbound = true;
      }
      retObj.ssrc = obj.ssrc;
      retObj.data = obj;
    } else if (obj.type === "googCandidatePair") {
      retObj.Transport = obj;
    } else if (obj.type === "VideoBwe") {
      retObj.bwe = obj;
    }
  } else if (codeBase === codeBaseType.edge) {
    if (obj.type === "inbound-rtp" || obj.type === "outbound-rtp") {
      retObj.ssrc = obj.ssrc;
      retObj.inbound = obj.type === "inbound-rtp" ? true : false;
      retObj.data = obj;
      retObj.reportType = "local";
    } else if (obj.type === "transport") {
      retObj.Transport = obj;
    }
  }
  return retObj;
}

function isEmptyDict(ob) {
  return $.isEmptyObject(ob);
}

/**
 * @memberOf callstats
 * creates the handler to handle the fabric stats
 */
function createFabricStatsHandler(localID, remoteID, conferenceID, pc) {
  function onFabricStats(stats) {
    var results = [];
    var _statsString;
    var _statJSON;
    var codeBase = browserInfo.codebase;
    var localCandidates = {},
      remoteCandidates = {};
    var _statsTuple = { streams: {} };
    var _statsStringArray = [];

    console.log("In createFabricStatsHandler");

    if (codeBase === codeBaseType.firefox && browserInfo.name !== "Safari") {
      results = [];
      stats.forEach(function (item) {
        results.push(item);
      });
    } else if (
      codeBase === codeBaseType.chrome &&
      browserInfo.name !== "Safari"
    ) {
      results = stats.result();
    } else {
      results = [];
      for (var k in stats) {
        results.push(stats[k]);
      }
    }

    for (var i = 0; i < results.length; ++i) {
      _statsString = parseStats(results[i]);
      _statsStringArray.push(_statsString);

      _statJSON = statsClassifier(JSON.parse(_statsString), codeBase);
      if (!isEmptyDict(_statJSON)) {
        if (_statJSON.hasOwnProperty("Transport")) {
          key = "Transport";
          if (!_statsTuple.hasOwnProperty(key)) {
            _statsTuple[key] = [];
          }
          if (codeBase !== codeBaseType.firefox) {
            if (
              parseInt(_statJSON[key].bytesReceived, 10) > 0 ||
              parseInt(_statJSON[key].bytesSent, 10) > 0
            ) {
              _statsTuple[key].push(_statJSON[key]);
            }
          } else {
            _statsTuple[key].push(_statJSON[key]);
          }
        } else if (_statJSON.hasOwnProperty("localCandidate")) {
          localCandidates[_statJSON.localCandidate.id] =
            _statJSON.localCandidate;
        } else if (_statJSON.hasOwnProperty("remoteCandidate")) {
          remoteCandidates[_statJSON.remoteCandidate.id] =
            _statJSON.remoteCandidate;
        } else if (_statJSON.hasOwnProperty("bwe")) {
          _statsTuple.bwe = _statJSON.bwe;
        } else {
          if (_statsTuple.streams[_statJSON.ssrc] === undefined) {
            _statsTuple.streams[_statJSON.ssrc] = {};
          }
          if (_statJSON.inbound) {
            if (_statsTuple.streams[_statJSON.ssrc].inbound === undefined) {
              _statsTuple.streams[_statJSON.ssrc].inbound = {};
            }
            inboundStats = _statsTuple.streams[_statJSON.ssrc].inbound;
            inboundStats[_statJSON.reportType] = { data: _statJSON.data };
          } else {
            if (_statsTuple.streams[_statJSON.ssrc].outbound === undefined) {
              _statsTuple.streams[_statJSON.ssrc].outbound = {};
            }
            _statsTuple.streams[_statJSON.ssrc].outbound[
              _statJSON.reportType
            ] = { data: _statJSON.data };
          }
        }
      }
    }

    statsFromBrowser = {};
    statsFromBrowser.inBoundLocalStatsKeys = getInboundLocalKeys(
      _statsTuple.streams
    );
    statsFromBrowser.outBoundLocalStatsKeys = getOutboundLocalKeys(
      _statsTuple.streams
    );

    statsFromBrowser.inBoundRemoteStatsKeys = getInboundRemoteKeys(
      _statsTuple.streams
    );
    statsFromBrowser.outBoundRemoteStatsKeys = getOutboundRemoteKeys(
      _statsTuple.streams
    );
    statsFromBrowser.browserVersion = browserInfo.ver;
    statsFromBrowser.peerConnectionKeys = pcKeys;
    statsFromBrowser.statsTuple = _statsStringArray;

    console.log("Stats 123 tupple ", _statsStringArray);
    console.log("Local stats ", inBoundLocalStatsKeys, outBoundLocalStatsKeys);
    console.log(
      "Remote stats ",
      inBoundRemoteStatsKeys,
      outBoundRemoteStatsKeys
    );
  }
  return onFabricStats;
}

function getKeys(obj) {
  all = {};
  function get(obj) {
    var keys = Object.keys(obj);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      var value = obj[key];
      if (value instanceof Object) get(value);
      else all[key] = true;
    }
  }
  get(obj);
  return Object.keys(all);
}

function getOutboundLocalKeys(obj) {
  all = {};
  function get(obj) {
    var keys = Object.keys(obj);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      if (key !== "inbound" && key !== "remote") {
        var value = obj[key];
        if (value instanceof Object) get(value);
        else all[key] = true;
      }
    }
  }
  get(obj);
  return Object.keys(all);
}

function getInboundLocalKeys(obj) {
  all = {};
  function get(obj) {
    var keys = Object.keys(obj);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      if (key !== "outbound" && key !== "remote") {
        var value = obj[key];
        if (value instanceof Object) get(value);
        else all[key] = true;
      }
    }
  }
  get(obj);
  return Object.keys(all);
}

function getOutboundRemoteKeys(obj) {
  all = {};
  function get(obj) {
    var keys = Object.keys(obj);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      if (key !== "inbound" && key !== "local") {
        var value = obj[key];
        if (value instanceof Object) get(value);
        else all[key] = true;
      }
    }
  }
  get(obj);
  return Object.keys(all);
}

function getInboundRemoteKeys(obj) {
  all = {};
  function get(obj) {
    var keys = Object.keys(obj);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      if (key !== "outbound" && key !== "local") {
        var value = obj[key];
        if (value instanceof Object) get(value);
        else all[key] = true;
      }
    }
  }
  get(obj);
  return Object.keys(all);
}

function getPeerConnectionKeys(pc) {
  all = {};
  for (var prop in pc) {
    all[prop] = true;
  }
  return Object.keys(all);
}

// setInterval(getStats,10000);

function getStats() {
  var codeBase = browserInfo.codebase;
  for (var userId in userPCs) {
    var pc = userPCs[userId].getPeerConnection();

    if (pc) {
      pcKeys = getPeerConnectionKeys(pc);
      if (codeBase === codeBaseType.firefox || browserInfo.name === "Safari") {
        pc.getStats(
          null,
          createFabricStatsHandler(myUserId, userId, "foo", pc),
          function logError(err) {
            console.log("Error");
          }
        );
      } else if (codeBase === codeBaseType.chrome) {
        pc.getStats(createFabricStatsHandler(myUserId, userId, "foo", pc));
      } else if (codeBase === codeBaseType.edge) {
        pc.getStats()
          .then(createFabricStatsHandler(myUserId, userId, "foo", pc))
          .catch(function (err) {
            console.log("Error");
          });
      }
    }
  }

  return ["success", "faile"];
}

function getstats() {
  console.log("Returning stats ", statsFromBrowser);
  return statsFromBrowser;
}

function csReportErrorCallback(err, msg) {
  console.log("CallStats error: err=" + err + " msg=" + msg);
}

var params = {
  //disableBeforeUnloadHandler: false
};

callStats.initialize(appId, appSecret, myUserId, csInitCallback, statsCallback, {disablePrecalltest: true});

document.getElementById("switchBtn").onclick = switchScreen;

var onPCInitialized = function (pc, receiver) {
  console.log("Add new Fabric event to CS ", pc);
  callStats.addNewFabric(
    pc,
    receiver,
    callStats.fabricUsage.multiplex,
    room,
    csCallback
  );
};

var onPCConnectionError = function (pc, error, funcname) {
  callStats.sendFabricEvent(pc, callStats.fabricEvent.fabricSetupFailed, room);
  if (funcname === "createOffer") {
    console.log("PC Connection Error in  createOffer", error);
    callStats.reportError(
      pc,
      room,
      callStats.webRTCFunctions.createOffer,
      error
    );
  } else if (funcname === "createAnswer") {
    console.log("PC Connection Error createAnswer", error);
    callStats.reportError(
      pc,
      room,
      callStats.webRTCFunctions.createAnswer,
      error
    );
  }

  //callStats.sendFabricEvent(pc,callStats.fabricEvent.fabricSetupFailed,room);
};

function switchScreen() {
  console.log("Switch Screen ", isScreenSharingOn);
  var pc;
  for (userId in userPCs) {
    pc = userPCs[userId].getPeerConnection();
    break;
  }
  if (isScreenSharingOn) {
    document.getElementById("switchBtn").value = "Start Screen sharing";
    localScreenStream = null;
    attachMediaStream(localScreenShare, localScreenStream);
    if (pc) {
      callStats.sendFabricEvent(
        pc,
        callStats.fabricEvent.screenShareStop,
        room
      );
    }

    if (isChrome) {
      removeLocalStream();
    }
    doGetUserMedia(function (status) {
      if (status === true) {
        //socket.emit('participant', room,myUserId);
        isScreenSharingOn = false;
        addLocalStream();
      }
    });
  } else {
    if (pc) {
      callStats.sendFabricEvent(
        pc,
        callStats.fabricEvent.screenShareStart,
        room
      );
    }
    if (isChrome) {
      removeLocalStream();
    }
    dogetScreenShare(function (status) {
      if (status === true) {
        //console.log("Participant");
        //socket.emit('participant', room,myUserId);
        isScreenSharingOn = true;
        addLocalStream();
        document.getElementById("switchBtn").value = "Stop Screen sharing";
      }
    });
  }
}

socket.on("created", function (room) {
  console.log("Created room " + room);
  //isInitiator = true;
});

socket.on("newUserJoined", function (userId) {
  console.log("This peer has joined " + userId);
  //isInitiator = true;
  if (userId !== myUserId) isChannelReady = true;
  var _div = "videos";
  if (userId !== myUserId && isChannelReady === true) {
    console.log("newUser detected. Invoking call()");
    userPCs[userId] = new PeerConnectionChannel(
      userId,
      myUserId,
      _div,
      localStream,
      onPCInitialized,
      onPCConnectionError
    );
    userPCs[userId].call(function (status) {
      if (status === true) {
        if (localStream === null)
          localStream = userPCs[userId].getLocalStream();
      }
    });
  }
});

socket.on("log", function (array) {
  console.log.apply(console, array);
});

function addLocalStream() {
  console.log("addLocalStream: %o", userPCs);
  for (userId in userPCs) {
    var pc = userPCs[userId].getPeerConnection();
    pc.addStream(localStream);
    console.log("Local stream: %o", localStream);
    //callStats.associateMstWithUserId(pc, userId, "foo", );
    if (isFirefox) {
      userPCs[userId].doCallIfActive();
    }
  }
}

function removeLocalStream() {
  for (userId in userPCs) {
    var pc = userPCs[userId].getPeerConnection();
    //pc.removeStream(localStream);
  }
}

function endCalls() {
  console.log(userPCs);
  for (var username in userPCs) {
    var chan = userPCs[username];
    var pc = userPCs[username].getPeerConnection();
    sendMessage({ type: "bye" }, chan.to, chan.from);
    // callStats.sendFabricEvent(pc, callStats.fabricEvent.fabricTerminated, room);
    if (pc) pc.close();
    console.log("disconnect is ", myUserId, room);
    socket.emit("disconnect", myUserId, room);
  }
}

window.addEventListener("beforeunload", function (e) {
  endCalls();
});

////////////////////////////////////////////////

function sendMessage(message, to, from) {
  console.log("Client sending message: ", message);
  socket.emit("signaling", message, to, from);
}

socket.on("onSignaling", function (message, to, from) {
  console.log("onSignaling called; msg=" + message);
  onSignaling(message, to, from);
});

onSignaling = function (message, to, from) {
  var msg = message;
  if (userPCs[to] === undefined || userPCs[to] === null) {
    if (msg.type === "bye") {
      console.log("bye message", message);
      var pc = userPCs[to].getPeerConnection();
      callStats.sendFabricEvent(
        pc,
        callStats.fabricEvent.fabricTerminated,
        room
      );
      //userPCs[to]=null;
    } else {
      var _div = "videos";
      console.log("Call does not exist, create one ", localStream, msg.type);
      userPCs[to] = new PeerConnectionChannel(
        to,
        from,
        _div,
        localStream,
        onPCInitialized,
        onPCConnectionError
      );
      userPCs[to].answer(function (status) {
        if (status === true) {
          console.log("Call is received now");
          calls++;
          if (localStream === null) localStream = userPCs[to].getLocalStream();
          userPCs[to].onChannelMessage(message);
        }
      });
    }
  } else if (userPCs[to]) {
    console.log("Call does exist,no need to create one", userPCs, to);
    userPCs[to].onChannelMessage(message);
    if (msg.type === "bye") {
      var pc = userPCs[to].getPeerConnection();
      // callStats.sendFabricEvent(
      //   pc,
      //   callStats.fabricEvent.fabricTerminated,
      //   room
      // );
      if(pc) {
        pc.close();
        // userPCs[to] = null;
      }
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
  console.log("navigator.getUserMedia error: ", error);
  callStats.reportError(
    null,
    room,
    callStats.webRTCFunctions.getUserMedia,
    error
  );
}

function doGetUserMedia(callback) {
  localVideo = document.querySelector("#localVideo");
  console.log("Do get User Media ", constraints);
  navigator.mediaDevices.getUserMedia(constraints)
  .then(function(stream) {
    console.log("User has granted access to local media.");
    localVideo.srcObject = stream;
    localVideo.style.opacity = 1;
    localStream = stream;
    if (callback) callback(true);
  })
  .catch(function(err) {
    errorCallback(err);
  });
}

function csCallback(err, msg) {
  console.log("StatsRTC: remote-id ", " status: ", err, " msg: ", msg);
}

function dogetScreenShare(callback) {
  if (window.navigator.userAgent.match("Chrome")) {
    console.log("dogetChromeScreenShare");
    dogetChromeScreenShare(callback);
  } else if (window.navigator.userAgent.match("Firefox")) {
    console.log("dogetFirefoxScreenShare");
    dogetFirefoxScreenShare(callback);
  }
}

function dogetFirefoxScreenShare(callback) {
  constraints = {
    audio: false,
    video: {
      mozMediaSource: "window",
      mediaSource: "window",
      maxWidth: 1920,
      maxHeight: 1080,
      minAspectRatio: 1.77,
    },
  };
  getUserMedia(
    constraints,
    function (stream) {
      // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1045810
      console.log("firefox sucess callback");
      localVideo = document.querySelector("#localVideo");
      var lastTime = stream.currentTime;
      attachMediaStream(localVideo, stream);
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
      if (callback) callback(true);
    },
    errorCallback
  );
}

function successCallback(arg) {
  console.log("Chrome Extension Installed suceesfully");
  window.sessionStorage.setItem(
    "getCSIOScreenMediaExtensionId",
    "egdciadhlclicjafgmdlfigkdhipggck"
  );
}

function failureCallback(arg) {
  console.log("Chrome Extension Installed failed");
}

function dogetChromeScreenShare(callback) {
  localVideo = document.querySelector("#localVideo");
  console.log(
    "In dogetScreenShare ",
    window.sessionStorage.getItem("getCSIOScreenMediaExtensionId")
  );
  if (window.sessionStorage.getCSIOScreenMediaExtensionId) {
    chrome.runtime.sendMessage(
      window.sessionStorage.getCSIOScreenMediaExtensionId,
      { type: "getScreen", id: 1 },
      null,
      function (data) {
        if (data.sourceId === "") {
          // user canceled
          var error = new Error("NavigatorUserMediaError");
          error.name = "PERMISSION_DENIED";
          console.log(error.name);
          callback(error);
        } else {
          var constraints = {
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: "desktop",
                maxWidth: window.screen.width,
                maxHeight: window.screen.height,
                maxFrameRate: 3,
              },
              optional: [
                { googLeakyBucket: true },
                { googTemporalLayeredScreencast: true },
              ],
            },
          };
          constraints.video.mandatory.chromeMediaSourceId = data.sourceId;
          getUserMedia(
            constraints,
            function (stream) {
              console.log("User has granted access to local media.");
              attachMediaStream(localVideo, stream);
              localVideo.style.opacity = 1;
              localStream = stream;
              if (callback) callback(true);
            },
            errorCallback
          );
        }
      }
    );
  } else {
    chrome.webstore.install(
      "https://chrome.google.com/webstore/detail/egdciadhlclicjafgmdlfigkdhipggck",
      successCallback,
      failureCallback
    );
  }
}
