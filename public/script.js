// change 'wss' to 'ws' for running without SSL):
let serverURL = "wss://" + window.location.host;

let socket;

let incomingSpan;
let outgoingText;
let connectWidget;
let connectionSpan;
let connectButton;
let connectUsernameButton;
let connectionStatus;
let musicStatusDiv;
let musicInfo;
let audio;
let volumeSlider;
let volumeValue;

function setup() {
  // get all the DOM elements that need listeners:
  incomingSpan = document.getElementById("incoming");
  outgoingText = document.getElementById("username");
  connectWidget = document.getElementById("connectWidget");
  connectionSpan = document.getElementById("connection");
  connectUsernameButton = document.getElementById("connectStreamIDButton");
  connectionStatus = document.getElementById("status");
  musicStatusDiv = document.getElementById("musicStatus");
  musicInfo = document.getElementById("musicInfo");
  audio = document.getElementById("audio");
  volumeSlider = document.getElementById("volumeSlider");
  volumeValue = document.getElementById("volumeValue");

  // set the listeners:
  connectUsernameButton.addEventListener("click", function () {
    sendMessage("subscribe", outgoingText.value);
  });

  volumeSlider.oninput = function () {
    handleVolume();
  };
  openSocket(serverURL);
  
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");
  const darkThemeLink = document.getElementById("dark-theme");

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");

    if (document.body.classList.contains("dark-theme")) {
      themeIcon.innerHTML = '<i class="fas fa-sun"></i>'; // Güneş sembolü
    } else {
      themeIcon.innerHTML = '<i class="fas fa-moon"></i>'; // Ay sembolü
    }
  });
}

function openSocket(url) {
  // open the socket:
  connectionSpan.innerHTML = "Connecting...";
  socket = new WebSocket(url);
  socket.addEventListener("open", openConnection);
  socket.addEventListener("close", closeConnection);
  socket.addEventListener("message", readIncomingMessage);
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
  connectionSpan.style.color = "green";
}

function closeConnection() {
  // display the change of state:
  connectionSpan.innerHTML = "Not server connection";
  connectionSpan.style.color = "red";

  connectionStatus.innerHTML = "Not connected to stream";
  connectionStatus.style.color = "red";
}

function readIncomingMessage(event) {
  // display the incoming message:
  incomingSpan.innerHTML = event.data;

  let dataJson = JSON.parse(event.data);
  console.log(dataJson);

  if (dataJson.type == "connection" && dataJson.message == "successfull") {
    connectionStatus.innerHTML = "Listening to stream";
    connectionStatus.style.color = "green";
    connectWidget.style.display = "none";
  } else if (dataJson.type == "play") {
    audio.src = dataJson.message;
    audio.load();
  } else if (dataJson.type == "stop") {
    audio.src = "";
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
  }
}

function sendMessage(type, message) {
  //if the socket's open, send a message:
  let sendJson = { type: type, message: message };

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(sendJson));
  }
}

function handleVolume() {
  let sliderValue = volumeSlider.value;
  volumeValue.innerHTML = sliderValue + "%";

  audio.volume = sliderValue / 100;
}

function ping() {
  sendMessage("keepAlive", "ping");
}
setInterval(ping, 30000);


window.addEventListener("load", setup);
