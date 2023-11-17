// change 'wss' to 'ws' for running without SSL):
let serverURL = "wss://" + window.location.host;

let socket;

let incomingSpan;
let outgoingText;
let connectWidget;
let connectionSpan;
let connectButton;
let connectStreamIDButton;
let connectionStatus;
let musicStatusDiv;
let musicInfo;
let audio;
let volumeSlider;
let volumeValue;
let activeStreams;

let downloaded = {}
let hasLoaded = false
let hasDownloaded = false

let maxRetries = 10

function setup() {
  // get all the DOM elements that need listeners:
  incomingSpan = document.getElementById("incoming");
  outgoingText = document.getElementById("username");
  connectWidget = document.getElementById("connectWidget");
  connectionSpan = document.getElementById("connection");
  connectStreamIDButton = document.getElementById("connectStreamIDButton");
  connectionStatus = document.getElementById("status");
  musicStatusDiv = document.getElementById("musicStatus");
  musicInfo = document.getElementById("musicInfo");
  audio = document.getElementById("audio");
  volumeSlider = document.getElementById("volumeSlider");
  volumeValue = document.getElementById("volumeValue");
  activeStreams = document.getElementById('activeStreamsWidget');
  

  // set the listeners:
  connectStreamIDButton.addEventListener("click", function () {
    if(getConnectionState() == true) {
      sendMessage("subscribe", outgoingText.value);
    } else {
      $.notify("Lost connection to server! Reloading.", "error");
      
      setTimeout(function() {
        location.reload()
      }, 2000)
    }
  });

  volumeSlider.oninput = function () {
    handleVolume();
  };
  
  audio.addEventListener('canplaythrough', function() { 
    console.log("Audio loaded.")
    hasDownloaded = true
    
    setTimeout(function() {
      sendMessage("loaded", audio.src)
      console.log("Sent loaded message to server.")
    }, 1000)
    
     $.notify("Audio loaded", "success");
  });
  
  /*audio.onerror = function() {
     // audio playback failed - show a message saying why
     // to get the source of the audio element use $(this).src
    console.error("Audio load error, reloading.")
    audio.load()
  };*/
  
  audio.onended = function() {
    console.log("Audio ended")
    hasLoaded = false
    hasDownloaded = false
  };
  
  openSocket(serverURL);
  
  var url = new URL(window.location.href);
  var id = url.searchParams.get("id");
  
  if (id) {
    console.log("Found id in params, auto connecting:", id)
    outgoingText.value = id
    
    sendMessage("subscribe", id);
  }
  
  updateActiveStreams();
}

function openSocket(url) {
  // open the socket:
  connectionSpan.innerHTML = "Connecting...";
  socket = new WebSocket(url);
  socket.addEventListener("open", openConnection);
  socket.addEventListener("close", closeConnection);
  socket.addEventListener("message", readIncomingMessage);
}

function getConnectionState(event) {
  // open the connection if it's closed, or close it if open:
  
  if (socket.readyState === WebSocket.CLOSED) {
    return false;
  } else {
    return true;
  }
}

function openConnection() {
  // display the change of state:
  connectionSpan.innerHTML = "Connected to server";
  connectionSpan.style.color = "green";
}

function closeConnection() {
  // display the change of state:
  connectionSpan.innerHTML = "No server connection";
  connectionSpan.style.color = "red";

  connectionStatus.innerHTML = "Not connected to stream";
  connectionStatus.style.color = "red";
  
  socket.close()
}

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
            
            if (retries > 2) {
              audio.load()
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            poll();
          } else {
            reject(new Error("Exceeded maximum retries"));
          }
        }
      }

      poll();
    });
  }

async function readIncomingMessage(event) {
  // display the incoming message:
  incomingSpan.innerHTML = event.data;

  let dataJson = JSON.parse(event.data);
  console.log(dataJson);

  if (dataJson.type == "connection" && dataJson.message == "successfull") {
    connectionStatus.innerHTML = "Listening to stream: " + outgoingText.value;
    connectionStatus.style.color = "green";
    connectWidget.style.display = "none";
    activeStreams.style.display = "none";
  } else if (dataJson.type == "play") {
     $.notify("Playing audio", "success");
    if (hasLoaded == true) {
      audio.muted = false
      audio.currentTime = 0
      console.log("Resetted time")
      
       if (audio.paused) {
        try {
          audio.load()
          console.log("Started manually")
        } catch(error) {
          console.log("Error while manually play", error)
        }
      }
      
    } else {
      console.log("Playing without sync")
      audio.src = dataJson.message
      
      const maxRetries = 3; 
      try {
        await waitFor(_ => hasDownloaded === true, maxRetries);
      } catch (error) {
        console.error("Exceeded maximum retries.");
      }
    }
  } else if (dataJson.type == "stop") {
    audio.src = "";
    hasLoaded = false
    hasDownloaded = false
  } else if (dataJson.type == "load") {
    hasDownloaded = false
    audio.muted = true
    audio.src = dataJson.message;
    
    try {
      await waitFor(_ => hasDownloaded === true);
    } catch (error) {
      console.error("Exceeded maximum retries.");
    }
    hasLoaded = true
    console.log("Setted src while muted")
    
  } else if (dataJson.type == "resumePlay") {
    connectionStatus.innerHTML = "Connected to stream and synced";
    connectionStatus.style.color = "green";
    connectWidget.style.display = "none";

    var timestamp = new Date(dataJson.message.timestamp);
    var currentTime = Date.now();
    var timeBetween = Math.abs(currentTime - timestamp) / 1000;

    console.log(timestamp);
    console.log(currentTime);
    console.log(timeBetween);

    audio.src = dataJson.message.url;
    audio.load();
    audio.currentTime = timeBetween;
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
      handleVolume()
    }
  }
}

function sendMessage(type, message) {
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
                waitForSocketConnection(socket, callback);
            }

        }, 50); // wait 5 milisecond for the connection
}

function handleVolume() {
  let sliderValue = volumeSlider.value;
  volumeValue.innerHTML = sliderValue + "%";

  audio.volume = sliderValue / 100;
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

function updateActiveStreams() {
  console.log("Refreshing active streams.")
  
  const listXhr = new XMLHttpRequest();
  listXhr.open('GET', '/streamList');

  listXhr.onload = function () {
    if (listXhr.status === 200) {
      const streams = JSON.parse(listXhr.responseText);
      console.log(streams)
    
      const activeStreamsList = document.getElementById('activeStreamsList');
      
      activeStreamsList.innerHTML = '';

      streams.forEach(stream => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<b>Stream ${stream.streamId}</b> &nbsp; <a>${stream.listeners} listening</a> <button onclick="joinStream('${stream.streamId}')">Join</button>`;
        activeStreamsList.appendChild(listItem);

        const line = document.createElement('div');
        line.classList.add('line');
        activeStreamsList.appendChild(line);
      });
    } else {
      console.log("Error getting stream list:", listXhr.status)
    }
  }
  
  listXhr.send()
}

function joinStream(streamId) {
  outgoingText.value = streamId
  sendMessage("subscribe", streamId)
}

function ping() {
  sendMessage("keepAlive", "ping");
}
setInterval(ping, 30000);

window.addEventListener("load", setup);