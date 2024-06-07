let currentPage = 1;
let sort = "date:new-first"
let firstLoad = true

let path = "/"

let fileList 
let nextPage
let prePage
let searchBox
let pageNumber
let createFolderButton
let createFolderName

let pathDisplay

let confirmationModal
let confirmButton
  

window.onload = function() {
  const uploadForm = document.getElementById('uploadForm');
  const uploadButton = document.getElementById('uploadButton');
  const fileInput = document.getElementById('fileInput');
  //const progressBar = document.getElementById('progressBar');
  //const progressDiv = document.getElementById('progressContainer');
  //const progressText = document.getElementById('progressText');
  const successBox = document.getElementById('successBox');
  const fileURL = document.getElementById('fileURL');
  const errorBox = document.getElementById('errorBox');
  const errorMessage = document.getElementById('errorMessage'); 
  const searchForm = document.getElementById('search');
  const sortSelect = document.getElementById('sortSelect');
  const copyShareLink = document.getElementById("copyShareLink")
  
  fileList = document.getElementById('fileList');
  nextPage = document.getElementById('nextPage');
  prePage = document.getElementById('previousPage');
  searchBox = document.getElementById('searchBox');
  pageNumber = document.getElementById('pageNumber');
  pathDisplay = document.getElementById('pathDisplay');
  createFolderButton = document.getElementById('createFolderButton');
  createFolderName = document.getElementById("createFolderName")
  confirmationModal = document.getElementById("confirmationContainer")
  confirmButton = document.getElementById("confirmButton")
  
  let previewModal = document.getElementsByClassName("previewEmbed")
  let urlInput = document.getElementById("urlInput")
  
  const firebaseConfig = {
    apiKey: "AIzaSyCILjXwpyNilznxbFTWC9J2Ys2JdJTX0vg",
    authDomain: "uygidrive.firebaseapp.com",
    projectId: "uygidrive",
    storageBucket: "uygidrive.appspot.com",
    messagingSenderId: "210147915736",
    appId: "1:210147915736:web:9e3548e815091d7512a4ad",
    measurementId: "G-GB12PYXWF7"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  function request(url, idToken, refresh) {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      console.log(xhr.responseText)
    }
    xhr.send(JSON.stringify({ idToken: idToken }));
  }
  
  uploadForm.addEventListener('submit', function (e) {
    e.preventDefault();
    
    let files = fileInput.files
    
    let doneUploadingFiles = []

    for (let i = 0; i < files.length; i++) {
      let file = files[i]
      
      const formData = new FormData();
      formData.append("file", file)
      
      const xhr = new XMLHttpRequest();

      xhr.open('POST', '/upload?path=' + ((path == "/") ? "" : path), true);

      //progressDiv.style.display = "block"
      uploadForm.style.display = "none"
      
      
      // Upload progress container
      let progressContainer = document.createElement("div");
      progressContainer.classList.add('progress-container');
      
      let progressName = document.createElement("span");
      progressName.innerHTML = file.name
      progressName.classList.add('file-name');
      progressContainer.appendChild(progressName)
      
      let progressTag = document.createElement("progress");
      progressTag.value = 0
      progressTag.max = 100
      progressTag.classList.add('file-progress');
      progressContainer.appendChild(progressTag)
      
      let progressSpan = document.createElement("span");
      progressSpan.innerHTML = "0%"
      progressSpan.classList.add('progress-text');
      progressContainer.appendChild(progressSpan)
      
      document.getElementById("uploadContainer").appendChild(progressContainer)
      

      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
          const percentComplete = Math.floor((e.loaded / e.total) * 100);
          progressTag.value = percentComplete;
          progressSpan.textContent = percentComplete + '%';
        }
      };

      xhr.onload = function () {
        if (xhr.status === 200) {
          var url = xhr.responseText;
          
          doneUploadingFiles.push(url)
          progressContainer.remove();
          
          if (doneUploadingFiles.length == files.length) {
            let progressContainers = document.getElementsByClassName("progress-container")
            
            /*for (let containerI = 0; containerI < progressContainers.length; containerI++) {
              progressContainers[containerI].remove()
            }*/
            
            successBox.style.display = 'block';
            
            let urlList = document.getElementById("urlList")
            
            for (let urlsI = 0; urlsI < doneUploadingFiles.length; urlsI++) {
              let urlLi = document.createElement("li")
              
              let urlTag = document.createElement("a")
              urlTag.style = "color: CornflowerBlue"
              urlTag.target = "_blank"
              urlTag.href = doneUploadingFiles[urlsI]
              urlTag.innerText = doneUploadingFiles[urlsI]

              urlLi.appendChild(urlTag)
              urlList.appendChild(urlLi)
              
              //urlList.appendChild(document.createElement("br"))
            }
          }
          
          loadList()
          
          /*successBox.style.display = 'block';
          fileURL.innerHTML = url;
          fileURL.href = url;

          loadList();*/
        } else {
          //progressDiv.style.display = 'none';
          progressContainer.remove();
          errorMessage.innerHTML = xhr.responseText;
          errorBox.style.display = "block";
        }
      };

      xhr.send(formData);
    };
   
  });
  
  copyShareLink.onclick = function() {
    urlInput.select();
    document.execCommand("copy");
    
    copyShareLink.innerHTML = '<i class="fa-solid fa-check"></i>'
    
    setTimeout(function() {
      copyShareLink.innerHTML = "Copy Link"
    }, 2000)
  }
  
  searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    
    loadList()
  });
  
  
  
  loadList()
  
  
  
  /*sortSelect.addEventListener('change', function () {
     const selectedValue = sortSelect.value;
     
     sort = selectedValue
     currentPage = 1
     loadList()
   });*/
  
   nextPage.addEventListener('click', function () {
     currentPage++
     prePage.style.display = "inline"
     
     loadList()
     console.log("Loading next page")
   });
  
   prePage.addEventListener('click', function () {
     if (currentPage - 1 >= 1) {
       prePage.style.display = "inline"
       currentPage--
       loadList()
       console.log("Loading previous page")
     } else {
        prePage.style.display = "none"
     }
   });
  
  createFolderButton.addEventListener('click', function () {
     createFolder(createFolderName.value)
  });
  
  $('#folderModal').on('hidden.bs.modal', function (e) {
    createFolderName.value = ""
  })
  
  $('#uploadModal').on('hidden.bs.modal', function (e) {
    const successBox = document.getElementById('successBox');
    const errorBox = document.getElementById('errorBox');
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const urlList = document.getElementById('urlList');

    successBox.style.display = "none"
    errorBox.style.display = "none"
    uploadForm.style.display = "block"
    urlList.innerHTML = ""
  });
  
  $('#previewModal').on('hidden.bs.modal', function (e) {
    let previews = document.getElementsByClassName("preview")

    for (let i = 0; i < previews.length; i++) {
      let modal = previews[i]

      modal.src = "https://cdn.glitch.global/7fd03d08-8029-486c-9567-032d359a4c03/loading.gif?v=1705350315958"
      modal.style.display = "none"
    }
    console.log("File previews resetted.")
    //$("#previewModal").modal();
  })
}

