// Live Music system by Uygi © 2023
// Uses Websockets and API to stream music to stream IDs, and upload files.

const express = require("express");
const router = express.Router();

const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { format } = require('util');
const { getAudioDurationInSeconds } = require('get-audio-duration')

const fs = require("fs");
const path = require("path");
const multer = require("multer");
const jwt = require('jsonwebtoken');

const admin = require('firebase-admin');
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString());

const app = express();

app.use(express.static("public"));
app.use('/common',express.static(path.join(__dirname, 'public/common')));

const bodyParser = require("body-parser");
app.use(express.json());


const server = createServer(app);
const wss = new WebSocketServer({ server });


// Memory function

function getMemoryUsage() {
  let total_rss = require('fs').readFileSync("/sys/fs/cgroup/memory/memory.stat", "utf8").split("\n").filter(l => l.startsWith("total_rss"))[0].split(" ")[1]; 
  return Math.round( Number(total_rss) / 1e6 ) - 60;
}

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
  fileFilter: function (req, file, cb) {
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

let memoryStorage = {}


// Local variables
var topicClients = new Map();
var lastData = {};
var streamerIPs = {};

const maxRetries = 10

function serverStart() {
  var port = this.address().port;
  console.log("Server listening on port " + port);
}


// Socket
function handleClient(thisClient, request) {
  console.log("New Connection handled");
  // add this client to the clients array
  
  thisClient.hasLoaded = false

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
    
    switch (data.type) {
      case "subscribe" :
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
        console.log(topicClients);
      
      case "loaded":
        thisClient.hasLoaded = true
    }
  }

  // set up client event listeners:
  thisClient.on("message", clientResponse);
  thisClient.on("close", endClient);
}

function sendToTopicClients(topic, message) {
  topic = topic.toString()
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

function generateAccessToken(data) {
  return jwt.sign(data, process.env.TOKEN_SECRET, { expiresIn: '10h' });
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
        contentType: file.mimetype
      }
    };

    await bucket.file(filename).save(fileBuffer, fileOptions);
    await bucket.file(filename).makePublic()

    const fileUrl = getFileUrl(filename, req)
    res.send(fileUrl);
  } catch (error) {
    console.error('File uploading error:', error);
    res.status(500).send(error.message);
  }
});

app.get("/localUpload/:filename", (req, res) => {
 const filename = req.params.filename;
  console.log("Sending file: " + filename);
  
  res.set("Content-Type", "audio/mpeg")
  res.sendFile(__dirname + "/uploads/" + filename);
});

app.get("/music/link/:filename", (req, res) => {
  const filename = req.params.filename;
  const publicUrl = format(
      `https://storage.googleapis.com/${bucket.name}/${filename}`
  );
  
  res.redirect(publicUrl)
});

app.get("/music/:filename", async (req, res) => {
  const filename = req.params.filename;
  const publicUrl = format(
      `https://storage.googleapis.com/${bucket.name}/${filename}`
  );
  
  res.redirect(publicUrl)
  /*
  try {
    const filename = req.params.filename;
    
    if (memoryStorage[filename]) {
      if (memoryStorage[filename] !== "DOWNLOADING") {
        console.log("Found file in memory: ", filename)
        res.set('Content-Type', 'audio/mpeg');
        console.log(memoryStorage[filename])
        res.send(memoryStorage[filename]);
      } else {
        console.log("Already downloading, rejecting.")
        res.status(403)
      }
      
    } else {
      console.log("File didn't found on memory, downloading: ", filename)
      memoryStorage[filename] = "DOWNLOADING"
      
      const file = bucket.file(filename);
      const fileContent = await file.download();
      
      let memory = getMemoryUsage()
      let memoryUsage = Math.round((memory * 100)/ 512 )
      
      console.log("File downloaded: ", filename)
      console.log("Memory usage: %", memoryUsage)
      
      if (memoryUsage <= 80) {
        const fileData = fileContent[0];
        memoryStorage[filename] = fileData;
        
        console.log("File saved to memory, enough space: ", filename)
      }
      
      res.set("Content-Type", "audio/mpeg")
      res.send(fileContent)
    }
  } catch (error) {
    console.log("Error getting file: ", error)
    res.status(500).send(error)
  }*/
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
      console.error("Error while listing the files:", error);
      res.status(500).send(error.message);
    });
});

// Streaming

app.get("/stream", (req, res) => {
  res.sendFile("stream.html", { root: __dirname + "/public/stream" });
});

//API

