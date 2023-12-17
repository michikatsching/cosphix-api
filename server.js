'use strict';

let WSServer = require('ws').Server;
let server = require('http').createServer();
let app = require('./api');


let wss = new WSServer({

  server: server
});



server.on('request', app);

wss.on('connection', socket => {
  socket.on('message', message => 
    wss.broadcast(`${message}`)
  );
});

wss.broadcast = function broadcast(msg) {
    wss.clients.forEach(function each(client) {
      client.send(msg);
   });
};

wss.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, socket => {
        wss.emit('connection', socket, request);
  });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {

  console.log(`http/ws server listening on ${PORT}`);
});