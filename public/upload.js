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
    let url = '/upload/list?page=' + currentPage
    
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

          const copyLinkButton = document.createElement('button');
          copyLinkButton.textContent = 'Copy URL';
          copyLinkButton.classList.add('copy-link-button');
          copyLinkButton.addEventListener('click', function () {
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            copyLinkButton.textContent = "Copied!"
          });
          musicItem.appendChild(copyLinkButton);
          
          
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
}


  
window.addEventListener('load', setup);