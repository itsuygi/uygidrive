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
const ytsearch = require("yt-search");
const ytdl = require("ytdl-core")

const admin = require('firebase-admin');
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString());

const app = express();

app.use(express.static("public"));
app.use('/common',express.static(path.join(__dirname, 'public/common')));


const bodyParser = require("body-parser");
app.use(express.json());
app.use(cookie())
app.set("view engine", "ejs");

const server = createServer(app);
const wss = new WebSocketServer({ server });

async function authenticateToken(req, res, next) {
  let sessionCookie = req.cookies.session || '';
  
  try {
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true /** checkRevoked */);
    
    req.user = decodedClaims
    next();
  } catch (error) {
    if (!req.sharePath) {
      res.redirect('/login');
    }
  }
}

async function authenticateShareToken(req, res, next) {
  let shareToken = req.query.shareToken
  let user = req.params.user
  
  let filename = req.params.filename
  
  if (shareToken) {
    jwt.verify(shareToken, process.env.TOKEN_SECRET, (err, token_data) => {
      if (err) {
        return res.send(err.message)
      }

      try {
        const requestedPath = `${user}/${filename}`
        console.log(requestedPath, token_data.path)
        console.log(requestedPath == token_data.path)
        
        if (requestedPath == token_data.path) {
          req.sharePath = token_data.path
          next()
        } else {
          res.status(401).send("Unauthorized")
        }
      } catch(err) {
        res.status(401).send(err.message)
      }
    });
  } else {
    res.status(401).send("Unauthorized")
  }
}

function isYouTubeUrl(url) {
    const youtubeDomains = ["youtube.com", "youtu.be", "m.youtube"];

    for (const domain of youtubeDomains) {
        if (url.includes(domain)) {
            return true;
        }
    }

    return false;
}

function url_parse(url){
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    var match = url.match(regExp);
    return (match&&match[7].length==11)? match[7] : false;
}

/*app.get("/downloadYT", async (req, res) => {
  try {
    const videoUrl = req.query.url
    
    if (isYouTubeUrl(videoUrl) == false) {
      return res.status(400).send("Not a valid YouTube URL!")
    }
    
    const id = url_parse(videoUrl)
    const video = await ytsearch( { videoId: id } )
    
    const title = video.title
    const filename = title + ".mp4"
    console.log(id, title, filename)
    
    const info = await ytdl.getInfo(videoUrl);
    const videoFormat = ytdl.chooseFormat(info.formats, { quality: '18' });

    const stream = ytdl(videoUrl, {format: videoFormat});
    
    //res.header('Content-Disposition', `attachment; filename="ytvideo.mp4"`);
    //res.header("Content-Type", "video/mp4; charset=binary")
    stream.pipe(res)
    
    /*const chunks = [];
    
    stream.on('data', (chunk) => {
        console.log("Data recieved")
        chunks.push(chunk);
      });

    stream.on('end', async () => {
     console.log("ended")
    }); 

    stream.on('error', (error) => {
      res.status(500).send(error.message);
    });
  } catch (error) {
    console.error('YT File uploading error:', error.message);
    res.status(500).send(error.message);
  }
});

app.get("/searchYT", async (req, res) => {
  const search = req.query.query
  const searchResults = await ytsearch(search)
  
  const result = []
  
  if (searchResults) {
    console.log(searchResults.videos)
    
    searchResults.videos.forEach((video) => {
      result.push({title: video.title, url: hostUrl + "/downloadYT?url=" + video.url, id: video.videoId})
    });
     
    console.log(result)
    res.json(result)
  }
}); */


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


function getFileUrl(fileName) {
  return hostUrl + "/file/" + fileName;
}

function getFolderUrl(folderPath) {
  return hostUrl + "/list?path=" + folderPath;
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
        res.json({ status: 'success' });
      },
      (error) => {
        res.status(401).json({ status: 'fail' });
      }
    );
});

app.get('/sessionLogout', (req, res) => {
  res.clearCookie('session');
  res.redirect("/login")
});

app.get("/", authenticateToken, (req, res) => {
  res.render(__dirname + '/public/upload.ejs', { email: req.user.email });
});

app.get("/login", async (req, res) => {
  let sessionCookie = req.cookies.session || '';
  try {
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true /** checkRevoked */);
    
    res.redirect("/")
  } catch (error) {
    res.sendFile(__dirname + '/public/login/login.html');
  }
});

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
    //await bucket.file(filePath).makePublic()

    const fileUrl = getFileUrl(filename, req)
    res.send(fileUrl);
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

app.get("/file/*", authenticateToken, async (req, res) => {
  try {
    const user = req.user
    let filename = req.params[0];
    
     if (filename.endsWith("/")) {
      filename = filename.slice(0, -1);
    }
    console.log(filename)
    const rangeHeader = req.headers.range;
    
    let filePath = `${user.uid}/${filename}`
    
    const file = bucket.file(filePath);
    const fileMetadata = await file.getMetadata();
    const fileContent = await file.download();
    
    res.header("Content-Type", fileMetadata[0].contentType)
    res.send(fileContent[0])
  } catch (error) {
    console.log("Error getting file: ", error)
    
    res.status(error.code).send((error.code == 404) ? "File not found" : error.message)
  }
});

