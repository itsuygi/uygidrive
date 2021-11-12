/*
	p5.js websocket client
	makes a websocket client connection to a websocket server.
	Listens for messages from the server. 
*/

var socket = new WebSocket('wss://' + window.location.host);

function setup() {
	// The socket connection needs two event listeners:
	socket.onopen = openSocket;
	socket.onmessage = showData;

  console.log(window.location.host);
	// make a new div and position it at 10, 10:
	text = createDiv("Sensor reading:");
	text.position(10,10);
}

function openSocket() {
	text.html("Socket open");
	socket.send("Hello server");
}
/*
showData(), below, will get called whenever there is new data
from the server. So there's no need for a draw() function:
*/
function showData(result) {
	// when the server returns, show the result in the div:
	text.html("Sensor reading:" + result.data);
  console.log(result.data);
	xPos = int(result.data);        // convert result to an integer
	text.position(xPos, 10);        // position the text
}
