// include express, http, and ws libraries:
const express = require("express");
// the const {} syntax is called destructuring.
// it allows you to pull just the one function 
// you need from the libraries below without 
// making an instance of the whole library:
const {createServer} = require("http");
const {WebSocketServer} = require("ws");

// make an instance of express:
const app = express();
// serve static content from the project's public folder:
app.use(express.static("public"));

const server = createServer(app);
// WebSocketServer needs the http server instance:
const wss = new WebSocketServer({ server });
// list of client connections:
var clients = {}

// this runs after the http server successfully starts:
function serverStart() {
  var port = this.address().port;
  console.log("Server listening on port " + port);
}

function handleClient(thisClient, request) {
  console.log("New Connection handled"); 
  // add this client to the clients array

  clients.push(key:thisClient,); 
  
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
    let bcastMessage = JSON.stringify(data);
    console.log(data.toString());
    broadcast(data.toString());
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

// start the server:
server.listen(process.env.PORT || 3000, serverStart);
// start the websocket server listening for clients:
wss.on("connection", handleClient);
