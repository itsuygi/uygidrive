document.addEventListener("DOMContentLoaded", async function () {
    const response = await fetch("/api/list");
    const apiData = await response.json();
  
    const accordionContainer = document.getElementById("apiEndpoints");
    accordionContainer.innerHTML = ""

    // Klonlama işlemi
    for (let i = 0; i < apiData.length ; i++) {
        const accordionTemplate = document.createElement("div");
        accordionTemplate.className = "card";

        accordionTemplate.innerHTML = `
          <div class="card-header" id="endpoint${i}">
            <h2 class="mb-0">
              <button class="btn btn-link endpoint-title" onclick="$('.collapse').collapse('hide'); $('#collapse${i}').collapse('toggle');" type="button" data-toggle="collapse" data-target="#collapse${i}" aria-expanded="true" aria-controls="collapse${i}">
                ${apiData[i].endpoint} - ${apiData[i].method}
              </button>
            </h2>
          </div>

          <div id="collapse${i}" class="collapse" aria-labelledby="endpoint${i}" data-parent="#apiEndpoints">
            <div class="card-header">
              Endpoint
            </div>
            <div class="card-body">
              <a href="https://${window.location.host}${apiData[i].endpoint}" style="color: purple" >https://${window.location.host}${apiData[i].endpoint}</a>
              <p style="color: blue" >Request Method: ${apiData[i].method}</p>

            </div>
            
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


