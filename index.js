var express = require('express');
var app = express();
var http = require('http');
var numClients = 0;

var server = http.createServer(app);
//app.listen(8080);
app.root = __dirname;

server.listen(8080);
//Static folder for serving js files.
app.use("/", express.static(__dirname + '/app'));

app.get('/', function (req, res) {
	res.sendFile('/app/index.html',{root: __dirname})
});

var io = require('socket.io').listen(server);

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

  socket.on('message', function (message) {
    log('Got message:', message);
    // for a real app, would be room only (not broadcast)
    socket.broadcast.emit('message', message);
  });

  socket.on('create or join', function (room) {
    console.log('Got message:', room);

    log('Room ' + room + ' has ' + numClients + ' client(s)');
    log('Request to create or join room ' + room);

    if (numClients === 0){
      socket.join(room);
      socket.emit('created', room);
    } else if (numClients >= 1) {
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room);
    } else { // max two clients
      socket.emit('full', room);
    }

    numClients++;
    socket.emit('emit(): client ' + socket.id + ' joined room ' + room);
    socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room);

  });

});


