
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

let topic
let hasLoaded = false
let hasDownloaded = false

function setup() {
  outgoingText = document.getElementById('url');
  streamWidget = document.getElementById('streamWidget')
  streamId = document.getElementById('streamId')
  connectionSpan = document.getElementById('connection');
  streamURLButton = document.getElementById('streamURLButton');
  stopStreamButton = document.getElementById('stopStreamButton');
  audio = document.getElementById('audio');
  status = document.getElementById('status');
  
  function waitFor(conditionFunction, maxRetries) {
    return new Promise(async (resolve, reject) => {
      let retries = 0;

      async function poll() {
        if (conditionFunction()) {
          resolve();
        } else {
          retries++;
          if (retries <= maxRetries) {
            console.log("[Music Load]: Trying to load. Tries: ", retries)
            audio.load()
            await new Promise(resolve => setTimeout(resolve, 4000));
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
    handleStatus("Waiting for every listener to sync...", "")
    sendMessage("POST", "/sendMessageToTopic", {"topic": topic, "message": {"type": "load", "message": outgoingText.value}})
    
    const maxRetries = 3; 
    try {
      await waitFor(_ => hasDownloaded === true, maxRetries);
      sendMessage("POST", "/sendMessageToTopic", {"topic": topic, "message": {"type": "play", "message": outgoingText.value}});
      handleStatus("Started to play.", "");
    } catch (error) {
      console.error("Exceeded maximum retries.");
    }
    
  });
  
  stopStreamButton.addEventListener('click', function(){
    handleStatus("Music stopped.", "")
    sendMessage("POST", "/sendMessageToTopic", {"topic": topic, "message": {"type": "stop"}})
  });
  
  
  sendMessage("GET", "/getStreamId").then((value) => {
    console.log("Obtained stream id: ", value)
    streamId.innerText = value

    topic = value
    sendSocketMessage("subscribe", topic)
  });
  
  audio.addEventListener('canplaythrough', function() { 
    console.log("Audio loaded.")
    hasDownloaded = true
  }, false);
  
  audio.onended = function() {
    console.log("Audio ended")
    hasLoaded = false
  };
  
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
    let encodedURI = encodeURI(dataJson.message)
    
    audio.muted = false
    
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

        }, 5); // wait 5 milisecond for the connection
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
  //if the socket's open, send a message:
  let messagePromise = new Promise(function(resolve) {
    let req = new XMLHttpRequest();
    req.open(method, url);
    req.setRequestHeader("Content-Type", "application/json");
    req.onload = function() {
      if (req.status == 200) {
        resolve(req.response);
      } else {
        resolve("error");
      }
    };
    req.send(JSON.stringify(message));
  });
  
  return await messagePromise;
}

function ping() {
  sendSocketMessage("keepAlive", "ping");
}
setInterval(ping, 30000);

window.addEventListener('load', setup);

window.onbeforeunload = function(){
  sendMessage("POST", "/sendMessageToTopic", {"topic": topic, "message": {"type": "stop"}})
  handleAudio(outgoingText.value, false);
  
  return ""
}