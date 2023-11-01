window.addEventListener("load", function(){
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");


  const isDarkMode = localStorage.getItem("darkMode") === "true";


  if (isDarkMode) {
    document.body.classList.add("dark-theme");
    themeIcon.innerHTML = '<i class="fas fa-sun"></i>'; 
  } else {
    document.body.classList.remove("dark-theme");
    themeIcon.innerHTML = '<i class="fas fa-moon"></i>'; 
  }

  themeToggle.addEventListener("click", () => {
    // Koyu mod sınıfını ekleyip kaldır
    document.body.classList.toggle("dark-theme");

    // Tema değiştikçe localStorage'a kaydet
    if (document.body.classList.contains("dark-theme")) {
      themeIcon.innerHTML = '<i class="fas fa-sun"></i>'; // Güneş sembolü
      localStorage.setItem("darkMode", "true");
    } else {
      themeIcon.innerHTML = '<i class="fas fa-moon"></i>'; // Ay sembolü
      localStorage.setItem("darkMode", "false");
    }
  });
});
