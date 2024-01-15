let currentPage = 1;
let sort = ""
let firstLoad = true

window.onload = function() {
  const uploadForm = document.getElementById('uploadForm');
  const uploadButton = document.getElementById('uploadButton');
  const fileInput = document.getElementById('fileInput');
  //const progressBar = document.getElementById('progressBar');
  //const progressDiv = document.getElementById('progressContainer');
  //const progressText = document.getElementById('progressText');
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
  
  function deleteFile(filename) {
    if(confirm('Are you sure to delete this file?')) {
        const xhr = new XMLHttpRequest();

        xhr.open('DELETE', '/file/' + filename, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function () {
          console.log(xhr.responseText)
          loadList()
        }
        xhr.send();
    }
  }
  
  function shareFile(filename) {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', '/getShareLink', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      console.log(xhr.responseText)
      
      openModal(xhr.responseText)
    }
    console.log(JSON.stringify({ file: filename }))
    xhr.send(JSON.stringify({ file: filename }));
  }
  
  function openModal(name) {
    
  }
  
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

        files.forEach(file => {
          let url
          if (file.url) {
            url = file.url
          }
          const fileItem = document.createElement('div');
          fileItem.classList.add('file-item');
          
          const fileName = document.createElement('a');
          
          fileName.textContent = file.name
          fileName.classList.add("file-title")
          fileName.href = "javascript:void(0);"
          
          fileName.addEventListener('click', function () {
            openModal(url)
          });
          
          fileItem.appendChild(fileName);
          
          const fileSize = document.createElement('small');
          fileSize.textContent = file.size
          fileSize.classList.add('file-size');
          
          fileItem.appendChild(fileSize);

          const downloadButton = document.createElement('button');
          downloadButton.textContent = 'Download';
          downloadButton.classList.add('copy-link-button');
          downloadButton.addEventListener('click', function () {
            document.getElementById('download_iframe').src = url; 
          });
          fileItem.appendChild(downloadButton);
          
          const deleteButton = document.createElement('button');
          deleteButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-trash" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M4 7l16 0" />
            <path d="M10 11l0 6" />
            <path d="M14 11l0 6" />
            <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
            <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
          </svg>
          `
          deleteButton.classList.add('delete-button');
          deleteButton.addEventListener('click', function () {
            deleteFile(file.name);
          });
          fileItem.appendChild(deleteButton);
          
          const shareButton = document.createElement('button');
          shareButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-share" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M6 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
            <path d="M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
            <path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
            <path d="M8.7 10.7l6.6 -3.4" />
            <path d="M8.7 13.3l6.6 3.4" />
          </svg>
          `
          shareButton.classList.add('share-button');
          shareButton.addEventListener('click', function () {
            shareFile(file.name)
          });
          fileItem.appendChild(shareButton);
          
          const line = document.createElement('div');
          line.classList.add('line');
          
          fileList.appendChild(fileItem);
          
          fileList.appendChild(line);
        });
        
        if (firstLoad == false) {
          document.documentElement.scrollTop = document.body.scrollTop = 420;
        }
        
        firstLoad = false
      } else {
         fileList.innerHTML = "Error: " + listXhr.responseText;
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