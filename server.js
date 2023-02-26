/*
  Websocket server with express.js
    (https://www.npmjs.com/package/express) and ws.js
  (https://www.npmjs.com/package/ws)
  Serves an index page from /public. That page makes
  a websocket client back to this server.

  created 17 Jan 2021
  modified 23 Feb 2023
  by Tom Igoe
*/

var express = require("express"); // include express.js
const { createServer } = require('http');
// a local instance of express:
var app = express();
// instance of the websocket server:
var WebSocketServer = require("ws").Server; // webSocket library
// configure the webSocket server:
// const wssPort = 8080; // port number for the webSocket server
const server = createServer(app);
const wss = new WebSocketServer({ server }); // the webSocket server

// list of client connections:
var clients = new Array();

// serve static files from /public:
app.use("/", express.static("public"));

// this runs after the server successfully starts:
function serverStart() {
  var port = this.address().port;
  console.log("Server listening on port " + port);
}

function handleClient(thisClient, request) {
  console.log("New Connection"); // you have a new client
  clients.push(thisClient); // add this client to the clients array

  function endClient() {
    // when a client closes its connection
    // get the client's position in the array
    // and delete it from the array:
    var position = clients.indexOf(thisClient);
    clients.splice(position, 1);
    console.log("connection closed");
  }

  // if a client sends a message, print it out:
  function clientResponse(data) {
    console.log(request.connection.remoteAddress + ": " + data);
    broadcast(request.connection.remoteAddress + ": " + data);
  }

  // set up client event listeners:
  thisClient.on("message", clientResponse);
  thisClient.on("close", endClient);
}

// This function broadcasts messages to all webSocket clients
function broadcast(data) {
  // iterate over the array of clients & send data to each
  for (let c in clients) {
    clients[c].send(data);
  }
}

// start the server:
app.listen(process.env.PORT, serverStart);
// listen for websocket clients and handle them:
// wss.on("connection", handleClient);

// server.on("upgrade", function (request, socket, head) {
//   socket.on("error", onSocketError);

//   console.log("Parsing session from request...");

//   console.log("Session is parsed!");

//   socket.removeListener("error", onSocketError);

//   wss.handleUpgrade(request, socket, head, function (ws) {
//     wss.emit("connection", ws, request);
//   });
// });

// function onSocketError(err) {
//   console.error(err);
// }
