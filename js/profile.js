

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
document.getElementById("themeSelect").value = localStorage.getItem("civiclens-theme") == null ? "system" : localStorage.getItem("civiclens-theme")
document.getElementById("themeSelect").addEventListener("change",()=>{
    localStorage.setItem("civiclens-theme", document.getElementById("themeSelect").value.trim())
    window.location.reload()
})