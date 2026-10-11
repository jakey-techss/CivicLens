const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvenhzZHN0bmR5d25xYnl0emphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTA1MjgsImV4cCI6MjEwNTU2NjUyOH0.IjVL1OhAZlKNxqoHVZ9_BXVnCQU0uL3gsd7j57PeV0Y"
const SUPABASE_URL = "https://iozxsdstndywnqbytzja.supabase.co"
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
)

if(window.sessionStorage.getItem("loggedIn") == null && window.localStorage.getItem("remember") == null){
    signOut()
}
async function signOut(){
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error(error);
        return;
    }

}