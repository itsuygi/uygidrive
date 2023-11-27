window.onload = function() {
  const messageElement = document.getElementById('message');
  // Log in with email and password
  const loginForm = document.getElementById('login');
  
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(({user}) => {
        return user.getIdToken().then(idToken => {
          request("/sessionLogin", idToken)
          //window.location.replace("/");
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
};
