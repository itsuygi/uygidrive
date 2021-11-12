/*
	p5.js websocket client
	makes a websocket client connection to a websocket server.
	Listens for messages from the server. 
*/

let socket = new WebSocket('wss://' + window.location.host);
let sensorData; 
let xPos = 10;

function setup() {
	// The socket connection needs two event listeners:
	socket.onopen = openSocket;
	socket.onmessage = showData;

	// make a new div and position it at 10, 10:
	text = createDiv("Sensor reading:");
	text.position(10,10);
}

function draw() {
  text.html(sensorData);
  text.position(xPos, 10);        // position the text
}

function openSocket() {
	sensorData = "Socket open";
}
/*
showData(), below, will get called whenever there is new data
from the server. So there's no need for a draw() function:
*/
function showData(result) {
	// when you 
  sensorData = result.data;
  let incoming = JSON.parse(sensorData);
	xPos = int(incoming.sensor);        // convert result to an integer
  

}