function loadList() {
    fileList.innerHTML = `
      <div>
        <div class="spinner-border ms-auto" role="status" aria-hidden="true"></div>
        <br>
        <!--<h5>Loading...</h5>-->
      </div>
    `
    
    const search = searchBox.value
    
    const listXhr = new XMLHttpRequest();
    let url = '/list?page=' + currentPage
    
    console.log(search)
    if (search) {
      url = url + '&search=' + search
    }
    
    if (sort) {
      url = url + '&sort=' + sort
    }
  
    if (path && path != "/") {
      url = url + '&path=' + path
    }
    
    listXhr.open('GET', url, true);
    
    pageNumber.innerHTML = currentPage

    listXhr.onload = function () {
      if (listXhr.status === 200) {
        const {files, next} = JSON.parse(listXhr.responseText);
        
        if (next == false) {
          nextPage.style.display = "none"
        } else {
          nextPage.style.display = "inline"
        }
        
        fileList.innerHTML = '';

        files.forEach(file => {
          let url
          if (file.url) {
            url = file.url
          }
          
          let command = (file.type == "file") ? `openPreview('${file.url}')` : `openDirectory('${file.path}')`
          let actions = 
              (file.type == "file") 
            ?   
                `<a class="dropdown-item" onclick="downloadFile('${file.url}')">
                    <i class="fa-solid fa-download"></i>
                    Download
                  </a>

                  <a class="dropdown-item" onclick="shareFile('${file.path}')">
                    <i class="fa-solid fa-share"></i>
                    Share
                  </a>

                  <div class="dropdown-divider"></div>

                  <a class="dropdown-item" onclick="confirmDeletion('${file.path}')">
                    <i class="fa-solid fa-trash"></i>
                    Delete
                  </a>` 
            : `<a class="dropdown-item" onclick="confirmDeletion('${file.path}')">
                <i class="fa-solid fa-trash"></i>
                Delete
               </a>`
          
          let fileHTML = `
          <div class="file-card $light">
            ${(file.type == "file") ? '<i class="fa-solid fa-file"></i>' : '<i class="fa-regular fa-folder"></i>'}
          
            <div class="file-actions" >
              <li class="fas fa-ellipsis-v" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" ></li>
              <div class="dropdown-menu" >
                <!-- Dropdown menu links -->
                
                <!--<h6 class="dropdown-header">File actions</h6>-->
                
                ${actions}
                
              </div>
            </div>
            
            <div onclick="${command}">
              <h5 class="file-name">${file.name}</h5>
              <p>${file.size}</p>
            </div>
          </div>
        `
          fileList.insertAdjacentHTML( 'beforeend', fileHTML );
        });
        
        if (firstLoad == false) {
          //document.documentElement.scrollTop = document.body.scrollTop = 420;
        }
        
        firstLoad = false
      } else {
         fileList.innerHTML = "Error: " + listXhr.responseText;
      }
    };
    
    listXhr.send()
  };


