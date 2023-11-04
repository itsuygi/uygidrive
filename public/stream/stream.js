
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

let topic

function setup() {
  outgoingText = document.getElementById('url');
  streamWidget = document.getElementById('streamWidget')
  streamId = document.getElementById('streamId')
  connectionSpan = document.getElementById('connection');
  streamURLButton = document.getElementById('streamURLButton');
  stopStreamButton = document.getElementById('stopStreamButton');
  audio = document.getElementById('audio');
  
  
  streamURLButton.addEventListener('click', function(){
    sendMessage("POST", "/sendMessageToTopic", {"topic": topic, "message": {"type": "play", "message": outgoingText.value}})
    handleAudio(outgoingText.value, true);
  });
  
  stopStreamButton.addEventListener('click', function(){
    sendMessage("POST", "/sendMessageToTopic", {"topic": topic, "message": {"type": "stop"}})
    handleAudio(outgoingText.value, false);
  });
  
  
  sendMessage("GET", "/getStreamId").then((value) => {
    console.log("Obtained stream id: ", value)
    streamId.innerText = value

    topic = value
    sendSocketMessage("subscribe", topic)
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
  } else if (dataJson.type == "play") {
    audio.src = dataJson.message;
    audio.load();
  } else if (dataJson.type == "stop") {
    audio.src = "";
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