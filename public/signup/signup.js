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

  // Sign up with email and password
  const signupForm = document.getElementById('signUp');
  signupForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = this.email.value;
    const password = this.password.value;
    firebase.auth().createUserWithEmailAndPassword(email, password).catch(function(error) {
      if (error.code === 'auth/weak-password') {
        messageElement.innerHTML = 'The password is too weak';
      } else if (error.code === 'auth/email-already-in-use') {
        messageElement.innerHTML = 'The email address is already in use';
      } else {
        messageElement.innerHTML = 'An error occurred';
      }
    }).then((value) => {
      window.location.replace("/login");
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

// Log out
function logout() {
  firebase.auth().signOut().then(function() {
    // Sign-out successful
  }).catch(function(error) {
    // An error happened
  });
}
