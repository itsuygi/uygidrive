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
    // Web Audio API'yi başlat
  var audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Ses dosyanızı yükleyin
  const audioElement = document.getElementById('audio');
    
  audioElement.crossOrigin = "anonymous";
  audioElement.src = "https://cdn.glitch.global/09cea16e-eb78-4d1a-81a4-6b24ad8afe1c/break-my-heart.mp3?v=1699817356279"
  var audioSource = audioContext.createMediaElementSource(audioElement);

  // Ses düğümünü oluşturun
  var panner = audioContext.createPanner();
  panner.setPosition(0, 0, 10); // Sesin konumunu belirleyin (örnekte x: 1, y: 0, z: 0)

  // Ses düğümünü bağlayın
  audioSource.connect(panner);
  panner.connect(audioContext.destination);

  // Ses dosyasını çalın
  audioElement.play();

  // Ses konumunu güncelleyin
  function updateSoundPosition(x, y, z) {
    panner.setPosition(x, y, z);
  }

  // Örnek olarak, ses konumunu her 5 saniyede bir güncelleyebilirsiniz
  setInterval(function() {
    // Yeni konum değerlerini belirleyin
    var newX = Math.random() * 10 - 10; // -1 ile 1 arasında rastgele bir x değeri
    var newY = Math.random() * 10 - 10; // -1 ile 1 arasında rastgele bir y değeri
    var newZ = 5; // -1 ile 1 arasında rastgele bir z değeri

    // Ses konumunu güncelleyin
    updateSoundPosition(newX, newY, newZ);
    console.log(newX,newY)
  }, 900); // Her 5 saniyede bir güncelle

});
})
