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

const server = createServer(app);
const wss = new WebSocketServer({ server });


// Uploading setup

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://uygi-online-music.appspot.com"
});

const bucket = admin.storage().bucket();

const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
  filefilter: function (req, file, cb) {
    console.log(isValidMimeType(file.mimetype))
    if (!isValidMimeType(file.mimetype)) {
      return cb(new Error("Only music files accepted."), false);
    }
    cb(null, true);
  },
});

function isValidMimeType(mimeType) {
  const validMimeTypes = ["audio/mpeg", "audio/wav", "audio/ogg"];
  return validMimeTypes.includes(mimeType);
}

const upload = multer({ storage: multer.memoryStorage() });


// Local variables
var topicClients = new Map();
var lastData = {};
var streamerIPs = {};

function serverStart() {
  var port = this.address().port;
  console.log("Server listening on port " + port);
}


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

app.post("/uploadFile", upload.single("musicFile"), async (req,res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file or non-accepted file type.');
    }

    const file = req.file;
    const filename = file.originalname;
    const fileBuffer = file.buffer;

    const fileOptions = {
      metadata: {
        contentType: file.mimetype // Dosya türünü ayarlayın (ör. 'audio/mpeg')
      }
    };

    await bucket.file(filename).save(fileBuffer, fileOptions);
    await bucket.file(filename).makePublic()

    const fileUrl = getFileUrl(filename, req)
    res.status(200).send(fileUrl);
  } catch (error) {
    console.error('Dosya yükleme hatası:', error);
    res.status(500).send(error);
  }
});

app.get("/localUpload/:filename", (req, res) => {
 const filename = req.params.filename;
  console.log("Sending file: " + filename);
  
  res.set("Content-Type", "audio/mpeg")
  res.sendFile(__dirname + "/uploads/" + filename);
});

app.get("/music/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    const file = bucket.file(filename);
    const [fileContent] = await file.download();

    res.set("Content-Type", "audio/mpeg")
    res.send(fileContent)
  } catch (error) {
    console.log("Error getting file: ", error)
    res.status(500).send(error)
  }
});


app.get("/upload/list", (req, res) => {
  bucket.getFiles()
    .then((results) => {
      const files = results[0];

      const fileUrls = files.map((file) => {
        return getFileUrl(file.name, req)
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


// Old codes

//app.post("/uploadFile", upload.single("musicFile"), (req, res) => {
//  var fileUrl = getFileUrl(req.file.filename, req);
//  res.send(fileUrl);
//});

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

/*file.getSignedUrl({ action: "read", expires: "03-09-2491" })
    .then((urls) => {
      const url = urls[0];
      res.redirect(url);
    })
    .catch((error) => {
      console.error("Dosya alınırken hata oluştu:", error);
      res.status(500).send("Hata");
    });*/