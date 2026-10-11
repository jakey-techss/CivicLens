
const root = document.documentElement;

function applyTheme(theme) {

    root.dataset.theme = theme;
    root.style.colorScheme = theme;
}
function ChangeTheme() {


    let savedTheme = "light";

    try {
        savedTheme = localStorage.getItem("civiclens-theme") || "light";
    } catch (error) {
        // Continue without persistence if storage is unavailable.
    }

    applyTheme(savedTheme === "dark" ? "dark" : "light");

}

if (localStorage.getItem("civiclens-theme") == null || localStorage.getItem("civiclens-theme") == "system") {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        applyTheme("dark")
    } else {
        applyTheme("light")
    }
} else {
    ChangeTheme()
}
