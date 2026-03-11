// --- SECURITY & LOGIN LOGIC ---
const SECRET_PIN = "2026"; // You can change this PIN to anything you want!

// Check if already logged in when the page loads
window.onload = function() {
  if (localStorage.getItem('fbeLoggedIn') === 'true') {
    unlockApp();
  }
};

function checkLogin() {
  const enteredPin = document.getElementById('pinInput').value;
  if (enteredPin === SECRET_PIN) {
    localStorage.setItem('fbeLoggedIn', 'true'); // Remember the user
    unlockApp();
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
}

function unlockApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContent').style.display = 'block';
  fetchAllData(); // Only fetch data AFTER they log in!
}

function logout() {
  localStorage.removeItem('fbeLoggedIn');
  location.reload(); // Refresh the page to show the login screen
}
