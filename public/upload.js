function setup() {
  document.getElementById('uploadForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const xhr = new XMLHttpRequest();
    
    xhr.open('POST', '/upload', true);

    xhr.upload.onprogress = function (e) {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        document.getElementById('status').textContent = 'Yükleniyor: ' + percentComplete + '%';
      }
    };

    xhr.onload = function () {
      if (xhr.status === 200) {
        var url = xhr.responseText
        document.getElementById('status').innerHTML = 'File uploaded. URL: <a href"' + url + '"> ' + url + "</a>";
      } else {
        document.getElementById('status').innerHTML = 'Error while uploading!';
      }
    };

    xhr.send(formData);
  });
}

window.addEventListener('load', setup);