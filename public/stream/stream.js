
// change 'wss' to 'ws' for running without SSL):
let serverURL = 'wss://' + window.location.host;

let socket;

let incomingSpan;
let outgoingText;
let streamWidget;
let streamId
let connectionSpan;
let streamURLButton;
let connectionStatus;
let audio;

let topic = 0

function setup() {
  incomingSpan = document.getElementById('incoming');
  outgoingText = document.getElementById('url');
  streamWidget = document.getElementById('streamWidget')
  streamId = document.getElementById('streamId')
  connectionSpan = document.getElementById('connection');
  streamURLButton = document.getElementById('streamURLButton');
  connectionStatus = document.getElementById('status');
  audio = document.getElementById('audio');
  
  
  streamURLButton.addEventListener('click', function(){
    sendMessage("POST", "/sendMessageToTopic", {"topic": topic, "message": {"type": "play", "message": outgoingText.value}})
  });
  
  
  sendMessage("GET", "/getStreamId").then((value) => {
    console.log("Obtained stream id: ", value)
    streamId.innerText = value

    topic = value
  });
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




async function sendMessage(method, url, message) {
  //if the socket's open, send a message:
  let myPromise = new Promise(function(resolve) {
    let req = new XMLHttpRequest();
    req.
    req.open(method, url);
    req.onload = function() {
      if (req.status == 200) {
        resolve(req.response);
      } else {
        resolve("error");
      }
    };
    req.send(JSON.stringify(message));
  });
  
  return await myPromise;
}



window.addEventListener('load', setup);