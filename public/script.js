
// change 'wss' to 'ws' for running without SSL):
let serverURL = 'wss://' + window.location.host;

let socket;

let incomingSpan;
let outgoingText;
let connectionSpan;
let connectButton;
let connectionStatus;
let musicStatusDiv;
let musicInfo;
let audio;
let volumeSlider;
let volumeValue;

function setup() {
  // get all the DOM elements that need listeners:
  incomingSpan = document.getElementById('incoming');
  outgoingText = document.getElementById('username');
  connectionSpan = document.getElementById('connection');
  connectButton = document.getElementById('connectButton');
  connectionStatus = document.getElementById('status');
  musicStatusDiv = document.getElementById('musicStatus');
  musicInfo = document.getElementById('musicInfo');
  audio = document.getElementById('audio');
  volumeSlider = document.getElementById('volumeSlider');
  volumeValue = document.getElementById('volumeValue');
  
  // set the listeners:
  outgoingText.addEventListener('change', function(){
    sendMessage("subscribe", outgoingText.value)
  });
  connectButton.addEventListener('click', changeConnection);
  
  volumeSlider.oninput = function() {
    handleVolume()
  };
  openSocket(serverURL);
}

function openSocket(url) {
  // open the socket:
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
  connectionSpan.innerHTML = "true";
  connectButton.value = "Disconnect";
  
}

function closeConnection() {
  // display the change of state:
  connectionSpan.innerHTML = "false";
  connectButton.value = "Connect";
}

function readIncomingMessage(event) {
  // display the incoming message:
  incomingSpan.innerHTML = event.data;
  
  let dataJson = JSON.parse(event.data);
  console.log(dataJson);
  
  if (dataJson.type == "connection" && dataJson.message == "successfull") {
    connectionStatus.innerText = "Connected to player"
  } else if (dataJson.type == "play") {
    audio.src = dataJson.message
    audio.load();
  } else if (dataJson.type == "stop") {
    audio.src = ""
  }
}

function sendMessage(type, message) {
  //if the socket's open, send a message:
  let sendJson = {"type":type, "message":message}
  
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(sendJson));
  }
}

function handleVolume() {
  let sliderValue = volumeSlider.value
  volumeValue.innerHTML = sliderValue + "%"
  
  audio.volume = sliderValue / 100
}


window.addEventListener('load', setup);