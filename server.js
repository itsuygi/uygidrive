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

const admin = require('firebase-admin');
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString());

const app = express();

app.use(express.static("public"));
app.use('/common',express.static(path.join(__dirname, 'public/common')));

const bodyParser = require("body-parser");
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });


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
const maxRetries = 10
const hostUrl = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;


function getFileUrl(fileName, req) {
  var fileUrl = "https://" + req.get("host") + "/music/" + fileName;

  return fileUrl;
}

// Uploading


app.post("/uploadFile", upload.single("file"), async (req,res) => {
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

app.get("/file/:filename", async (req, res) => {
  /*const filename = req.params.filename;
  const publicUrl = format(
      `https://storage.googleapis.com/${bucket.name}/${filename}`
  );
  
  res.set('Cache-Control', 'public, max-age=3000, s-maxage=3600');
  
  res.redirect(publicUrl)*/
  
  try {
    const filename = req.params.filename;
    const rangeHeader = req.headers.range;
    
    var cached = cache.get(filename)
    
    if (cached) {
      if (cached !== "DOWNLOADING") {
        console.log("Found file in memory: ", filename)
        const totalLength = cached.length;
  
        res.set('Content-Type', 'audio/mpeg');
        res.set('Accept-Ranges', "bytes");
        // Parse the range header
        if (rangeHeader) {
          const parts = rangeHeader.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

          // Calculate content length and content range
          const chunkSize = end - start + 1;
          const contentRange = `bytes ${start}-${end}/${totalLength}`;

          // Set headers for partial content
          
          res.set('Content-Length', chunkSize);
          res.set('Content-Range', contentRange);
          res.status(206);

          // Send the partial content
          res.send(cached.slice(start, end + 1));
        } else {
          res.send(cached)
        }
      } else {
        console.log("Already downloading, redirecting.")
        
        const publicUrl = getPublicUrl(filename)
        res.redirect(publicUrl)
      }
      
    } else {
      // Redirect to public link for faster response
      const publicUrl = getPublicUrl(filename)

      //res.set('Cache-Control', 'public, max-age=3000, s-maxage=3600');
      res.set("Content-Type", "audio/mpeg")
      res.redirect(publicUrl)
      
      console.log("Public url sent, caching.")
      
      // Download and cache
      const file = bucket.file(filename);
      console.log("File didn't found on memory, downloading: ", filename)
      cache.put(filename, "DOWNLOADING")
      
      const fileContent = await file.download();
      
      let memory = getMemoryUsage()
      let memoryUsage = Math.round((memory * 100)/ 512 )
      
      console.log("File downloaded: ", filename)
      console.log("Memory usage: %", memoryUsage)
      
      if (memoryUsage <= 80) {
        const fileData = fileContent[0];
        cache.put(filename, fileData);
        
        console.log("File saved to memory, enough space: ", filename)
      } else {
        console.log("Not enough space to cache, cancelling.")
        cache.del(filename)
      }
      
      //res.send(fileContent[0])
    }
  } catch (error) {
    console.log("Error getting file: ", error)
    res.status(500).send(error)
  }
});


app.get("/upload/list", (req, res) => {
  let page = req.query.page; 
  let search = req.query.search;
  let sort = req.query.sort;
  const pageSize = 10;
  
  bucket.getFiles()
    .then((results) => {
      const files = results[0];
      const fileLength = files.length
      
      let startIndex = (page - 1) * pageSize;
      let endIndex = page * pageSize;

      let fileUrls;
    
      if (sort) {
        fileUrls = files.map((file) => {
          return {url: getFileUrl(file.name, req), date: file.metadata.timeCreated}
        });
    
      } else {
        fileUrls = files.map((file) => {
          return getFileUrl(file.name, req)
        });
      }
      if (search) {
        let searchResults;
        searchResults = fileUrls.filter(function(file) {
          try {
            return file.url.toLowerCase().includes(search)
          } catch {
            return file.toLowerCase().includes(search)
          }
        });
        
        fileUrls = searchResults
      }
    
      if (sort) {
        switch (sort) {
          case "date:old-first":
            fileUrls.sort(function(a,b){
               return compareAsc(new Date(b.date), new Date(a.date));
            });
          case "date:new-first":
            fileUrls.sort(function(a,b){
               return compareDesc(new Date(a.date), new Date(b.date));
            });
        }
      }
      
      if (page) {
        fileUrls = fileUrls.slice(startIndex, endIndex)
      }
      
      
      if (page == undefined){
        return res.json(fileUrls)
      }
      
      let next = true
      page++
    
      if (files.slice((page - 1) * pageSize, page * pageSize).length == 0) {
        next = false
      }
    
      const response = {
        files: fileUrls,
        next: next
      }
      
      res.json(response);
    })
    .catch((error) => {
      console.error("Error while listing the files:", error);
      res.status(500).send(error.message);
    });
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
