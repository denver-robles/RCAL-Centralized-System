// MAIN VIEW AND LOGIN VIEW
const mainView = document.getElementById("mainView");
const loginView = document.getElementById("loginView");

function showMainView() {
    mainView.classList.add("active");
    loginView.classList.remove("active");
}

function showLoginView() {
    mainView.classList.remove("active");
    loginView.classList.add("active");
}

// OPEN LOGIN PORTAL
document.getElementById("portalBtn").addEventListener("click", function() {
    showLoginView();
});

// BACK TO MAIN PAGE
document.getElementById("backToPageBtn").addEventListener("click", function() {
    showMainView();
});

// MOBILE MENU
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

menuToggle.addEventListener("click", function() {
    mainNav.classList.toggle("open");
});

// CLOSE MOBILE MENU WHEN CLICKING A LINK
const navLinks = document.querySelectorAll("nav a");

navLinks.forEach(function(link) {
    link.addEventListener("click", function() {
        mainNav.classList.remove("open");
    });
});

// INLINE LOGIN
const inlineLoginForm = document.getElementById("inlineLoginForm");

inlineLoginForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const username = document.getElementById("inlineUsername").value;
    const message = document.getElementById("inlineLoginMsg");

    if (username != "") {
        message.textContent = "Welcome, " + username + "! Login successful.";
        message.style.color = "green";
    }
});

// LOGIN PORTAL
const portalLoginForm = document.getElementById("portalLoginForm");

portalLoginForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const username = document.getElementById("loginUsername").value;
    const message = document.getElementById("portalLoginMsg");

    if (username != "") {
        message.textContent = "Welcome, " + username + "! Login successful.";
        message.style.color = "green";
    }
});