function logout() {
  window.location.replace("/sessionLogout");
}

function resizeIFrameToFitContent( iFrame ) {
    iFrame.width  = iFrame.contentWindow.document.body.scrollWidth;
    iFrame.height = iFrame.contentWindow.document.body.scrollHeight;
}

function openPreview(fileUrl) {
  //let previews = document.getElementsByClassName("preview")
  
  const tag = getTagByFileExtension(fileUrl)
  console.log(tag)
  
  if (tag) {
    tag.style.display = "block"

    tag.src = fileUrl
    
    let urlSplit = fileUrl.split("/")
    
    document.getElementById("previewModalLabel").innerHTML = urlSplit[urlSplit.length - 1]

    $("#previewModal").modal();
  } else {
    confirmationModal.innerText = "This file type cannot be previewed. Would you like to download?"
    confirmButton.setAttribute( "onClick", `javascript: downloadFile('${fileUrl}'); $("#confirmationModal").modal('hide')` )
    $("#confirmationModal").modal();
  }
}

function openDirectory(requestedPath) {
  path = requestedPath;

  searchBox.value = "";
  currentPage = 1;

  pathDisplay.innerHTML = "";
  pathDisplay.innerHTML = `<a href="#" onclick="openDirectory('/')">Your Files</a>`;

  let pathSplit = requestedPath.split("/");

  console.log(pathSplit);

  let currentPath = "";
  
  /*if (requestedPath != "") {
    pathDisplay.insertAdjacentHTML('beforeend', " > ");
  }*/
  
  pathSplit.forEach((directory, index) => {
    if (directory != "") {
      currentPath += directory + "/";
      //let separator = index === 0 ? "" : " > ";
      let directoryHTML = `<i class="fa-solid fa-chevron-right" style="padding: 6px"></i> <a href="#" onclick="openDirectory('${currentPath}')">${directory}</a>`;

      pathDisplay.insertAdjacentHTML('beforeend', directoryHTML);
    } else {}
  });

  loadList();
}



