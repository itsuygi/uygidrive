// include express, http, and ws libraries:
const express = require("express");

const {createServer} = require("http");
const {WebSocketServer} = require("ws");
const multer = require('multer');

// make an instance of express:
const app = express();

app.use(express.static("public"));
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

var topicClients = new Map()
var lastData = {}

function serverStart() {
  var port = this.address().port;
  console.log("Server listening on port " + port);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Dosyaların kaydedileceği klasörü belirtin
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Dosya adını nasıl değiştireceğinizi belirtin
  },
});

const upload = multer({ storage: storage });

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
      const topic = data.message;
      console.log(topic);
      
      let found = false
      
      topicClients.forEach((clients, topic) => {
        const index = clients.indexOf(thisClient);
        if (index !== -1) {
          found = true
        }
      });

      
      if (found == false) {
        // İstemciyi konuya ekleyin
        if (!topicClients.has(topic)) {
          topicClients.set(topic, []);
        }
        
        topicClients.get(topic).push(thisClient);
        
        if (lastData[topic]) {
          thisClient.send(JSON.stringify({ "type":"resumePlay", "message":lastData[topic] }));
        } else {
          thisClient.send(JSON.stringify({ "type":"connection", "message":"successfull" }));
        }
          
      }
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
      client.send(JSON.stringify(message));
    });
  }
}

app.post('/sendMessageToTopic', (req, res) => {
  var req_data = req.body
  
  var topic = req_data.topic
  var message = req_data.message
  
  if (message.type == "play") {
    lastData[topic] = {"url": message.message, "timestamp": Date.now()}
    console.log(lastData)
  } else if (message.type == "stop") {
    lastData[topic] = null
  }
  
  if (topic && message) {
    sendToTopicClients(topic, message);
    res.send("Message sent to clients")
  } else {
    res.status(500).send("Error: no body or topic")
  }
});

app.get('/upload', (req, res) => {
  res.sendFile(__dirname + '/public/' + 'upload.html');
});

app.post('/upload', upload.single('musicFile'), (req, res) => {
  res.send('Uploaded');
});

app.get('/music/:filename', (req, res) => {
  const filename = req.params.filename;
  res.sendFile(__dirname + '/uploads/' + filename);
});



// start the server:
server.listen(process.env.PORT || 3000, serverStart);
// start the websocket server listening for clients:
wss.on("connection", handleClient);
