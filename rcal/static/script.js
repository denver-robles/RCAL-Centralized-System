// DIRECT PORTAL NAVIGATION
const portalBtn = document.getElementById("portalBtn");
if (portalBtn && portalBtn.tagName === "BUTTON") {
    portalBtn.addEventListener("click", function() {
        window.location.href = "/login";
    });
}

// MOBILE MENU WITH ANIMATED TOGGLE
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", function() {
        mainNav.classList.toggle("open");
        if (mainNav.classList.contains("open")) {
            menuToggle.textContent = "✕";
            menuToggle.setAttribute("aria-expanded", "true");
        } else {
            menuToggle.textContent = "☰";
            menuToggle.setAttribute("aria-expanded", "false");
        }
    });

    // CLOSE MOBILE MENU WHEN CLICKING A LINK
    const navLinks = mainNav.querySelectorAll("a");
    navLinks.forEach(function(link) {
        link.addEventListener("click", function() {
            mainNav.classList.remove("open");
            menuToggle.textContent = "☰";
            menuToggle.setAttribute("aria-expanded", "false");
        });
    });
}

// SCROLL-SPY ACTIVE NAVIGATION TRACKER
const spySections = document.querySelectorAll("main section[id]");
const spyNavLinks = document.querySelectorAll("#mainNav a[href^='#']");

function updateScrollSpy() {
    const scrollPosition = window.scrollY + 140;
    spySections.forEach(function(section) {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute("id");
        if (scrollPosition >= top && scrollPosition < top + height) {
            spyNavLinks.forEach(function(link) {
                if (link.getAttribute("href") === "#" + id) {
                    link.classList.add("active");
                } else {
                    link.classList.remove("active");
                }
            });
        }
    });
}

window.addEventListener("scroll", updateScrollSpy, { passive: true });
window.addEventListener("DOMContentLoaded", updateScrollSpy);

// FAQ ACCORDION TOGGLE WITH FLUID TRANSITION
function toggleFaq(index) {
    const item = document.getElementById("faqItem" + index);
    if (!item) return;
    const isOpen = item.classList.contains("open");
    item.classList.toggle("open");
    const toggleIcon = item.querySelector(".faq-toggle-icon");
    if (toggleIcon) {
        toggleIcon.textContent = isOpen ? "+" : "−";
    }
}

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

