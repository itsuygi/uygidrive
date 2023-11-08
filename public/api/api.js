const apiData = [
    {
        "endpoint": "/api/play",
        "description": "This endpoint plays music for sent stream id.",
        "body": "{'id': '1234', 'url': '/music/test_music.mp3'}",
        "response": "ok"
    },
    {
        "endpoint": "/api/pause",
        "description": "This endpoint pauses the music for the given stream id.",
        "body": "{'id': '1234'}",
        "response": "paused"
    },
    {
        "endpoint": "/api/stop",
        "description": "This endpoint stops the music for the given stream id.",
        "body": "{'id': '1234'}",
        "response": "stopped"
    }
];

document.addEventListener("DOMContentLoaded", function () {
    const accordionContainer = document.getElementById("apiEndpoints");

    // Klonlama işlemi
    for (let i = 0; i < apiData.length ; i++) {
        const accordionTemplate = document.createElement("div");
        accordionTemplate.className = "card";

        accordionTemplate.innerHTML = `
          <div class="card-header" id="endpoint${i}">
            <h2 class="mb-0">
              <button class="btn btn-link endpoint-title" type="button" data-toggle="collapse" data-target="#collapse${i}" aria-expanded="true" aria-controls="collapse${i}">
                ${apiData[i].endpoint} - GET
              </button>
            </h2>
          </div>

          <div id="collapse${i}" class="collapse show" aria-labelledby="endpoint${i}" data-parent="#apiEndpoints">
            <div class="card-body">
              <p class="endpoint-description">${apiData[i].description}</p>
              <div class="request-body">${apiData[i].body}</div>
              <div class="response">${apiData[i].response}</div>
            </div>
          </div>
        `;

      accordionContainer.appendChild(accordionTemplate);
    }
  
    const accordion = new bootstrap.Collapse(document.querySelectorAll('.accordion-button'));
});


