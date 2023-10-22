
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

function setup() {
  // get all the DOM elements that need listeners:
  incomingSpan = document.getElementById('incoming');
  outgoingText = document.getElementById('username');
  connectionSpan = document.getElementById('connection');
  connectButton = document.getElementById('connectButton');
  connectionStatus = document.getElementById('status');
  musicStatusDiv = document.getElementById('musicStatus');
  musicInfo = document.getElementById('musicInfo');
  
  // set the listeners:
  outgoingText.addEventListener('change', sendMessage);
  connectButton.addEventListener('click', changeConnection);
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
  
  if (event.data == "Connected") {
    status.innerText = "Connected to player"
  }
}

function sendMessage() {
  //if the socket's open, send a message:
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(outgoingText.value);
  }
}


window.addEventListener('load', setup);