// Cloud Storage System by Uygi © 2023

const express = require("express");
const router = express.Router();

const { createServer } = require("http");
const { format } = require('util');
const { compareDesc, compareAsc } = require("date-fns");
const fs = require("fs");
const path = require("path");
const jwt = require('jsonwebtoken');
const cache = require('memory-cache');
const cookie = require('cookie-parser');
const busboy = require('busboy');
const contentDisposition = require('content-disposition');

//const ytsearch = require("yt-search");
//const ytdl = require("ytdl-core")

const { minify } = require('uglify-js');

const admin = require('firebase-admin');
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString());

const app = express();

app.use(express.static("public"));

app.use('/common',express.static(path.join(__dirname, 'public/common')));

const bodyParser = require("body-parser");
app.use(express.json());
app.use(cookie())
app.set("view engine", "ejs");

let minifiedCache = {}

const server = createServer(app);

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
  
  let filepath = req.params[0]
  
  if (shareToken) {
    jwt.verify(shareToken, process.env.TOKEN_SECRET, (err, token_data) => {
      if (err) {
        return res.render(__dirname + '/public/views/error.ejs', {"title": 500, "detail": (err.message == "jwt expired") ? "link expired" : err.message});
      }

      try {
        const requestedPath = `${user}/${filepath}`
        console.log(requestedPath, token_data.path)
        
        if (requestedPath == token_data.path) {
          req.sharePath = token_data.path
          next()
        } else {
          res.render(__dirname + '/public/views/error.ejs', {"title": 401, "detail": "Unauthorized"});
        }
      } catch(err) {
        res.render(__dirname + '/public/views/error.ejs', {"title": 500, "detail": err.message});
      }
    });
  } else {
    res.render(__dirname + '/public/views/error.ejs', {"title": 401, "detail": "no share token provided"});
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

/*const multerStorage = multer.diskStorage({
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
  },
});

const upload = multer({ storage: multer.memoryStorage() });
*/


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
  res.render(__dirname + '/public/uploadv2.ejs', { email: req.user.email });
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

/*app.post("/uploadFile", authenticateToken, upload.single("file"), async (req,res) => {
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

app.post("/uploadFileV2", authenticateToken, async (req,res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file or non-accepted file type.');
    }

    const user = req.user
    const file = req.file;
    const filename = file.originalname;
    const fileBuffer = file.buffer;
    
    let contentBuffer = []
    let totalBytesInBuffer = 0
    
    const fileOptions = {
      metadata: {
        contentType: file.mimetype
      }
    };
    
    const filePath = path.join(user.uid, filename)

    let bucketFile = bucket.file(filePath)
    
    req.on('data', chunk => {
      contentBuffer.push(chunk);
      totalBytesInBuffer += chunk.length;

      // Look to see if the file size is too large.
      /*if (totalBytesInBuffer > maxFileSize) {
        req.pause();

        res.header('Connection', 'close');
        res.status(413).json({error: `The file size exceeded the limit of ${maxFileSize} bytes`});

        req.connection.destroy();
      }
    })
    .pipe(file.createWriteStream({
      metadata: fileOptions
    }))
    .on('error', function(err) {})
    .on('finish', function() {
      const fileUrl = getFileUrl(filename, req)
      res.send(fileUrl)
    });
    
    fs.createReadStream('/Users/stephen/Photos/birthday-at-the-zoo/panda.jpg')
      

    req.on('aborted', function() {
      print("Upload aborted.")
    });

    req.on('end', async function() {
      contentBuffer = Buffer.concat(contentBuffer, totalBytesInBuffer);

      try {
        
        //res.status(201).json({result: true});
      } catch (err) {
        console.error(err);

        res.header('Connection', 'close');
        res.status(500).json({error: 'Oops, something broke!'});

        req.connection.destroy();
      }
    });

    
  } catch (error) {
    console.error('File uploading error:', error);
    res.status(500).send(error.message);
  }
});*/

app.post('/upload', authenticateToken, (req, res) => {
  const bb = busboy({ headers: req.headers });
  const user = req.user
  const pathQuery = req.query.path || ""
  
  let fileUrl = []
  
  bb.on('file', (fieldname, file, filename, encoding, mimetype) => {
    filename = filename.filename
    
    let pathWithoutUser = pathQuery + filename
    
    const filePath = `${user.uid}/${pathWithoutUser}`;
    console.log(filePath)
    
    const fileUpload = bucket.file(filePath);

    const uploadStream = fileUpload.createWriteStream({
      metadata: {
        contentType: mimetype,
      },
    });

    file.pipe(uploadStream);
    
    file.on("data", () => {
      console.log("[File Upload]: Data recieved")
    })

    uploadStream.on('error', (err) => {
      console.error(err);
      return res.status(500).render(__dirname + '/public/views/error.ejs', {"title": 500, "detail": "error while uploading"});
    });

    uploadStream.on('finish', () => {
      const fileUrl = getFileUrl(pathWithoutUser, req)
      res.send(fileUrl);
    });
  });

  req.pipe(bb);
});

app.post('/convert', authenticateToken, (req, res) => {
  const bb = busboy({ headers: req.headers });
  const user = req.user;
  const pathQuery = req.query.path || "";

  bb.on('file', (fieldname, file, info) => {
    const { filename, encoding, mimetype } = info;
    
    let pathWithoutUser = path.join(pathQuery, filename);
    const filePath = path.join(user.uid, pathWithoutUser);
    
    const fileUpload = bucket.file(filePath);

    const uploadStream = fileUpload.createWriteStream({
      metadata: {
        contentType: mimetype,
      },
    });

    file.pipe(uploadStream);

    file.on("data", () => {
      console.log("[File Upload]: Data received");
    });

    uploadStream.on('error', (err) => {
      console.error(err);
      return res.status(500).render(path.join(__dirname, '/public/views/error.ejs'), {"title": 500, "detail": "error while uploading"});
    });

    uploadStream.on('finish', async () => {
      try {
        const fileUrl = await fileUpload.getSignedUrl({
          action: 'read',
          expires: '03-01-2500'
        });
        res.send(fileUrl[0]);
      } catch (err) {
        console.error(err);
        res.status(500).send('Error generating signed URL');
      }
    });
  });

  bb.on('finish', () => {
    console.log('Upload complete');
  });

  req.pipe(bb);
});


app.get("/local/:filename", (req, res) => {
 const filename = req.params.filename;
  console.log("Sending file: " + filename);
  
  //res.set("Content-Type", "audio/mpeg")
  res.sendFile(__dirname + "/public/" + filename);
});

function getPublicUrl(filename) {
  const publicUrl = format(
    `https://storage.googleapis.com/${bucket.name}/${filename}`
  );
  
  return publicUrl
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const replaceSpecialChars = (str) => {
	return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
		.replace(/([^\w]+|\s+)/g, '-') // Replace space and other characters by hyphen
		.replace(/\-\-+/g, '-')	// Replaces multiple hyphens by one hyphen
		.replace(/(^-+|-+$)/g, ''); // Remove extra hyphens from beginning or end of the string
}

app.get('/file/visibility', authenticateToken, async (req,res) => {
  try {
    const fileName = req.query.file

    if (!fileName) {
      return res.status(500).send("No file or value found in parameters.")
    }
    
    const user = req.user.uid
    const filePath = `${req.user.uid}/${fileName}`
    
    const fileMetadata = await bucket.file(filePath).getMetadata()
    console.log(fileMetadata)
    const isPublic = fileMetadata[0].metadata.public || false
    
    res.json({success: true, public: (isPublic == "true") ? true : false, url: (isPublic == "true") ? `${hostUrl}/public/${user}/${fileName}` : undefined})
  
  } catch (error) {
    console.error(error)
    
    res.json({success: false, public: false})
  }
});

app.post('/file/visibility', authenticateToken, async (req,res) => {
  try {
    const fileName = req.body.file
    const isPublic = (req.body.public == true) ? "true" : "false"

    if (!fileName) {
      return res.status(500).send("No file or value found in parameters.")
    }
    
    const user = req.user.uid
    const filePath = `${req.user.uid}/${fileName}`
    
    const file = await bucket.file(filePath)
    var newMetadata = {
        metadata:{
        'public': isPublic
      }
    }
    

    console.log(newMetadata)
    let result = await file.setMetadata(newMetadata);
    console.log(result)
    res.json({success: true, public: req.body.public, url: `${hostUrl}/public/${user}/${fileName}`})
  
  } catch (error) {
    console.error(error)
    res.status(500).send(error.message)
  }
});

app.get("/public/:user/*", async (req, res) => {
  try {
    const fileOwner = req.params.user
    const filePath = req.params[0]

    const generalFilePath = `${fileOwner}/${filePath}`

    const file = await bucket.file(generalFilePath)
    const fileMetadata = await file.getMetadata()
    
    if (fileMetadata[0].metadata.public == "true") {
      sendFile(generalFilePath, req, res)
    } else {
      res.render(__dirname + '/public/views/error.ejs', {"title": "500", "detail": "This file is not public"});
    }
  } catch(error) {
    console.log("Error getting public file: ", error)
    
    res.render(__dirname + '/public/views/error.ejs', {"title": error.code, "detail": (error.code == 404) ? "File not found" : "No access to this file"});
  }
});

async function sendFile(filePath, req, res) {
    const rangeHeader = req.headers.range;
    
    const file = bucket.file(filePath);
    const fileMetadata = await file.getMetadata();
    
    const splitUrl = fileMetadata[0].name.split("/")
    const filenameFromStorage = splitUrl[splitUrl.length - 1]
    
    const range = req.headers.range;
    const size = fileMetadata[0].size

    /** Check for Range header */
    if (range && req.query.download == undefined) {
      /** Extracting Start and End value from Range Header */
      let [start, end] = range.replace(/bytes=/, "").split("-");
      start = parseInt(start, 10);
      end = end ? parseInt(end, 10) : size - 1;

      if (!isNaN(start) && isNaN(end)) {
        start = start;
        end = size - 1;
      }
      if (isNaN(start) && !isNaN(end)) {
        start = size - end;
        end = size - 1;
      }

      // Handle unavailable range request
      if (start >= size || end >= size) {
        // Return the 416 Range Not Satisfiable.
        res.writeHead(416, {
          "Content-Range": `bytes */${size}`
        });
        return res.end();
      }

      /** Sending Partial Content With HTTP Code 206 */
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": fileMetadata[0].contentType,
      });

      let readable = file.createReadStream({                      
        start: start,
        end: end
      })
      .pipe(res);

    } else {
      res.writeHead(200, {
        "Content-Length": size,
        "Content-Type": fileMetadata[0].contentType || "",
        "Content-Disposition": (req.query.download == "true") ? "attachment" : ""
      });

      file.createReadStream()
      .pipe(res);

    }
    
}

