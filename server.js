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

app.use(express.static("public"));
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

const server = createServer(app);

const wss = new WebSocketServer({ server });

var topicClients = new Map()

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
      const topic = data.topic;

      // İstemciyi konuya ekleyin
      if (!topicClients.has(topic)) {
        topicClients.set(topic, []);
      }
      topicClients.get(topic).push(thisClient);
      thisClient.send(JSON.stringify({ "type":"connection", "message":"successful" }));
    }
    console.log(topicClients);
  }

  // This function broadcasts messages to all webSocket clients
  

  // set up client event listeners:
  thisClient.on("message", clientResponse);
  thisClient.on("close", endClient);
}

function sendToTopicClients(topic, message) {
  if (topicClients.has(topic)) {
    const clients = topicClients.get(topic);
    console.log(clients);

    clients.forEach((client) => {
      client.send(JSON.stringify({ topic, message }));
      console.log("sent")
    });
  }
}

app.post('/sendMessageToTopic', (req, res) => {
  var req_data = req.body
  
  var topic = req_data.topic
  var message = req_data.message
  
  if (topic && message) {
    sendToTopicClients(topic, message);
    res.send("Message sent to clients")
  } else {
    res.status(500).send("Error: no body or topic")
  }
})

// start the server:
server.listen(process.env.PORT || 3000, serverStart);
// start the websocket server listening for clients:
wss.on("connection", handleClient);
