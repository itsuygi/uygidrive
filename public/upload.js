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
        document.getElementById('status').textContent = 'Dosya başarıyla yüklendi';
      } else {
        document.getElementById('status').textContent = 'Dosya yükleme sırasında hata oluştu';
      }
    };

    xhr.send(formData);
  });
}

window.addEventListener('load', setup);