app.post("/file/rename", authenticateToken, async (req, res) => {
  try {
    const filePath = req.body.file
    const newName = req.body.name

    const user = req.user
    const path = `${user.uid}/${filePath}`
    const file = bucket.file(path)
    
    await file.rename(`${user.uid}/${newName}`)
    
    res.json({success: true, newName})
  } catch (error){
    res.status(500).json({success: false, message: error.message})
  }
});

app.get("/file/*", authenticateToken, async (req, res) => {
  try {
    const user = req.user
    let filename = req.params[0];
    
     if (filename.endsWith("/")) {
      filename = filename.slice(0, -1);
    }
    
    let filePath = `${user.uid}/${filename}`
    
    sendFile(filePath, req, res)
    
  } catch (error) {
    console.log("Error getting file: ", error)
    
    res.render(__dirname + '/public/views/error.ejs', {"title": error.code, "detail": (error.code == 404) ? "File not found" : error.message});
  }
});

/*app.get("/folder/*", authenticateToken, async (req, res) => {
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
});*/

app.get("/shared/:user/*", authenticateShareToken, async (req, res) => {
  try {
    const sharePath = req.sharePath
    
    const user = req.params.user;
    //const filename = req.params.filename;
    
    sendFile(sharePath, req, res)
  } catch (error) {
    console.log("Error getting file: ", error)
    res.status(500).render(__dirname + '/public/views/error.ejs', {"title": 500, "detail": "error while getting file"});
  }
});


