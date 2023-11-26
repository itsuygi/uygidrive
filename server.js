// Uploading System by Uygi © 2023

const express = require("express");
const router = express.Router();

const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { format } = require('util');
const { compareDesc, compareAsc } = require("date-fns");
const axios = require('axios');
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const jwt = require('jsonwebtoken');
const cache = require('memory-cache');
const cookie = require('cookie-parser');

const admin = require('firebase-admin');
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString());

const app = express();

app.use(express.static("public"));
app.use('/common',express.static(path.join(__dirname, 'public/common')));


const bodyParser = require("body-parser");
app.use(express.json());
app.use(cookie())

const server = createServer(app);
const wss = new WebSocketServer({ server });

function authenticateToken(req, res, next) {
  let sessionCookie
  
  try {
    sessionCookie = req.cookies.session
  } catch(error) {
    sessionCookie = ''
  }
  
  try {
    admin.auth()
    .verifySessionCookie(sessionCookie, true /** checkRevoked */)
    .then((decodedClaims) => {
      next()
    })
    .catch((error) => {
      return res.redirect('/login');
    });
  } catch (error) {
    console.log(error)
    return res.redirect('/login');
  }
}

app.use(authenticateToken)



function getMemoryUsage() {
  let total_rss = require('fs').readFileSync("/sys/fs/cgroup/memory/memory.stat", "utf8").split("\n").filter(l => l.startsWith("total_rss"))[0].split(" ")[1]; 
  return Math.round( Number(total_rss) / 1e6 ) - 60;
}

// Uploading setup

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://uygidrive.appspot.com"
});
const bucket = admin.storage().bucket();

const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
  /*fileFilter: function (req, file, cb) {
    console.log(isValidMimeType(file.mimetype))
    if (!isValidMimeType(file.mimetype)) {
      return cb(new Error("Not valid file type"), false);
    }
    cb(null, true);
  },*/
});


const upload = multer({ storage: multer.memoryStorage() });
const maxRetries = 10
const hostUrl = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;


function getFileUrl(fileName, req) {
  var fileUrl = "https://" + req.get("host") + "/file/" + fileName;

  return fileUrl;
}

app.post('/sessionLogin', (req, res) => {
  // Get the ID token passed and the CSRF token.
  const idToken = req.body.idToken.toString();
  const expiresIn = 60 * 60 * 24 * 5 * 1000;
  
  admin.auth()
    .createSessionCookie(idToken, { expiresIn })
    .then(
      (sessionCookie) => {
        const options = { maxAge: expiresIn, httpOnly: true, secure: true };
        res.cookie('session', sessionCookie, options);
        res.end(JSON.stringify({ status: 'success' }));
      },
      (error) => {
        res.status(401).send('UNAUTHORIZED REQUEST!');
      }
    );
});

/*app.get('/', authenticateToken, (req,res) => {
  res.send("index.html")
});*/

// Uploading

app.post("/uploadFile", authenticateToken, upload.single("file"), async (req,res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file or non-accepted file type.');
    }

    const user = req.user
    const file = req.file;
    const filename = file.originalname;
    const fileBuffer = file.buffer;

    const fileOptions = {
      metadata: {
        contentType: file.mimetype
      }
    };
    
    const filePath = path.join(user.uid, filename)

    await bucket.file(filePath).save(fileBuffer, fileOptions);
    await bucket.file(filePath).makePublic()

    const fileUrl = getFileUrl(filePath, req)
    res.send();
  } catch (error) {
    console.error('File uploading error:', error);
    res.status(500).send(error.message);
  }
});

app.get("/local/:filename", (req, res) => {
 const filename = req.params.filename;
  console.log("Sending file: " + filename);
  
  //res.set("Content-Type", "audio/mpeg")
  res.sendFile(__dirname + "/uploads/" + filename);
});

function getPublicUrl(filename) {
  const publicUrl = format(
    `https://storage.googleapis.com/${bucket.name}/${filename}`
  );
  
  return publicUrl
}

app.get("/file/:filename", authenticateToken, async (req, res) => {
  try {
    const user = req.user
    const filename = req.params.filename;
    const rangeHeader = req.headers.range;
    
    const filePath = `${user.uid}/${filename}`;
    
    const file = bucket.file(filePath);
    const fileContent = await file.download();

    let memory = getMemoryUsage()
    let memoryUsage = Math.round((memory * 100)/ 512 )

    console.log("File downloaded: ", filePath)
    console.log("Memory usage: %", memoryUsage)

    res.send(fileContent)
  } catch (error) {
    console.log("Error getting file: ", error)
    res.status(500).send(error)
  }
});


app.get("/list", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const page = req.query.page; 
    const search = req.query.search;
    const sort = req.query.sort;
    const pageSize = 10;

    // Kullanıcının dosyalarını almak için özel klasörü belirtin
    const userFolder = `${user.uid}/`;

    const [files] = await bucket.getFiles({ prefix: userFolder });
    const fileUrls = [];

    // Sadece dosyaları listele, klasörü dahil etme
    const filesOnly = files.filter((file) => !file.name.endsWith('/'));

    for (const file of filesOnly) {
      const fileUrl = getFileUrl(file.name, req);
      const fileMetadata = await file.getMetadata();
      const fileDate = fileMetadata[0].timeCreated;

      fileUrls.push({ url: fileUrl, date: fileDate });
    }

    // Sıralama
    if (sort) {
      switch (sort) {
        case "date:old-first":
          fileUrls.sort((a, b) => compareAsc(new Date(b.date), new Date(a.date)));
          break;
        case "date:new-first":
          fileUrls.sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)));
          break;
        // Diğer sıralama türleri eklenebilir
      }
    }

    // Arama
    if (search) {
      const searchResults = fileUrls.filter((file) => {
        try {
          return file.url.toLowerCase().includes(search);
        } catch {
          return file.toLowerCase().includes(search);
        }
      });

      fileUrls = searchResults;
    }

    // Sayfalama
    let startIndex, endIndex;
    if (page) {
      startIndex = (page - 1) * pageSize;
      endIndex = page * pageSize;
      fileUrls = fileUrls.slice(startIndex, endIndex);
    }

    // Sonuçları gönder
    const response = {
      files: fileUrls,
      next: filesOnly.length > endIndex,
    };

    res.json(response);
  } catch (error) {
    console.error("Error while listing the files:", error);
    res.status(500).send(error.message);
  }
});
// Server handling

function serverStart() {
  var port = this.address().port;
  console.log("Project domain: " + hostUrl)
  console.log("Server listening on port: " + port);
  console.log(cache.memsize())
  cache.clear()
  
}

// start the server:
server.listen(process.env.PORT || 3000, serverStart);
