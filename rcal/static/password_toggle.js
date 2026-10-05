// Reveal/hide toggle for password fields.
//
// Kept in its own file, loaded by the templates that use it, because the
// rest of script.js belongs to the public landing page only and the portal
// pages must not depend on it.
//
// Security note: this only changes the input's `type` attribute so the
// user can check what they typed. The value is never read, stored, logged,
// or sent anywhere — and the field stays the same input either way, so a
// password manager's icon still works.
//
// Deliberately a delegated listener: any button with
// data-password-for="<input id>" is wired up automatically, so a template
// opts in with an attribute instead of remembering to initialise.

(function () {
    "use strict";

    function initToggle(button) {
        if (button.dataset.passwordToggleReady === "true") {
            return;
        }

        var input = document.getElementById(button.dataset.passwordFor);
        if (!input) {
            return;
        }

        button.dataset.passwordToggleReady = "true";
        button.setAttribute("aria-pressed", "false");
        button.setAttribute("aria-controls", input.id);

        // The visible label is what a screen reader announces, so it has to
        // swap with the state; aria-pressed alone would leave it describing
        // only one of the two actions.
        function apply(visible) {
            button.setAttribute("aria-pressed", String(visible));
            button.textContent = visible ? "Hide" : "Show";
            // aria-label covers the button being read on its own, out of
            // context of the visible text.
            button.setAttribute(
                "aria-label",
                visible ? "Hide password" : "Show password"
            );
        }

        button.addEventListener("click", function () {
            var nowVisible = input.type === "password";
            input.type = nowVisible ? "text" : "password";
            apply(nowVisible);

            // Keep the caret where the user left it; changing `type`
            // otherwise drops it back to the end of the value.
            input.focus();
            try {
                var end = input.value.length;
                input.setSelectionRange(end, end);
            } catch (err) {
                // Some input types disallow selection APIs; harmless here.
            }
        });
    }

    function initAll(root) {
        var buttons = (root || document).querySelectorAll(
            "[data-password-for]"
        );
        Array.prototype.forEach.call(buttons, initToggle);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            initAll(document);
        });
    } else {
        initAll(document);
    }
})();