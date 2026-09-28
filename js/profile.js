const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvenhzZHN0bmR5d25xYnl0emphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTA1MjgsImV4cCI6MjEwNTU2NjUyOH0.IjVL1OhAZlKNxqoHVZ9_BXVnCQU0uL3gsd7j57PeV0Y"
const SUPABASE_URL = "https://iozxsdstndywnqbytzja.supabase.co"
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
)

checkSession()
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.assign("login.html")
    }
}

const profileModal = document.getElementById("profileModal");
const editProfile = document.querySelector(".edit-profile");
const closeModal = document.getElementById("closeModal");
const profileForm = document.getElementById("profileForm");

editProfile.addEventListener("click", () => {
    profileModal.classList.add("active");
    document.body.style.overflow = "hidden";
});

closeModal.addEventListener("click", () => {
    profileModal.classList.remove("active");
    document.body.style.overflow = "";
});

profileModal.addEventListener("click", (e) => {

    if (e.target === profileModal) {
        profileModal.classList.remove("active");
        document.body.style.overflow = "";
    }

});

profileForm.addEventListener("submit", (e) => {

    e.preventDefault();

    const name =
        document.getElementById("displayName").value;

    const username =
        document.getElementById("username").value;

    const bio =
        document.getElementById("bio").value;

    console.log({
        name,
        username,
        bio
    });

    // We'll connect this to Supabase next.

    profileModal.classList.remove("active");
    document.body.style.overflow = "";

});
const themeSelect = document.getElementById("themeSelect");

themeSelect.addEventListener("change", () => {

    const theme = themeSelect.value;

    localStorage.setItem("civicLensTheme", theme);

    if (theme === "dark") {
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }

});
const signOutButton =
    document.getElementById("signOutButton");

signOutButton.addEventListener("click", async () => {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error(error);
        return;
    }

    window.location.href = "login.html";
});