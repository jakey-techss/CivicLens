const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvenhzZHN0bmR5d25xYnl0emphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTA1MjgsImV4cCI6MjEwNTU2NjUyOH0.IjVL1OhAZlKNxqoHVZ9_BXVnCQU0uL3gsd7j57PeV0Y"
const SUPABASE_URL = "https://iozxsdstndywnqbytzja.supabase.co"
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
)
const resetForm = document.getElementById("resetPasswordForm");
const passwordMessage = document.getElementById("passwordMessage");

resetForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const password =
        document.getElementById("newPassword").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;


    if (password !== confirmPassword) {

        passwordMessage.textContent =
            "Passwords don't match.";

        passwordMessage.className = "error";

        return;
    }

    const { error } = await supabaseClient.auth.updateUser({
        password: password
    });


    if (error) {

        passwordMessage.textContent =
            "We couldn't update your password. Please try again.";

        passwordMessage.className = "error";
        return;
    }


    passwordMessage.textContent =
        "Password updated! You can now log in. 🎉";

    passwordMessage.className = "success";
    let time = 10
     setTimeout(() => {
        passwordMessage.textContent = "Redirecting in " + time+"s";
        time--;
    }, 1000);
    setTimeout(() => {
        window.location.href = "login.html";
    }, 10000);

});