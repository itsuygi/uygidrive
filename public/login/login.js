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
  
  const messageElement = document.getElementById('message');
  // Log in with email and password
  const loginForm = document.getElementById('login');
  
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
      console.log(error)
      if (error.code === 'auth/internal-error') {
        messageElement.innerHTML = 'Invalid password';
      } else {
        messageElement.innerHTML = 'An error occurred';
      }
    });
  });

  // Sign up with email and password
  /*const signupForm = document.getElementById('signupForm');
  signupForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    firebase.auth().createUserWithEmailAndPassword(email, password).catch(function(error) {
      if (error.code === 'auth/weak-password') {
        messageElement.innerHTML = 'The password is too weak';
      } else if (error.code === 'auth/email-already-in-use') {
        messageElement.innerHTML = 'The email address is already in use';
      } else {
        messageElement.innerHTML = 'An error occurred';
      }
    });
  });*/

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
};

// Log out
function logout() {
  firebase.auth().signOut().then(function() {
    // Sign-out successful
  }).catch(function(error) {
    // An error happened
  });
}
