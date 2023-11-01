

const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const darkThemeLink = document.getElementById("dark-theme");

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");

  if (document.body.classList.contains("dark-theme")) {
    themeIcon.innerHTML = '<i class="fas fa-sun"></i>'; // Güneş sembolü
  } else {
    themeIcon.innerHTML = '<i class="fas fa-moon"></i>'; // Ay sembolü
  }
});

window.addEventListener("load", setup);