app.get("/folder/*", authenticateToken, async (req, res) => {
  try {
    const user = req.user
    let folderName = req.params[0];
    
    let filePath = `${user.uid}/${folderName}`
    
    const [files] = await bucket.getFiles({ prefix: filePath });
    
    let result = []
    
    for (const file of files) {
      const isFolder = file.name.endsWith('/')
      const fileMetadata = await file.getMetadata();
      
      var splitUrl = fileMetadata[0].name.split("/")
      let fileNameSplit = file.name.split("/")
      
      var name = (!isFolder) ? splitUrl[splitUrl.length - 1] : splitUrl[splitUrl.length - 2]
      
      const fileUrl = (isFolder) ? getFolderUrl(name) : getFileUrl(name)
     
      console.log(fileMetadata)
      const fileDate = fileMetadata[0].timeCreated;
      
      console.log(splitUrl)

      result.push({ name, url: fileUrl, date: fileDate, size: formatBytes(fileMetadata[0].size || 0), type: (isFolder) ? "folder" : "file" });
    }
    
    res.send(result)
  } catch (error) {
    console.log("Error getting file: ", error)
    
    res.status(error.code).send((error.code == 404) ? "File not found" : error.message)
  }
});

app.get("/shared/:user/:filename", authenticateShareToken, async (req, res) => {
  try {
    const sharePath = req.sharePath
    
    const user = req.params.user;
    const filename = req.params.filename;
    
    const file = bucket.file(sharePath);
    const fileMetadata = await file.getMetadata();
    const fileContent = await file.download();
    
    res.header("Content-Type", fileMetadata[0].contentType)
    res.send(fileContent[0])
  } catch (error) {
    console.log("Error getting file: ", error)
    res.status(500).send(error)
  }
});

app.delete("/file/:filename", authenticateToken, async (req, res) => {
  try {
    const user = req.user
    const filename = req.params.filename;
    
    const filePath = `${user.uid}/${filename}`
    
    await bucket.file(filePath).delete();
    
    res.json({result: "success", message: "File deleted successfully."})
  } catch (error) {
    res.status(500).json({result: "error", message: error.message})
  }
});

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

app.get("/list", authenticateToken, async (req, res) => {
  try {
    console.log("Recieved file list request.")
    
    const user = req.user;
    const page = req.query.page; 
    const search = req.query.search;
    const sort = req.query.sort;
    const pageSize = 10;
    
    const pathQuery = req.query.path || "";

    
    
    const userFolder = `${user.uid}/${pathQuery}`;
    console.log(userFolder)

    const [files] = await bucket.getFiles({ prefix: userFolder });
    let fileList = [];

    const filesOnly = files
          //files.filter((file) => !file.name.endsWith('/'));
    
    /*for (const file of files) {
      bucket.file(file.name).makePrivate()
    }*/

    for (const file of filesOnly) {
      const isFolder = file.name.endsWith('/')
      const fileMetadata = await file.getMetadata();
      
      var splitUrl = fileMetadata[0].name.split("/")
      let fileNameSplit = file.name.split("/")
      
      var name = (!isFolder) ? splitUrl[splitUrl.length - 1] : splitUrl[splitUrl.length - 2]
      
      
      const fileUrl = (isFolder) ? getFolderUrl(path.join.apply(null, splitUrl.splice(1, splitUrl.length))) : getFileUrl(name)
     
      
      const fileDate = fileMetadata[0].timeCreated;
      

      fileList.push({ name, url: fileUrl, date: fileDate, size: formatBytes(fileMetadata[0].size || 0), type: (isFolder) ? "folder" : "file" });
    }

    if (sort) {
      switch (sort) {
        case "date:old-first":
          fileList.sort((a, b) => compareAsc(new Date(b.date), new Date(a.date)));
          break;
        case "date:new-first":
          fileList.sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)));
          break;
      }
    }

    if (search) {
      const searchResults = fileList.filter((file) => {
        try {
          return file.url.toLowerCase().includes(search);
        } catch {
          return file.toLowerCase().includes(search);
        }
      });

      fileList = searchResults;
    }

    let startIndex, endIndex;
    if (page) {
      startIndex = (page - 1) * pageSize;
      endIndex = page * pageSize;
      
      fileList = fileList.slice(startIndex, endIndex);
    }

    const response = {
      files: fileList,
      next: filesOnly.length > endIndex,
    };

    res.json(response);
  } catch (error) {
    console.error("Error while listing the files:", error);
    res.status(500).send(error.message);
  }
});

function generateAccessToken(data, time) {
  if (time == undefined) {
    time = "10h"
  }
  return jwt.sign(data, process.env.TOKEN_SECRET, { expiresIn: time });
}

function getSharedFileUrl(file, user) {
  return `${hostUrl}/shared/${user}/${file}`
}

app.post('/getShareLink', authenticateToken, async (req,res) => {
  try {
    const file = req.body.file

    if (!file) {
      return res.status(500).send("No file found in parameters.")
    }
    
    const user = req.user.uid

    const days = 5
    const filePath = `${req.user.uid}/${file}`
    console.log(filePath)

    /*const [url] = await bucket.file(filePath).getSignedUrl({
      action: "read",
      expires: new Date( Date.now() + days * 24 * 60 * 60 * 1000),
    })*/
    
    const token = generateAccessToken({path: filePath})
    const url = getSharedFileUrl(file, user) + "?shareToken=" + token

    res.send(url)
  } catch (error) {
    console.error(error)
    res.status(500).send(error.message)
  }
});


// Server handling
function serverStart() {
  console.log("********* UygiDrive Server Started *********")
  var port = this.address().port;
  console.log("Project domain: " + hostUrl)
  console.log("Server listening on port: " + port);
  
  cache.clear()
  
}

// start the server:
server.listen(process.env.PORT || 3000, serverStart);
