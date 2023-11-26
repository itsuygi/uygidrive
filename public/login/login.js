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
  
  function sessionLogin(idToken) {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', '/sessionLogin', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      console.log(xhr.responseText)
    }
    xhr.send(JSON.stringify({ idToken: idToken }));
  }
  
  const messageElement = document.getElementById('message');
  // Log in with email and password
  const loginForm = document.getElementById('login');
  
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(user => {
        return user.getIdToken().then(idToken => {
          sessionLogin(idToken)
          window.location.replace("/");
        });
      })
      .catch(function(error) {
        console.log(error);
        if (error.code === 'auth/internal-error') {
          messageElement.innerHTML = 'Invalid password';
        } else {
          messageElement.innerHTML = 'An error occurred';
        }
      });
  });

  // Check if user is logged in
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      messageElement.innerHTML = 'Logged in';
      console.log('User is logged in');
    } else {
      // User is logged out
      messageElement.innerHTML = 'Not logged in';
      console.log('User is logged out');
    }
  });
};