function shareFile(filePath) {
  const label = document.getElementById("visibilityLabel")
  const publicUrlInput = document.getElementById("publicUrl")
  const publicUrlDiv = document.getElementById("publicLinkDiv")
  
  const xhr = new XMLHttpRequest();

  xhr.open('GET', '/file/visibility?file=' + filePath, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function () {
    console.log(xhr.responseText)
    let result = JSON.parse(xhr.responseText)
    
    if (result.public == "true") {
      label.textContext = "Public"
      publicUrlInput = result.url
      publicUrlDiv.style.display = "block"
    } else {
      label.textContext = "Select Access"
      publicUrlDiv.style.display = "none"
    }
    $("#shareModal").modal();
  }
  
  generatePrivateShareLink(filePath)
  xhr.send(JSON.stringify({ file: filePath }));

}

function generatePrivateShareLink(filePath){
  const xhr = new XMLHttpRequest();

  xhr.open('POST', '/getShareLink', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function () {
    let urlInput = document.getElementById("urlInput")
  
    urlInput.value = xhr.responseText
  }
  
  console.log(JSON.stringify({ file: filePath }))
  xhr.send(JSON.stringify({ file: filePath }));
}

function setVisibility(file, visibility)


function confirmDeletion(filePath) {
  confirmationModal.innerText = "Are you sure want to delete this file? This cannot be undone."
  confirmButton.setAttribute( "onClick", `javascript: deleteFile('${filePath}');` )
  $("#confirmationModal").modal();
}

function deleteFile(filePath) {
  //if(confirm('Are you sure to delete this file?')) {
    $("#confirmationModal").modal("hide")
      const xhr = new XMLHttpRequest();

      xhr.open('DELETE', '/file/' + filePath, true)
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function () {
        console.log(xhr.responseText)
        
        loadList()
      }
      xhr.send();
  //}
}

function createFolder(foldername) {
  const xhr = new XMLHttpRequest();

  xhr.open('PUT', '/folder?path=' + ((path == "/") ? "" : path), true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function () {
    console.log(xhr.responseText)
    $("#folderModal").modal("hide");
    
    createFolderButton.innerHTML = "Create folder"
    createFolderButton.disabled = false

    loadList()
  }

  createFolderButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
  <span class="sr-only">Loading...</span>`
  createFolderButton.disabled = true
  
  xhr.send(JSON.stringify({name: foldername}));
}

function changeSort(newSort) {
  sort = newSort
  
  loadList()
}

function downloadFile(url) {
  document.getElementById('download_iframe').src = url + "?download=true";
}

function getTagByFileExtension(fileUrl) {
  const extensionMapping = {
    'mp3': 'audioPreview',
    'wav': 'audioPreview',
    'ogg': 'audioPreview',
    'mp4': 'videoPreview',
    'mov': 'videoPreview',
    'webm': 'videoPreview',
    'png': 'filePreview',
    'jpg': 'filePreview',
    'jpeg': 'filePreview',
    'gif': 'filePreview',
    'pdf': 'filePreview',
    'doc': 'filePreview',
    'docx': 'filePreview',
    'py': 'filePreview',
    'c': 'filePreview',
    'json': 'filePreview',
    'js': 'filePreview',
    'css': 'filePreview',
    'html': 'filePreview',
    'txt': 'filePreview'
  };

  const fileExtension = fileUrl.split('.').pop();
  console.log(fileExtension)

  const tag = extensionMapping[fileExtension.toLowerCase()];
  console.log(tag)

  return document.getElementById(tag)
}

function closeModal(modalId) {
  $("#" + modalId).modal("hide");
}