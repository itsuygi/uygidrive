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
        fileURL.textContent = url;
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

        loadMusicList(); // Müzik listesini güncelle
      } else {
        status.textContent = 'Error while uploading!';
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
  
  function loadMusicList() {
    const listXhr = new XMLHttpRequest();
    listXhr.open('GET', '/upload/list', true);

    listXhr.onload = function () {
      if (listXhr.status === 200) {
        const list = JSON.parse(listXhr.responseText);
        musicList.innerHTML = '';

        list.forEach(url => {
          const musicItem = document.createElement('div');
          musicItem.classList.add('music-item');

          const musicName = document.createElement('span');
          musicName.textContent = url;
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
          
          music
          musicItem.appendChild(copyLinkButton);
          musicList.appendChild(musicItem);
        });
      } else {
         musicList.innerHTML = 'Error while loading!';
      }
    };

    listXhr.send();
  }

  loadMusicList();
}

window.addEventListener('load', setup);
