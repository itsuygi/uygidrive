let converterUrl

window.addEventListener('load', function() {
  const input = document.getElementById('songName')
  document.getElementById('start').addEventListener('click', function(){
    const converterXhr = new XMLHttpRequest();
    converterXhr.open('GET', 'https://nu.mnuu.nu/api/v1/init?p=y&23=1llum1n471&_=0.313131');

    converterXhr.onload = function () {
       const json = JSON.parse(converterXhr.responseText);
      console.log(json)
      converterUrl = json.convertURL
    }
  });
})
