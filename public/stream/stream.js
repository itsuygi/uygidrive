
// change 'wss' to 'ws' for running without SSL):
let serverURL = 'wss://' + window.location.host;

let socket;

let incomingSpan;
let outgoingText;
let streamWidget
let connectionSpan;
let streamURLButton;
let connectionStatus;
let audio;

let topic = 0

function setup() {
  incomingSpan = document.getElementById('incoming');
  outgoingText = document.getElementById('url');
  streamWidget = document.getElementById('streamWidget')
  connectionSpan = document.getElementById('connection');
  streamURLButton = document.getElementById('connectStreamIDButton');
  connectionStatus = document.getElementById('status');
  audio = document.getElementById('audio');
  
  
  streamURLButton.addEventListener('click', function(){
    sendMessage("/sendMessageToTopic", {"topic": topic, "message": {"type": "play", "message": outgoingText.value}})
  });
  
  openSocket(serverURL);
}

function openSocket(url) {
  // open the socket:
  connectionSpan.innerHTML = "Connecting..."
  socket = new WebSocket(url);
  socket.addEventListener('open', openConnection);
  socket.addEventListener('close', closeConnection);
  socket.addEventListener('message', readIncomingMessage);
}


function changeConnection(event) {
  // open the connection if it's closed, or close it if open:
  if (socket.readyState === WebSocket.CLOSED) {
    openSocket(serverURL);
  } else {
    socket.close();
  }
}

function openConnection() {
  // display the change of state:
  connectionSpan.innerHTML = "Connected to server";
  connectionSpan.style.color = "green"
}

function closeConnection() {
  // display the change of state:
  connectionSpan.innerHTML = "Not server connection";
  connectionSpan.style.color = "red"
}


function readIncomingMessage(event) {
  // display the incoming message:
  incomingSpan.innerHTML = event.data;
  
  let dataJson = JSON.parse(event.data);
  console.log(dataJson);
  
  if (dataJson.type == "connection" && dataJson.message == "successfull") {
    connectionStatus.innerHTML = "Listening to stream"
    connectionStatus.style.color = "green"
    connectWidget.style.display = "none"
    
  } else if (dataJson.type == "play") {
    audio.src = dataJson.message
    audio.load();
  } else if (dataJson.type == "stop") {
    audio.src = ""
  } else if (dataJson.type == "resumePlay") {
    connectionStatus.innerHTML = "Connected to stream and synced"
    connectionStatus.style.color = "green"
    connectWidget.style.display = "none"
    
    var timestamp = new Date(dataJson.message.timestamp)
    var currentTime = Date.now()
    var timeBetween = Math.abs(currentTime - timestamp) / 1000;
    
    console.log(timestamp);
    console.log(currentTime);
    console.log(timeBetween);
    
    audio.src = dataJson.message.url
    audio.load();
    audio.currentTime = timeBetween
  }
}

function sendMessage(type, message) {
  //if the socket's open, send a message:
  let sendJson = {"type":type, "message":message}
  
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(sendJson));
  }
}


function ping() {
  sendMessage("keepAlive", "ping")
}

setInterval(ping, 30000);


window.addEventListener('load', setup);