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
    for (let i = 0; i < apiData.length; i++) {
        const accordionTemplate = document.createElement("div");
        accordionTemplate.className = "accordion-item";

        accordionTemplate.innerHTML = `
            <h2 class="accordion-header" id="heading${i}">
                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${i}" aria-expanded="true" aria-controls="collapse${i}">
                    ${apiData[i].endpoint} - GET
                </button>
            </h2>
            <div id="collapse${i}" class="accordion-collapse collapse" aria-labelledby="heading${i}" data-bs-parent="#apiEndpoints">
                <div class="accordion-body">
                    <p class="endpoint-description">${apiData[i].description}</p>
                    <p class="request-body">Request Body: ${apiData[i].body}</p>
                    <p class="response">Expected Response: ${apiData[i].response}</p>
                </div>
            </div>
        `;

        accordionContainer.appendChild(accordionTemplate);
    }
});
