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

// INLINE LOGIN — submits to the real /login endpoint instead of faking a
// welcome message, so the form is handled by the server's auth logic.
const inlineLoginForm = document.getElementById("inlineLoginForm");

inlineLoginForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const username = document.getElementById("inlineUsername").value;
    const message = document.getElementById("inlineLoginMsg");

    if (username == "") {
        message.textContent = "Please enter your username or email.";
        message.style.color = "red";
        return;
    }

    inlineLoginForm.submit();
});

// LOGIN PORTAL — same endpoint, full page.
const portalLoginForm = document.getElementById("portalLoginForm");

portalLoginForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const username = document.getElementById("loginUsername").value;
    const message = document.getElementById("portalLoginMsg");

    if (username == "") {
        message.textContent = "Please enter your username or email.";
        message.style.color = "red";
        return;
    }

    portalLoginForm.submit();
});

// ==========================================================================
// INTERACTIVE STEPPER SIMULATOR
// ==========================================================================
const stepperSteps = [
    {
        title: "Request submitted",
        badge: "Submitted",
        desc: "You submit your request online through the Parishioner Portal with personal verification details."
    },
    {
        title: "Identity verified",
        badge: "Verified",
        desc: "Parish chancery staff validates your identification and confirms the holding parish church."
    },
    {
        title: "Certificate processing",
        badge: "In Progress",
        desc: "Clergy and archive clerks search canonical books, folio numbers, and annotate records."
    },
    {
        title: "Ready for release",
        badge: "Ready",
        desc: "Official certified copy is sealed with the archdiocesan dry seal and ready for pickup or dispatch."
    }
];

function selectStepperStep(index) {
    const items = document.querySelectorAll("#heroStepper .stepper-item");
    const badge = document.getElementById("stepperBadge");
    const desc = document.getElementById("stepperDesc");

    if (!items.length || !badge || !desc) return;

    items.forEach((item, i) => {
        const circle = item.querySelector(".step-circle");
        const label = item.querySelector(".step-label");

        if (i < index) {
            circle.className = "step-circle step-completed";
            circle.innerHTML = "&#10003;";
            if (label) label.style.color = "var(--color-slate-200)";
        } else if (i === index) {
            circle.className = "step-circle step-current";
            circle.innerHTML = (i + 1).toString();
            if (label) {
                label.style.color = "var(--color-amber-300)";
                label.style.fontWeight = "700";
            }
        } else {
            circle.className = "step-circle step-next";
            circle.innerHTML = (i + 1).toString();
            if (label) {
                label.style.color = "var(--color-slate-400)";
                label.style.fontWeight = "normal";
            }
        }
    });

    if (stepperSteps[index]) {
        badge.textContent = stepperSteps[index].badge;
        desc.textContent = stepperSteps[index].desc;
    }
}

// ==========================================================================
// INTERACTIVE SACRAMENTAL GUIDELINES ACCORDION
// ==========================================================================
function switchGuideline(tabKey) {
    const tabs = document.querySelectorAll(".guideline-tab-btn");
    const panels = document.querySelectorAll(".guideline-panel");

    tabs.forEach(tab => {
        if (tab.getAttribute("data-tab") === tabKey) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    });

    panels.forEach(panel => {
        if (panel.id === `guideline-${tabKey}`) {
            panel.classList.add("active");
        } else {
            panel.classList.remove("active");
        }
    });
}