const APIList = [
    {
        "endpoint": "/api/getAccessToken",
        "description": "Creates a access token which is linked to your stream id in order to access the api.",
        "body": "{'id': '1234'}",
        "response": "{'token': 'ey125436...'}",
        "method": "GET"
    },
    {
        "endpoint": "/api/createStream",
        "description": "This endpoint generates stream id and access token for it.",
        "body": "No body",
        "response": "{'id': '1234', 'accessToken': 'ey1234....'}",
        "method": "GET"
    },
    {
        "endpoint": "/api/play",
        "description": "This endpoint plays music for sent stream id. <b>Access token required. Add to Authorization header.</b>",
        "body": "{'id': '1234', 'url': 'https://songroom.glitch.me/music/test_music.mp3'}",
        "response": "{'result': 'successful', 'message': 'Message sent to clients.'}",
        "method": "POST"
    },
    
    {
        "endpoint": "/api/stop",
        "description": "This endpoint stops the music for the given stream id. <b>Access token required. Add to Authorization header.</b>",
        "body": "{'id': '1234'}",
        "response": "{'result': 'successful', 'message': 'Message sent to clients.'}",
        "method": "POST"
    },
  
    {
        "endpoint": "/api/playWithLoad",
        "description": "This endpoint sends a load message first, waits for until every client loads the audio. Then plays it for extra sync. <b>Access token required. Add to Authorization header.</b>",
        "body": "{'id': '1234', 'url': 'https://songroom.glitch.me/music/test_music.mp3'}",
        "response": "{'result': 'successful', 'message': 'Message sent to clients.'}",
        "method": "POST"
    },
    {
        "endpoint": "/api/mute",
        "description": "This endpoint mutes the music for given stream id. <b>Access token required. Add to Authorization header.</b>",
        "body": "{'id': '1234'}",
        "response": "{'result': 'successful', 'message': 'Message sent to clients.'}",
        "method": "POST"
    },
    {
        "endpoint": "/api/unmute",
        "description": "This endpoint unmutes the music for given stream id. <b>Access token required. Add to Authorization header.</b>", 
        "body": "{'id': '1234'}",
        "response": "{'result': 'successful', 'message': 'Message sent to clients.'}",
        "method": "POST"
    },
    {
        "endpoint": "/api/getSongDuration",
        "description": "This endpoint returns the duration/length of the music file in seconds. Can be used for waiting until song ends. ",
        "body": "{'url': 'https://songroom.glitch.me/music/test_music.mp3'}",
        "response": "{'result': 'successful', 'message': 94.003}",
        "method": "GET"
    },
];


function createMessageJson(type, message) {
  let newMessage = {}
  
  newMessage.type = type
  
  if (message) {
    newMessage.message = message
  }
  console.log(newMessage)
  return newMessage
}

/*function checkCommand(command, body) {
  const commandConfig = APICommands[command]
  
  if (commandConfig == undefined) {
    return "Invalid command."
  }
  console.log(commandConfig, commandConfig['topic'])
  if (body.id == undefined) {
    return "No topic/id given."
  }

  if (commandConfig["url"] !== undefined && body["url"] == null) {
    return "No url/message given."
  }
  
  return true
}*/

function authenticateToken(req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).send('Unauthorized');
  }

  jwt.verify(token, process.env.TOKEN_SECRET, (err, token_data) => {
    if (err) {
      return res.status(403).send(err);
    } else if (token_data.id !== req.body.id) {
      return res.status(401).send('Unauthorized');
    }

    next();
  });
}

function waitForLoad(topic) {
    return new Promise(async (resolve, reject) => {
      let retries = 0;
      
      console.log("[Load Check]: Checking if loaded. Tries: ", retries)

      async function poll() {
        var foundNonLoaded = false
        topicClients.get(topic).forEach((client, topic) => {
          if (client.hasLoaded == false) {
            foundNonLoaded = true
          }
        });
        
        console.log("Found non-loaded client: ", foundNonLoaded)

        if (foundNonLoaded == false) {
          resolve();
        } else {
          retries++;
          if (retries <= maxRetries) {
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            poll();
          } else {
            reject(new Error("Exceeded maximum retries"));
          }
        }
      }

      poll();
    });
  }


router.get('/', (req, res) => {
  res.sendFile("api.html", { root: __dirname + "/public/api" });
})

router.post('/play', authenticateToken, (req, res) => { 
  const body = req.body;
  const topic = body.id;
  const url = body.url;
  
  if (topic == undefined || url == undefined)  {
    return res.json({'result': "error", 'message': "Missing parameters"})
    
  }
 
  let message = createMessageJson("play", url)
  
  lastData[topic] = { url: message.message, timestamp: Date.now() };
  sendToTopicClients(topic, message)

  res.json({'result': "successful", 'message': "Message sent to clients."})
})

