let currentPage = 1;
let sort = ""

function setup() {
  const uploadForm = document.getElementById('uploadForm');
  const uploadButton = document.getElementById('uploadButton');
  const fileInput = document.getElementById('fileInput');
  const progressBar = document.getElementById('progressBar');
  const progressDiv = document.getElementById('progressContainer');
  const progressText = document.getElementById('progressText');
  const successBox = document.getElementById('successBox');
  const fileURL = document.getElementById('fileURL');
  const fileList = document.getElementById('fileList');
  const errorBox = document.getElementById('errorBox');
  const errorMessage = document.getElementById('errorMessage');
  const nextPage = document.getElementById('nextPage');
  const prePage = document.getElementById('previousPage');
  const pageNumber = document.getElementById('pageNumber');
  const searchForm = document.getElementById('search');
  const searchBox = document.getElementById('searchBox');
  const sortSelect = document.getElementById('sortSelect');
  
  const previews = document.getElementsByName('preview');
  var popup = document.getElementById('previewPopup');
  var close = document.getElementsByClassName("close")[0];
  
  function loaded(loadedElement) {
    loadedElement = loadedElement.target
    console.log(loadedElement.id + " has loaded")
    
    loadedElement.style.display = "flex"
  }
  
  for (var i = 0; i < previews.length; i++) {
    const loadedElement = previews[i]
    
    loadedElement.addEventListener('onload', loaded)
    loadedElement.addEventListener('canplaythrough', loaded)
    loadedElement.addEventListener('load', loaded)
  }
  
  

  function openPopup(url) {
    for (var i = 0; i < previews.length; i++) {
      previews[i].src = url;
    }
    
    popup.style.display = "block";
  }
  function closePopup() {
    for (var i = 0; i < previews.length; i++) {
      previews[i].style.display = "none";
      previews[i].src = "";
    }
    popup.style.display = "none";
  }
  
  window.onclick = function(event) {
    if (event.target == popup) {
        closePopup()
    }
  }
  close.onclick = function() {
      closePopup()
  }
  
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
    const formData = new FormData(this);
    const xhr = new XMLHttpRequest();

    xhr.open('POST', '/uploadFile', true);
    
    progressDiv.style.display = "block"
    uploadForm.style.display = "none"

    xhr.upload.onprogress = function (e) {
      if (e.lengthComputable) {
        const percentComplete = Math.floor((e.loaded / e.total) * 100);
        progressBar.value = percentComplete;
        progressText.textContent = percentComplete + '%';
      }
    };

    xhr.onload = function () {
      if (xhr.status === 200) {
        var url = xhr.responseText;
        progressDiv.style.display = 'none';
        successBox.style.display = 'block';
        fileURL.innerHTML = url;
        fileURL.href = url;

        loadList();
      } else {
        progressDiv.style.display = 'none';
        errorMessage.innerHTML = xhr.responseText;
        errorBox.style.display = "block";
      }
    };

    xhr.send(formData);
  });
  
  fileInput.addEventListener('change', function () {
    const selectedFileName = document.getElementById('selectedFileName');
    selectedFileName.textContent = this.files[0].name;
    this.style.display = 'none';
    
    uploadButton.style.display = 'block';
  });
  
  function deleteFile(filename) {
    const xhr = new XMLHttpRequest();

    xhr.open('DELETE', '/file/' + filename, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      console.log(xhr.responseText)
      loadList()
    }
    xhr.send();
  }
  
  searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    
    loadList()
  });
  
  loadList();
  
  function loadList() {
    fileList.innerHTML = 'Loading...';
    
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

        files.forEach(url => {
          if (url.url) {
            url = url.url
          }
          const fileItem = document.createElement('div');
          fileItem.classList.add('music-item');
          
          const fileName = document.createElement('span');
          var splitUrl = url.split("/")
          fileName.textContent = splitUrl[splitUrl.length - 1];
          
          fileName.addEventListener('click', function () {
            openPopup(url)
          });
          
          fileItem.appendChild(fileName);

          const downloadButton = document.createElement('button');
          downloadButton.textContent = 'Download';
          downloadButton.classList.add('copy-link-button');
          downloadButton.addEventListener('click', function () {
            document.getElementById('download_iframe').src = url; 
          });
          fileItem.appendChild(downloadButton);
          
          const deleteButton = document.createElement('button');
          deleteButton.textContent = '❌';
          deleteButton.classList.add('delete-button');
          deleteButton.addEventListener('click', function () {
            deleteFile(splitUrl[splitUrl.length - 1]);
          });
          fileItem.appendChild(deleteButton);
          
          const line = document.createElement('div');
          line.classList.add('line');
          
          fileList.appendChild(fileItem);
          
          fileList.appendChild(line);
        });
        document.documentElement.scrollTop = document.body.scrollTop = 420;
      } else {
         fileList.innerHTML = 'Error while loading!';
      }
    };
    
    listXhr.send()
  };
  
   sortSelect.addEventListener('change', function () {
     const selectedValue = sortSelect.value;
     
     sort = selectedValue
     currentPage = 1
     loadList()
   });
  
   nextPage.addEventListener('click', function () {
     currentPage++
     loadList()
     console.log("Loading next page")
   });
  
   prePage.addEventListener('click', function () {
     
     if (currentPage - 1 >= 1) {
       currentPage--
       loadList()
       console.log("Loading previous page")
     }
   });
  
  
}

function logout() {
  window.location.replace("/sessionLogout");
}



  
window.addEventListener('load', setup);