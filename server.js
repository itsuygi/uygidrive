const express = require("express");
const {createServer} = require("http");
const {WebSocketServer} = require("ws");

const app = express();
app.use(express.static("public"));

// this runs after the server successfully starts:
function serverStart() {
  var port = this.address().port;
  console.log("Server listening on port " + port);
}

// list of client connections:
var clients = new Array();

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

  // This function broadcasts messages to all webSocket clients
  function broadcast(data) {
    // iterate over the array of clients & send data to each
    for (let c in clients) {
      clients[c].send(data);
    }
  }

  // set up client event listeners:
  thisClient.on("message", clientResponse);
  thisClient.on("close", endClient);
}

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", handleClient);

// start the server:
server.listen(process.env.PORT || 3000, serverStart);