router.post('/load', authenticateToken, (req, res) => { 
  const body = req.body;
  const topic = body.id;
  const url = body.url;
  
  if (topic == undefined || url == undefined)  {
    return res.json({'result': "error", 'message': "Missing parameters"})
  }
  
  const clients = topicClients.get(topic)
  clients.forEach((client, topic) => {
      client.hasLoaded = false
  });
 
  let message = createMessageJson("load", url)
  sendToTopicClients(topic, message)

  res.json({'result': "successful", 'message': "Message sent to clients."})
})

router.post('/playWithLoad', authenticateToken, async (req, res) => { 
  const body = req.body;
  const topic = body.id;
  const url = body.url;
  
  if (topic == undefined || url == undefined)  {
    return res.status(400).json({'result': "error", 'message': "Missing parameters"})
  }
  
  const clients = topicClients.get(topic)
  if (clients == undefined) {
    return res.status(400).json({'result': "error", 'message': "No clients"})
  }
  clients.forEach((client, topic) => {
      client.hasLoaded = false
  });
 
  let message = createMessageJson("load", url)
  sendToTopicClients(topic, message)
  
  try {
    await waitForLoad(topic);
    console.log("All loaded.")
  } catch(error) {
    console.log("Exceeded tries, playing.")
  }
  
  let playMessage = createMessageJson("play", url)
  sendToTopicClients(topic, playMessage)
  
  /*var checkInterval = setInterval(function() {
    var foundNonLoaded = false
    topicClients.get(topic).forEach((client, topic) => {
      if (client.hasLoaded == false) {
        foundNonLoaded = true
      }
    });
    
    if (foundNonLoaded == true) {
      
    };
  }, 900);*/

  res.json({'result': "successful", 'message': "Message sent to clients."})
});

router.post('/stop', authenticateToken, (req, res) => { 
  const body = req.body;
  const topic = body.id;
  
  if (topic == undefined)  {
    return res.status(400).json({'result': "error", 'message': "Missing parameters"})
  }
 
  let message = createMessageJson("stop")
  lastData[topic] = null;
  sendToTopicClients(topic, message)

  res.json({'result': "successful", 'message': "Message sent to clients."})
})

router.post('/mute', authenticateToken, (req, res) => { 
  const body = req.body;
  const topic = body.id;
  
  const fade = body.fade;
  
  if (topic == undefined)  {
    return res.status(400).json({'result': "error", 'message': "Missing parameters"})
  }
 
  let message = createMessageJson("mute", fade)
  sendToTopicClients(topic, message)

  res.json({'result': "successful", 'message': "Message sent to clients."})
})

router.post('/unmute', authenticateToken, (req, res) => { 
  const body = req.body;
  const topic = body.id;
  
  const fade = body.fade;
  
  if (topic == undefined)  {
    return res.status(400).json({'result': "error", 'message': "Missing parameters"})
  }
 
  let message = createMessageJson("unmute", fade)
  sendToTopicClients(topic, message)

  res.json({'result': "successful", 'message': "Message sent to clients."})
})

router.get('/getAccessToken', (req, res) => { 
  const topic = req.body.id;
  if (topic == undefined) {
    return res.status(400).json({'result': "error", 'message': "Missing parameters"}) 
  }
  const token = generateAccessToken({'id': topic})

  res.json({ token });
})

router.get("/createStream", (req, res) => {
  var id = 0;
  do id = getRandomInt(1000, 9999).toString();
  while (topicClients.has(id) == true);
  
  console.log(id);
  
  const accessToken = generateAccessToken({'id': id})

  res.json({'id': id, 'accessToken': accessToken});
});

router.get("/registerStreamId", (req, res) => {
  const id = req.query.streamId
  id = id.toString()
  
  const accessToken = generateAccessToken({'id': id})
  
  console.log(accessToken);

  res.json({'id': id, 'accessToken': accessToken});
});

router.get("/getSongDuration", (req, res) => {
  const song = req.body.url
  if (song == undefined) {
    return res.status(400).send({'result': "error", 'message': "Missing parameters"})
  }
  getAudioDurationInSeconds(song).then((duration) => {
    res.json({'result': "successful" ,'message': duration})
  });
});

router.get("/list", (req, res) => {
  res.json(APIList);
});

app.use('/api', router)


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


