// Wait for the page to load before trying to access the form elements
window.onload = function() {
  const firebaseConfig = {
    apiKey: "AIzaSyCILjXwpyNilznxbFTWC9J2Ys2JdJTX0vg",
    authDomain: "uygidrive.firebaseapp.com",
    projectId: "uygidrive",
    storageBucket: "uygidrive.appspot.com",
    messagingSenderId: "210147915736",
    appId: "1:210147915736:web:9e3548e815091d7512a4ad",
    measurementId: "G-GB12PYXWF7"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
  
  const messageElement = document.getElementById('message');
  // Log in with email and password
  const loginForm = document.getElementById('login');
  
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    firebase.auth().signInWithEmailAndPassword(email, password)
      .catch(function(error) {
        console.log(error)
        if (error.code === 'auth/internal-error') {
          messageElement.innerHTML = 'Invalid password';
        } else {
          messageElement.innerHTML = 'An error occurred';
        }
      }
      .then(user => {
        return user.getIdToken().then(idToken => {
          const xhr = new XMLHttpRequest();

          xhr.open('POST', '/sessionLogin', true);
          xhr.send({idToken: idToken})
        });
    })
             

  
  // Check if user is logged in
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      messageElement.innerHTML = 'Logged in';
      console.log('User is logged in');
      window.location.replace("/");
    } else {
      // User is logged out
      messageElement.innerHTML = 'Not logged in';
      console.log('User is logged out');
    }
  });
    