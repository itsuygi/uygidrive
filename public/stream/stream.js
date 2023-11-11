
// change 'wss' to 'ws' for running without SSL):
let serverURL = 'wss://' + window.location.host;

let socket;

let outgoingText;
let streamWidget;
let streamId
let connectionSpan;
let streamURLButton;
let stopStreamButton;
let audio;
let status;
let muteButton

let accessToken

let topic
let hasLoaded = false
let hasDownloaded = false

let isMuted = false

let maxRetries = 10

function setup() {
  outgoingText = document.getElementById('url');
  streamWidget = document.getElementById('streamWidget')
  streamId = document.getElementById('streamId')
  connectionSpan = document.getElementById('connection');
  streamURLButton = document.getElementById('streamURLButton');
  stopStreamButton = document.getElementById('stopStreamButton');
  audio = document.getElementById('audio');
  status = document.getElementById('status');
  muteButton = document.getElementById('muteButton');
  
  function waitFor(conditionFunction) {
    return new Promise(async (resolve, reject) => {
      let retries = 0;

      async function poll() {
        if (conditionFunction()) {
          resolve();
        } else {
          retries++;
          if (retries <= maxRetries) {
            console.log("[Music Load]: Checking if loaded. Tries: ", retries)
            
            await new Promise(resolve => setTimeout(resolve, 4500));
            poll();
          } else {
            reject(new Error("Exceeded maximum retries"));
          }
        }
      }

      poll();
    });
  }
  
  streamURLButton.addEventListener('click', async function(){
    handleStatus("Loading audio..", "")
    sendMessage("POST", "/playWithLoad", {"id": topic, "url": outgoingText.value})
    
    /*try {
      await waitFor(_ => hasDownloaded === true);
      
      sendMessage("POST", "/play", {"id": topic, "url": outgoingText.value});
      handleStatus("Started to play.", "");
    } catch (error) {
      console.error("Exceeded maximum retries.");
    }*/
    
  });
  
  stopStreamButton.addEventListener('click', function(){
    handleStatus("Music stopped.", "")
    sendMessage("POST", "/stop", {"id": topic})
  });
  
  sendMessage("GET", "/createStream").then((data) => {
    let id = data.id
    let token = data.accessToken
    console.log("Obtained stream id: ", id)
    streamId.innerText = id

    topic = id
    accessToken = token
    
    sendSocketMessage("subscribe", topic)
  });
  
  audio.addEventListener('canplaythrough', function() { 
    console.log("Audio loaded.")
    hasDownloaded = true
    
    sendSocketMessage("loaded", audio.src)
  }, false);
  
  audio.onended = function() {
    console.log("Audio ended")
    hasLoaded = false
  };

  muteButton.addEventListener('click', () => {
    isMuted = !isMuted
    
    if (isMuted) {
      muteButton.classList.add('muted');
      sendMessage("POST", "/mute", {"id": topic})
    } else {
      muteButton.classList.remove('muted');
      sendMessage("POST", "/unmute", {"id": topic})
    }
  });

  
  openSocket();
}

function openSocket() {
  socket = new WebSocket(serverURL);
  //socket.addEventListener("open", openConnection);
  //socket.addEventListener("close", closeConnection);
  socket.addEventListener("message", readIncomingMessage);
}

function readIncomingMessage(event) {
  let dataJson = JSON.parse(event.data);
  console.log(dataJson);

  if (dataJson.type == "connection" && dataJson.message == "successfull") {
    console.log("[Socket]: Connected to stream successfully.")
  } else if (dataJson.type == "load") {
    hasDownloaded = false
    audio.muted = true
    audio.src = dataJson.message
    
    hasLoaded = true
  } else if (dataJson.type == "play") {
    hasDownloaded = false
    audio.muted = false
    
    handleStatus("Music started.", "")
    
    if (hasLoaded == true) {
      audio.currentTime = 0
      console.log("Resetted time.")
      
      if (audio.paused) {
        try {
          audio.play()
          console.log("Started manually")
        } catch(error) {
          console.log("Error while manually play", error)
        }
      }
    } else {
      audio.src = dataJson.message;
    };
  } else if (dataJson.type == "stop") {
    audio.src = "";
    hasLoaded = false
    hasDownloaded = false
  } else if (dataJson.type == "mute") {
    if (dataJson.message == true) {
      fadeAudio(true)
    } else {
      audio.muted = true
    }
  } else if (dataJson.type == "unmute") {
    audio.muted = false
    if (dataJson.message == true) {
      fadeAudio(false)
    } else {
      audio.volume = 100
    }
  }
}

function sendSocketMessage(type, message) {
  let sendJson = { type: type, message: message };
  
  waitForSocketConnection(socket, function(){
      console.log("Waited for connection.");
      socket.send(JSON.stringify(sendJson));
  });
}

function waitForSocketConnection(socket, callback){
    setTimeout(
        function () {
            if (socket.readyState === 1) {
                console.log("Connection is made")
                if (callback != null){
                    callback();
                }
            } else {
                console.log("Waiting for connection...")
                waitForSocketConnection(socket, callback);
            }

        }, 2000); // wait 5 milisecond for the connection
}

function handleAudio(url, state){
  /*if (state == true) {
    audio.src = url
    audio.load();
  } else {
     audio.src = ""
  }*/
  
}

function handleStatus(message, display) {
  status.innerText = message;
  status.style.display = display
}

async function sendMessage(method, url, message) {
  const host = window.location.host
  let xmlUrl = "https://" + host + "/api" + url
  
  let messagePromise = new Promise(function(resolve) {
    let req = new XMLHttpRequest();
    req.open(method, xmlUrl);
    
    req.setRequestHeader("Content-Type", "application/json");
    req.setRequestHeader("Authorization", accessToken);
    
    req.onload = function() {
      if (req.status == 200) {
        let responseJson = JSON.parse(req.response)
        
        console.log("[Request Handler]: Request result: ", responseJson)
        resolve(responseJson);
      } else {
        resolve("error");
      }
    };
    req.send(JSON.stringify(message));
  });
  
  return await messagePromise;
}

function fadeAudio(mode) {
    var fadeAudio = setInterval(function () {
      if (mode == true) {
        try {
          audio.volume -= 0.07;
        } catch {
          audio.muted = true
          
          console.log("Fadeout complete.")
          clearInterval(fadeAudio)
        }
        
      } else {
        
        try {
          audio.volume += 0.07;
        } catch {
          console.log("Fade complete.")
          clearInterval(fadeAudio)
        }
      }
        
    }, 350);
}

function ping() {
  sendSocketMessage("keepAlive", "ping");
}
setInterval(ping, 30000);

window.addEventListener('load', setup);

window.onbeforeunload = function(){
  sendMessage("POST", "/stop", {"id": topic})
  handleAudio(outgoingText.value, false);
  
  return ""
}