app.delete("/file/*", authenticateToken, async (req, res) => {
  try {
    const user = req.user
    let filename = req.params[0];
    
    if (filename.endsWith("/")) {
      filename = filename.slice(0, -1);
    }
    console.log(filename)
    
    const filePath = `${user.uid}/${filename}`
    
    try {
      await bucket.file(filePath).delete();
    } catch {
      filename += "/"
      await bucket.deleteFiles({
        prefix: `${user.uid}/${filename}`
      })
    }
    
    res.json({result: "success", message: "File deleted successfully."})
  } catch (error) {
    res.status(500).json({result: "error", message: error.message})
  }
});

app.put("/folder", authenticateToken, async (req, res) => {
  try {
    const user = req.user
    const foldername = req.body.name;
    const path = req.query.path || ""
    
    const folderPath = `${user.uid}/${path + foldername}/`
    
    await bucket.file(folderPath).save("");
    
    res.json({result: "success", message: "Folder created successfully."})
  } catch (error) {
    res.status(500).json({result: "error", message: error.message})
  }
});

app.get("/list", authenticateToken, async (req, res) => {
  try {
    console.log("Recieved file list request.")
    
    const user = req.user;
    const page = req.query.page; 
    const search = req.query.search;
    const sort = req.query.sort;
    const pageSize = 25;
    
    const pathQuery = req.query.path || "";

    const userFolder = `${user.uid}/${pathQuery}`;
    console.log(userFolder)
    
    const [files] = await bucket.getFiles({prefix: userFolder, delimiter:(!pathQuery) ? undefined : undefined, autoPaginate: false});
    console.log("Recieved files from storage.")
    
    let fileList = [];

    const filesOnly = files
    
    let loopStartDate = new Date()
    
    let count = 0
    for (const file of filesOnly) {
      count++
      
      //console.log(file.metadata.contentType, file.name)
      //const isFolder = (file.metadata.contentType != undefined || file.metadata.contentType == "application/x-www-form-urlencoded;charset=UTF-8") ? false : true
      const isFolder = (file.name.endsWith("/"))
      const fileMetadata = [file.metadata]
      
      const mainName = fileMetadata[0].name
      
      var splitUrl = fileMetadata[0].name.split("/")
      let fileNameSplit = file.name.split("/")
      
      if (count == 1 && isFolder) {
        continue
      }
      
      
      var name = (!isFolder) ? splitUrl[splitUrl.length - 1] : splitUrl[splitUrl.length - 2]
      
      const folderPath = (path.join.apply(null, splitUrl.splice(1, splitUrl.length))) + "/"
      const filePath = (!isFolder) ? mainName.substring(mainName.indexOf('/') + 1) : undefined
      
      fileNameSplit = fileNameSplit.filter(function(item) {
        return item.length !== 0
      })
      
      // Is subfolder or subfile check start
      fileNameSplit.shift()
      fileNameSplit.pop()
      
      let fileNameJoin = fileNameSplit.join("/") + "/"
      
      if (fileNameJoin == "/") {
        fileNameJoin = ""
      }
      
      if (!(fileNameJoin == pathQuery)) {
        continue;
      }
      // check end
      
      const fileUrl = (isFolder) ? getFolderUrl(folderPath) : getFileUrl(filePath)
      
      const fileDate = fileMetadata[0].timeCreated;
      

      fileList.push({ name, url: fileUrl, date: fileDate, size: (!isFolder) ? formatBytes(fileMetadata[0].size || 0) : "folder", type: (isFolder) ? "folder" : "file", path: (isFolder) ? folderPath: filePath });
    }
    
    console.log("Time took for loop: " + (new Date().getTime() - loopStartDate.getTime()) / 1000)

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



app.get("/list/folders", authenticateToken, async (req, res) => {
  let user = req.user
  let pathQuery = req.query.path || ""
  
  const userFolder = `${user.uid}/${pathQuery}`;
  console.log(userFolder)
    
  
  const [files] = await bucket.getFiles({prefix: userFolder, delimiter:(!pathQuery) ? null : '/'});
  let folderList = []
  
  let foldersOnly = files.filter((file) => file.name.endsWith('/'));
  
  for (const folder of foldersOnly) {
      
      const fileMetadata = await folder.getMetadata();
      
      const mainName = fileMetadata[0].name
      
      var splitUrl = fileMetadata[0].name.split("/")
      let folderNameSplit = folder.name.split("/")
      
      var name = splitUrl[splitUrl.length - 2] + "/"
      
      const fileUrl = getFolderUrl(path.join.apply(null, splitUrl.splice(1, splitUrl.length)))
     
      
      const fileDate = fileMetadata[0].timeCreated;
      

      folderList.push({ name, url: fileUrl, date: fileDate, size: "folder", type: "folder"})
  }
  
  res.json(folderList)
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

    const days = 21
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

app.get("/:path", (req,res) => {
  let paramPath = req.params.path
  
  console.log(paramPath)
  
  if (paramPath.endsWith("/")) {
    paramPath = paramPath.slice(0, -1);
  }
  
  const filePath = path.join(__dirname, 'public/' + paramPath)
  
  if (minifiedCache[filePath]) {
    console.log("found in cache")
    res.set('Content-Type', 'application/javascript');
    res.send(minifiedCache[filePath]);
  } else {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const minifiedContent = minify(fileContent).code;

      // Cache'e ekle
      minifiedCache[filePath] = minifiedContent;

      res.set('Content-Type', 'application/javascript');
      res.send(minifiedContent);
    } catch (error) {
      console.error('Error while minifying JavaScript:', error);
      res.status(500).send('Internal Server Error');
    }
  }
})

app.post("/qr", (req,res) => {
 console.log(req.body)
  
  res.send("1")
})

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
