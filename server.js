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
var topicClients = new Map()

// this runs after the http server successfully starts:
function serverStart() {
  var port = this.address().port;
  console.log("Server listening on port " + port);
}


function handleClient(thisClient, request) {
  console.log("New Connection handled"); 
  // add this client to the clients array

  
  function endClient() {
    // when a client closes its connection
    // get the client's position in the array
    // and delete it from the array:
    topicClients.forEach((clients, topic) => {
      const index = clients.indexOf(thisClient);
      if (index !== -1) {
        clients.splice(index, 1);
        if (clients.length === 0) {
          topicClients.delete(topic);
        }
      }
    });
  }
  

  // if a client sends a message, print it out:
  function clientResponse(data) {
    data = JSON.parse(data);
    
    console.log(data);

    if (data.type === 'subscribe') {
      // "subscribe" türündeki mesajlar, istemciyi bir konuya abone yapar
      const topic = data.username;

      // İstemciyi konuya ekleyin
      if (!topicClients.has(topic)) {
        topicClients.set(topic, []);
      }
      topicClients.get(topic).push(thisClient);
    }
    console.log(topicClients)
  }

  // This function broadcasts messages to all webSocket clients
  function sendToTopicClients(topic, message) {
    if (topicClients.has(topic)) {
      const clients = topicClients.get(topic);

      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ topic, message }));
        }
      });
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
