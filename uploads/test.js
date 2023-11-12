/*window.addEventListener('load', function() {
  document.getElementById('start').addEventListener('click', function(){
    // Web Audio API'yi başlat
    var audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Ses dosyanızı yükleyin
    const audioElement = document.getElementById('audio');
    
    audioElement.crossOrigin = "anonymous";
    
    audioElement.src = "https://cdn.glitch.global/09cea16e-eb78-4d1a-81a4-6b24ad8afe1c/break-my-heart.mp3?v=1699817356279"
    
    audioElement.play();
    
    var audioSource = audioContext.createMediaElementSource(audioElement);
    console.log("1")

    // Ses düğümünü oluşturun
    var panner = audioContext.createPanner();
    panner.panningModel = "equalpower";
    panner.setPosition(0, 3, 20); // Sesin konumunu belirleyin (örnekte x: 1, y: 0, z: 0)
    console.log("2")

    // Ses düğümünü bağlayın
    audioSource.connect(panner);
    panner.connect(audioContext.destination);
    console.log("3")


    // Ses konumunu güncelleyin
    function updateSoundPosition(x, y, z) {
      panner.setPosition(x, y, z);
    }
    console.log("4")

    // Örnek olarak, ses konumunu her 5 saniyede bir güncelleyebilirsiniz
    setInterval(function() {
      console.log("Interval")
      // Yeni konum değerlerini belirleyin
      var newX = Math.random() * 2 - 1; // -1 ile 1 arasında rastgele bir x değeri
      var newY = Math.random() * 2 - 1; // -1 ile 1 arasında rastgele bir y değeri
      var newZ = Math.random() * 2 - 1; // -1 ile 1 arasında rastgele bir z değeri

      // Ses konumunu güncelleyin
      updateSoundPosition(newX, newY, newZ);
    }, 1000000); // Her 5 saniyede bir güncelle
  });
});*/

window.addEventListener('load', function() {
  document.getElementById('start').addEventListener('click', function(){
    var audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioElement = document.getElementById('audio');
    
    audioElement.crossOrigin = "anonymous";
    
    audioElement.src = "https://cdn.glitch.global/09cea16e-eb78-4d1a-81a4-6b24ad8afe1c/break-my-heart.mp3?v=1699817356279"
    
    audioElement.play();
    var audioSource = audioContext.createMediaElementSource(audioElement);
    var panner = audioContext.createPanner();

    audioSource.connect(panner);
    panner.connect(audioContext.destination);

    audioElement.play();

    // Başlangıçta kullanılacak olan açı
    var angle = 0;

    // Ses konumunu güncelleyen fonksiyon
function updateSoundPosition() {
  // Başınızın etrafında linear bir dönüş yapın
  var x = Math.cos(angle);
  var y = Math.sin(angle);
  var z = 30;  // Z ekseni için değeri istediğiniz gibi ayarlayabilirsiniz

  // Ses konumunu güncelle
  panner.setPosition(x, y, z);

  // Açıyı arttır (dönüş hızını ve yöndeğiştirmeyi ayarlamak için)
  angle += 0.09;  // Bu değeri istediğiniz gibi ayarlayabilirsiniz

  // Yeniden çağır
  setTimeout(updateSoundPosition, 10);
}

// İlk çağrıyı yap
updateSoundPosition();
  })
});

