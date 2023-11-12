window.addEventListener('load', function() {
  // Web Audio API'yi başlat
  var audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Ses dosyanızı yükleyin
  const audioElement = document.getElementById('audio');
  audioElement.src = "https://songroom.glitch.me/music/cool-music.mp3"
  var audioSource = audioContext.createMediaElementSource(audioElement);

  // Ses düğümünü oluşturun
  var panner = audioContext.createPanner();
  panner.setPosition(1, 0, 0); // Sesin konumunu belirleyin (örnekte x: 1, y: 0, z: 0)

  // Ses düğümünü bağlayın
  audioSource.connect(panner);
  panner.connect(audioContext.destination);


  // Ses konumunu güncelleyin
  function updateSoundPosition(x, y, z) {
    panner.setPosition(x, y, z);
  }

  // Örnek olarak, ses konumunu her 5 saniyede bir güncelleyebilirsiniz
  setInterval(function() {
    // Yeni konum değerlerini belirleyin
    var newX = Math.random() * 2 - 1; // -1 ile 1 arasında rastgele bir x değeri
    var newY = Math.random() * 2 - 1; // -1 ile 1 arasında rastgele bir y değeri
    var newZ = Math.random() * 2 - 1; // -1 ile 1 arasında rastgele bir z değeri

    // Ses konumunu güncelleyin
    updateSoundPosition(newX, newY, newZ);
  }, 5000); // Her 5 saniyede bir güncelle
});