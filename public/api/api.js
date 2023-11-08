document.addEventListener("DOMContentLoaded", async function () {
    const response = await fetch("/api/list");
    const apiData = await response.json();
  
    const accordionContainer = document.getElementById("apiEndpoints");

    // Klonlama işlemi
    for (let i = 0; i < apiData.length ; i++) {
        const accordionTemplate = document.createElement("div");
        accordionTemplate.className = "card";

        accordionTemplate.innerHTML = `
          <div class="card-header" id="endpoint${i}">
            <h2 class="mb-0">
              <button class="btn btn-link endpoint-title" onclick="$('.collapse').collapse('hide'); $('#collapse${i}').collapse('toggle');" type="button" data-toggle="collapse" data-target="#collapse${i}" aria-expanded="true" aria-controls="collapse${i}">
                ${apiData[i].endpoint} - GET
              </button>
            </h2>
          </div>

          <div id="collapse${i}" class="collapse" aria-labelledby="endpoint${i}" data-parent="#apiEndpoints">
            <div class="card-header">
              Description
            </div>
            <div class="card-body">
              <p class="endpoint-description">${apiData[i].description}</p>
            </div>
            
            <div class="card-header">
              Request Body
            </div>
            <div class="card-body">
              <div class="request-body">${apiData[i].body}</div>
            </div>
            
            <div class="card-header">
              Response
            </div>
            <div class="card-body">
             <div class="response">${apiData[i].response}</div> 
            </div>
          </div>
        `;

      accordionContainer.appendChild(accordionTemplate);
    }

});


