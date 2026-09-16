/* =========================================================
   CIVICLENS AUTH
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const tabs = document.querySelectorAll(".auth-tab");
const forms = document.querySelectorAll(".auth-form");

const switchButtons =
    document.querySelectorAll(".switch-button");

const loginForm =
    document.getElementById("loginForm");

const signupForm =
    document.getElementById("signupForm");

const loginMessage =
    document.getElementById("loginMessage");

const signupMessage =
    document.getElementById("signupMessage");

const forgotPassword =
    document.getElementById("forgotPassword");

const signupPassword =
    document.getElementById("signupPassword");

const strengthText =
    document.getElementById("strengthText");

const strengthBars =
    document.querySelectorAll(
        ".strength-bars span"
    );


/* =========================================================
   SWITCH LOGIN / SIGNUP
========================================================= */

function switchMode(mode) {

    tabs.forEach(tab => {

        tab.classList.toggle(
            "active",
            tab.dataset.mode === mode
        );

    });


    forms.forEach(form => {

        const isLogin =
            mode === "login";

        form.classList.toggle(
            "active",
            isLogin
                ? form.id === "loginForm"
                : form.id === "signupForm"
        );

    });


    clearMessages();

    window.history.replaceState(
        {},
        "",
        mode === "signup"
            ? "login.html?mode=signup"
            : "login.html?mode=login"
    );
}


tabs.forEach(tab => {

    tab.addEventListener("click", () => {

        switchMode(
            tab.dataset.mode
        );

    });

});


switchButtons.forEach(button => {

    button.addEventListener("click", () => {

        switchMode(
            button.dataset.switch
        );

    });

});


/* =========================================================
   INITIAL MODE FROM URL
========================================================= */

const params =
    new URLSearchParams(
        window.location.search
    );

if (params.get("mode") === "signup") {
    switchMode("signup");
}


/* =========================================================
   PASSWORD VISIBILITY
========================================================= */

document.querySelectorAll(
    ".password-toggle"
).forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const target =
                document.getElementById(
                    button.dataset.target
                );

            if (target.type === "password") {

                target.type = "text";

                button.textContent = "🙈";

                button.setAttribute(
                    "aria-label",
                    "Hide password"
                );

            } else {

                target.type = "password";

                button.textContent = "👁";

                button.setAttribute(
                    "aria-label",
                    "Show password"
                );

            }

        }
    );

});


/* =========================================================
   PASSWORD STRENGTH
========================================================= */

signupPassword.addEventListener(
    "input",
    () => {

        const password =
            signupPassword.value;

        let score = 0;

        if (password.length >= 8) {
            score++;
        }

        if (/[A-Z]/.test(password)) {
            score++;
        }

        if (/[0-9]/.test(password)) {
            score++;
        }

        if (/[^A-Za-z0-9]/.test(password)) {
            score++;
        }


        strengthBars.forEach(
            (bar, index) => {

                bar.style.background =
                    index < score
                        ? score <= 1
                            ? "#ff9db5"
                            : score === 2
                                ? "#ffd84d"
                                : "#72c96b"
                        : "#ddd9d0";

            }
        );


        if (!password) {

            strengthText.textContent =
                "Use 8+ characters";

        } else if (score === 1) {

            strengthText.textContent =
                "A little weak";

        } else if (score === 2) {

            strengthText.textContent =
                "Getting there";

        } else if (score === 3) {

            strengthText.textContent =
                "Pretty good";

        } else {

            strengthText.textContent =
                "Strong password";

        }

    }
);


/* =========================================================
   LOGIN
========================================================= */

loginForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        const email =
            document.getElementById(
                "loginEmail"
            ).value.trim();

        const password =
            document.getElementById(
                "loginPassword"
            ).value;


        if (!email || !password) {

            showMessage(
                loginMessage,
                "Please fill in your email and password.",
                "error"
            );

            return;
        }


        if (!isValidEmail(email)) {

            showMessage(
                loginMessage,
                "That email doesn't look quite right.",
                "error"
            );

            return;
        }


        /*
         * SUPABASE LOGIN WILL GO HERE
         *
         * Example:
         *
         * const { data, error } =
         *     await supabase.auth.signInWithPassword({
         *         email,
         *         password
         *     });
         */


        showMessage(
            loginMessage,
            "Demo login successful! Connect Supabase here.",
            "success"
        );

    }
);


/* =========================================================
   SIGN UP
========================================================= */

signupForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        const name =
            document.getElementById(
                "signupName"
            ).value.trim();

        const email =
            document.getElementById(
                "signupEmail"
            ).value.trim();

        const password =
            document.getElementById(
                "signupPassword"
            ).value;

        const agree =
            document.getElementById(
                "agreeTerms"
            ).checked;


        if (!name || !email || !password) {

            showMessage(
                signupMessage,
                "Please fill in all the fields.",
                "error"
            );

            return;
        }


        if (!isValidEmail(email)) {

            showMessage(
                signupMessage,
                "Please enter a valid email address.",
                "error"
            );

            return;
        }


        if (password.length < 8) {

            showMessage(
                signupMessage,
                "Your password needs at least 8 characters.",
                "error"
            );

            return;
        }


        if (!agree) {

            showMessage(
                signupMessage,
                "You'll need to agree to the terms to continue.",
                "error"
            );

            return;
        }


        /*
         * SUPABASE SIGNUP WILL GO HERE
         *
         * Example:
         *
         * const { data, error } =
         *     await supabase.auth.signUp({
         *         email,
         *         password,
         *         options: {
         *             data: {
         *                 display_name: name
         *             }
         *         }
         *     });
         */


        showMessage(
            signupMessage,
            "Account created! Connect Supabase here.",
            "success"
        );

    }
);


/* =========================================================
   FORGOT PASSWORD
========================================================= */

forgotPassword.addEventListener(
    "click",
    event => {

        event.preventDefault();

        const email =
            document.getElementById(
                "loginEmail"
            ).value.trim();


        if (!email) {

            showMessage(
                loginMessage,
                "Enter your email first and we'll send you a reset link.",
                "error"
            );

            return;
        }


        if (!isValidEmail(email)) {

            showMessage(
                loginMessage,
                "Please enter a valid email address.",
                "error"
            );

            return;
        }


        /*
         * SUPABASE PASSWORD RESET WILL GO HERE
         *
         * Example:
         *
         * await supabase.auth.resetPasswordForEmail(
         *     email
         * );
         */


        showMessage(
            loginMessage,
            "Demo reset request sent. Connect Supabase here.",
            "success"
        );

    }
);


/* =========================================================
   HELPERS
========================================================= */

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );

}


function showMessage(
    element,
    message,
    type
) {

    element.textContent = message;

    element.className =
        `form-message show ${type}`;

}


function clearMessages() {

    document.querySelectorAll(
        ".form-message"
    ).forEach(message => {

        message.textContent = "";

        message.className =
            "form-message";

    });

}