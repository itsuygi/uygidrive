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
  const copyURLButton = document.getElementById('copyURLButton');
  const musicList = document.getElementById('musicList');
  const errorBox = document.getElementById('errorBox');
  const errorMessage = document.getElementById('errorMessage');
  const nextPage = document.getElementById('nextPage');
  const prePage = document.getElementById('previousPage');
  const pageNumber = document.getElementById('pageNumber');
  const searchForm = document.getElementById('search');
  const searchBox = document.getElementById('searchBox');
  const audio = document.getElementById('audio');
  const sortSelect = document.getElementById('sortSelect');

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

        copyURLButton.addEventListener('click', function () {
          const textArea = document.createElement('textarea');
          textArea.value = url;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          copyURLButton.textContent = 'URL Copied!';
        });

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
  
  searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    
    loadList()
  });
  
  loadList();
  
  function loadList() {
    musicList.innerHTML = 'Loading...';
    
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
        
        musicList.innerHTML = '';

        files.forEach(url => {
          if (url.url) {
            url = url.url
          }
          const musicItem = document.createElement('div');
          musicItem.classList.add('music-item');
          
          const musicName = document.createElement('span');
          var splitUrl = url.split("/")
          musicName.textContent = splitUrl[splitUrl.length - 1];
          musicItem.appendChild(musicName);

          const downloadButton = document.createElement('button');
          downloadButton.textContent = 'Download';
          downloadButton.classList.add('copy-link-button');
          downloadButton.addEventListener('click', function () {
            document.getElementById('download_iframe').src = url; 
          });
          musicItem.appendChild(downloadButton);
          
          
          const line = document.createElement('div');
          line.classList.add('line');
          
          musicList.appendChild(musicItem);
          
          musicList.appendChild(line);
        });
        document.documentElement.scrollTop = document.body.scrollTop = 420;
      } else {
         musicList.innerHTML = 'Error while loading!';
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
  
}

function logout() {
  firebase.auth().signOut().then(function() {
    // Sign-out successful
  }).catch(function(error) {
    // An error happened
  });
}


  
window.addEventListener('load', setup);