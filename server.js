// Live Music system by Uygi © 2023
// Uses Websockets and API to stream music to stream IDs, and upload files.

const express = require("express");

const { createServer } = require("http");
const { WebSocketServer } = require("ws");

const fs = require("fs");
const path = require("path");
const multer = require("multer");

const admin = require('firebase-admin');
const serviceAccount = require('./uygi-online-music-firebase-adminsdk-jpnoz-9adaf422a6.json');

const app = express();

app.use(express.static("public"));
app.use('/common',express.static(path.join(__dirname, 'public/common')));

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

var fileupload = require("express-fileupload");
app.use(fileupload());

const server = createServer(app);
const wss = new WebSocketServer({ server });

const firebaseConfig = {
  apiKey: "AIzaSyArZ2P4Vy3pcQq20HCeY-XA6mJoB3G1OuM",
  authDomain: "uygi-online-music.firebaseapp.com",
  projectId: "uygi-online-music",
  storageBucket: "uygi-online-music.appspot.com",
  messagingSenderId: "213078311484",
  appId: "1:213078311484:web:59b2e3f19c360348ffb939",
  measurementId: "G-8EVXCHSNMB"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://uygi-online-music.appspot.com"
});

const bucket = admin.storage().bucket();

// Local variables
var topicClients = new Map();
var lastData = {};
var streamerIPs = {};

function serverStart() {
  var port = this.address().port;
  console.log("Server listening on port " + port);
}

const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: multerStorage });


// Socket

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

  function clientResponse(data) {
    try {
      data = JSON.parse(data);
    } catch {
      console.log("Failed to convert client response to JSON.");
    }

    console.log(data);

    if (data.type === "subscribe") {
      const topic = data.message;
      console.log(topic);

      let found = false;

      topicClients.forEach((clients, topic) => {
        const index = clients.indexOf(thisClient);
        if (index !== -1) {
          found = true;
        }
      });

      if (found == false) {
        // İstemciyi konuya ekleyin
        if (!topicClients.has(topic)) {
          topicClients.set(topic, []);
        }

        topicClients.get(topic).push(thisClient);

        if (lastData[topic]) {
          thisClient.send(
            JSON.stringify({ type: "resumePlay", message: lastData[topic] })
          );
        } else {
          thisClient.send(
            JSON.stringify({ type: "connection", message: "successfull" })
          );
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

app.post("/sendMessageToTopic", (req, res) => {
  var req_data = req.body;

  var topic = req_data.topic;
  var message = req_data.message;

  const IP = req.headers["x-forwarded-for"].split(",")[0];
  console.log(IP);
  console.log(streamerIPs);
  console.log(streamerIPs[topic]);

  if (streamerIPs[topic] && streamerIPs[topic] !== IP) {
    res.status(401).send("Unauthorized");

    return "Unauthorized";
  }

  if (message.type == "play") {
    lastData[topic] = { url: message.message, timestamp: Date.now() };
    console.log(lastData);
  } else if (message.type == "stop") {
    lastData[topic] = null;
  }

  if (topic && message) {
    sendToTopicClients(topic, message);
    res.send("Message sent to clients");
  } else {
    res.status(500).send("Error: no body or topic");
  }
});


// Local functions

function getFileUrl(fileName, req) {
  var fileUrl = "https://" + req.get("host") + "/music/" + fileName;

  return fileUrl;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
}


// Uploading


app.get("/upload", (req, res) => {
  res.sendFile("upload.html", { root: __dirname + "/public/upload" });
});

//app.post("/uploadFile", upload.single("musicFile"), (req, res) => {
//  var fileUrl = getFileUrl(req.file.filename, req);
//  res.send(fileUrl);
//});

app.post("/uploadFile", upload.single("musicFile"), (req,res) => {
  console.log(req.body.file)
  try {
    if (!req.file) {
      return res.status(400).send("Dosya eksik veya hatalı.");
    }
    
    const file = req.file;

    const fileBuffer = Buffer.from(file.data, 'base64');
    const fileOptions = {
      gzip: true,
      metadata: {
        contentType: 'audio/mpeg',
      },
    };

    bucket.upload(fileBuffer, {
      destination: file.name,
      metadata: fileOptions.metadata,
      
    })
    .then(() => {
      const fileUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
      res.status(200).send(fileUrl);
    })
    .catch((error) => {
      console.error('Dosya yükleme hatası:', error);
      res.status(500).send(error);
    });
  } catch (error) {
    console.error('Dosya yükleme hatası:', error);
    res.status(500).send(error);
  }
});

//app.get("/music/:filename", (req, res) => {
//  const filename = req.params.filename;
//  console.log("Sending file: " + filename);
//  res.sendFile(__dirname + "/uploads/" + filename);
//});

app.get("/music/:filename", (req, res) => {
  const filename = req.params.filename;
  const file = bucket.file(filename);

  file.getSignedUrl({ action: "read", expires: "03-09-2491" })
    .then((urls) => {
      const url = urls[0];
      res.redirect(url);
    })
    .catch((error) => {
      console.error("Dosya alınırken hata oluştu:", error);
      res.status(500).send("Hata");
    });
});

/*app.get("/upload/list", (req, res) => {
  fs.readdir("./uploads", (err, files) => {
    if (err) {
      res.status(500).send("Error: ", err);
    } else {
      var list = [];

      files.forEach((file) => {
        const fileName = path.basename(file);
        var fileUrl = getFileUrl(fileName, req);

        list.push(fileUrl);
      });
    }
    res.send(JSON.stringify(list));
  });
}); */

app.get("/upload/list", (req, res) => {
  bucket.getFiles()
    .then((results) => {
      const files = results[0];

      const fileUrls = files.map((file) => {
        return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      });

      res.json(fileUrls);
    })
    .catch((error) => {
      console.error("Dosyaları listelerken hata oluştu:", error);
      res.status(500).json({ message: "Dosyaları listelerken hata oluştu." });
    });
});

// Streaming

app.get("/stream", (req, res) => {
  res.sendFile("stream.html", { root: __dirname + "/public/stream" });
});

app.get("/getStreamId", (req, res) => {
  var id = 0;
  do id = getRandomInt(1000, 99999);
  while (topicClients.has(id) == true);

  console.log(id);

  const IP = req.headers["x-forwarded-for"].split(",")[0];
  console.log(IP);

  streamerIPs[id] = IP;

  console.log(streamerIPs);

  res.send(id.toString());
});


// Server handling

// start the server:
server.listen(process.env.PORT || 3000, serverStart);
// start the websocket server listening for clients:
wss.on("connection", handleClient);
