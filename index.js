var express = require('express');
var app = express();
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var jwt = require('jsonwebtoken');
var crypto = require('crypto');
var config = require('./config.js');
var numClients = 0;

var usernames = [];
var data = {rooms: []};
var sockets = {};
var ids = {};



var server = http.createServer(app);


fs.exists = fs.exists || require('path').exists;
var privKey = null;

privKey = fs.readFileSync('ssl/ecprivate.key');

//app.listen(8080);
app.root = __dirname;

server.listen(8080);
//Static folder for serving js files.
app.use("/", express.static(__dirname + '/app'));

app.get('/', function (req, res) {
	console.log("Req ",req);
	res.sendFile('/app/index.html',{root: __dirname});
});

var io = null;
if (process.env.SSL == 'true') {
    var options = {
        key:    fs.readFileSync('ssl/server.key'),
        cert:   fs.readFileSync('ssl/server.crt'),
        ca:     fs.readFileSync('ssl/ca.crt'),
        requestCert:        true,
        rejectUnauthorized: false,
        passphrase: "v2ZIZj2jKUap"
    };
    var httpsServer = https.createServer(options, app);
    httpsServer.listen(4430);
    io = require('socket.io').listen(httpsServer);
} else {
    io = require('socket.io').listen(server);
}


console.log("IO created");

io.sockets.on('connection', function (socket){

  // convenience function to log server messages on the client
  function log(){
    var array = [">>> Message from server: "];
    for (var i = 0; i < arguments.length; i++) {
      array.push(arguments[i]);
    }
      socket.emit('log', array);
  }

  socket.on('signaling', function (message,to,from) {
    log('Got message:', message);
    // for a real app, would be room only (not broadcast)
    for(var i=0; i< io.sockets.sockets.length; i++)
    {
      if(io.sockets.sockets[i].id === ids[to]) {
        io.sockets.sockets[i].emit('onSignaling',message,from,to);
      }
    }
    //socket.broadcast.emit('message', message);
  });

  socket.on('participant', function (room,userId) {
    console.log('Got participant', room,userId);
    socket.username = userId;
    socket.roomId = room;
    console.log(userId +' has connected with socketid '+socket.id);
    ids[userId] = socket.id;
    usernames.push(userId);

    log('Room ' + room + ' has ' + numClients + ' client(s)');
    log('Request to create or join room ' + room);
    socket.join(room);
    if (numClients === 0){
      socket.emit('created', room);
     } //else if (numClients >= 1) {
    //   //io.sockets.in(room).emit('newUserJoin', userId);
    //   socket.join(room);
    //   //socket.emit('newUserJoined', userId);
    // }

    io.sockets.emit('newUserJoined', userId);
    numClients++;
    socket.emit('emit(): client ' + socket.id + ' joined room ' + room);
    socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room);

  });

  socket.on('generateToken', function (data, callback) {
    if (socket.username === undefined || socket.username === null) {
      return callback('userNotJoined');
    }
    // First generate the JWTID
    crypto.randomBytes(48, function(err, buffer) {
      if (err) {
        return callback(err);
      }
      var tokenid = buffer.toString('hex');
      var token = null;
      try {
        // Try to sign teh token
        token = jwt.sign(
          {
            userID: socket.username,
            appID: config.appID
          }, privKey,
          {
            algorithm: "ES256",
            jwtid: tokenid,
            expiresIn: 300, //5 minutes
            notBefore: -300 //-5 minutes
          });
      } catch (error) {
        console.log(error);
        return callback(error);
      }
      console.log({action: "GrantToken", user: socket.username, tokenid: tokenid});
      callback(null, token);
    });
  });

  socket.on('disconnect', function () {
    var room = socket.roomId;
    console.log('User disconnected ',socket.username,room);
    for( var key in usernames ) {
      if (usernames[key] === socket.username) {
        usernames.splice(key,1);
        socket.leave(room);
      }
    }
    delete ids[socket.id];
    io.sockets.emit('userlist', encodeURIComponent(usernames + ""));
  });

});


