const US_STATES = {
    Alabama: "AL",
    Alaska: "AK",
    Arizona: "AZ",
    Arkansas: "AR",
    California: "CA",
    Colorado: "CO",
    Connecticut: "CT",
    Delaware: "DE",
    Florida: "FL",
    Georgia: "GA",
    Hawaii: "HI",
    Idaho: "ID",
    Illinois: "IL",
    Indiana: "IN",
    Iowa: "IA",
    Kansas: "KS",
    Kentucky: "KY",
    Louisiana: "LA",
    Maine: "ME",
    Maryland: "MD",
    Massachusetts: "MA",
    Michigan: "MI",
    Minnesota: "MN",
    Mississippi: "MS",
    Missouri: "MO",
    Montana: "MT",
    Nebraska: "NE",
    Nevada: "NV",
    "New Hampshire": "NH",
    "New Jersey": "NJ",
    "New Mexico": "NM",
    "New York": "NY",
    "North Carolina": "NC",
    "North Dakota": "ND",
    Ohio: "OH",
    Oklahoma: "OK",
    Oregon: "OR",
    Pennsylvania: "PA",
    "Rhode Island": "RI",
    "South Carolina": "SC",
    "South Dakota": "SD",
    Tennessee: "TN",
    Texas: "TX",
    Utah: "UT",
    Vermont: "VT",
    Virginia: "VA",
    Washington: "WA",
    "West Virginia": "WV",
    Wisconsin: "WI",
    Wyoming: "WY",
};

checkSession();
async function checkSession() {
    const {
        data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.assign("index.html");
    }
}

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => [...document.querySelectorAll(selector)];

const esc = (value) =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

let selectedType = "scratch";
let selectedDifficulty = "freeplay";
let selectedCommunity = null;
let selectedCollaborators = [];
let currentStep = 1;

let activeFriend = null;

let worlds = [];

let sharedWorlds = JSON.parse(localStorage.getItem("civiclens_shared_v3")) || [
    {
        id: crypto.randomUUID(),
        name: "Newark 2040",
        location: "Newark, NJ",
        owner: "Maya Johnson",
        description: "A collaborative future-city experiment.",
        mode: "scratch",
        difficulty: "medium",
        problems: 6,
        analyses: 9,
        progress: 31,
    },
];

let friends = [];

let messages = JSON.parse(localStorage.getItem("civiclens_messages_v3")) || {
    f1: [
        {
            me: false,
            text: "Want to collaborate on Newark 2040?",
        },
        {
            me: true,
            text: "Absolutely. I'll join.",
        },
    ],
    f2: [
        {
            me: false,
            text: "Did you see the new community map?",
        },
    ],
    f3: [],
    f4: [],
};

let notifications = [];

//Send All Information To Backend
let universal_userInfo;
async function save() {
    const {
        data: { user },
        error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
        window.location.assign("login.html");
        return;
    }

    const { error } = await supabaseClient
        .from("users")
        .update({
            friend_ids: friends,
            world_ids: worlds,
            notification: notifications,
        })
        .eq("id", user.id);

    if (error) {
        console.error("Update failed:", error.message);
    } else {
        console.log("Cell updated successfully!");
    }
}

function modeLabel(mode) {
    return mode === "improve"
        ? "Improve Existing Community"
        : "Start From Scratch";
}

function diffLabel(difficulty) {
    return (
        {
            freeplay: "Free-play",
            medium: "Medium",
            reallife: "Real Life",
            hell: "Hell Mode",
        }[difficulty] || difficulty
    );
}

let fullUserInfo;

async function initUser() {
    if (!supabaseClient) {
        return;
    }

    const {
        data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "login.html";

        return;
    }

    const metadata = session.user.user_metadata || {};

    universal_userInfo = session.user;

    const name =
        metadata.display_name || session.user.email?.split("@")[0] || "Explorer";

    setUser(name);

    const { data: usersInfo, error } = await supabaseClient
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();
    if (error) {
        console.error("Error fetching user:", error.message);
    } else {
        console.log("User information:", usersInfo);
    }
    notifications = usersInfo.notification;
    friends = usersInfo.friend_ids;
    worlds = usersInfo.world_ids;
    renderFriends();
    renderNotifications();
    renderWorlds();
}

let universal_username;
function setUser(name) {
    universal_username = name;
    const letter = name[0]?.toUpperCase() || "?";

    $$(".profile-name, .top-profile-name").forEach((element) => {
        element.textContent = name;
    });

    $$(".profile-avatar, .top-avatar").forEach((element) => {
        element.textContent = letter;
    });
}

function mapPreview(index) {
    const types = ["city", "coast", "mountain", "wilderness", "desert", "chaos"];

    const type = types[index % types.length];

    return `
        <div class="world-map map-${type}">

            <div class="map-block block-1"></div>
            <div class="map-block block-2"></div>
            <div class="map-block block-3"></div>

            <div class="map-park"></div>

            <div class="map-pin pin-a">
                <span>!</span>
            </div>

            <div class="map-pin pin-b">
                <span>?</span>
            </div>

            <div class="map-pin pin-c">
                <span>+</span>
            </div>

        </div>
    `;
}
async function getLocationById(locid) {
    if (!locid) {
        console.error("Missing location ID:", locid);
        return null;
    }

    const { data: location, error } = await supabaseClient
        .from("locations")
        .select("*")
        .eq("id", locid)
        .maybeSingle();

    if (error) {
        console.error("Error fetching location:", error.message);
        return null;
    }

    return location;
}
async function getCreatorById(userId) {
    if (!userId) {
        console.error("Missing creator user ID");
        return null;
    }

    const { data, error } = await supabaseClient.rpc("get_display_name", {
        p_user_id: userId,
    });

    if (error) {
        console.error("Error fetching creator name:", error.message);
        return null;
    }

    return data;
}

async function loadWorldLocations(worlds) {
    const cards = document.querySelectorAll(".world-card");
    cards.forEach(async (card) => {
        let world = worlds.find((item) => {
            return item.id == card.dataset.world;
        });
        if (world) {
            const location = await getLocationById(world.location_id);
            const creatorName = await getCreatorById(world.creator_id);
            const locationElement = card.querySelector(".world-location-name");
            const creatorElement = card.querySelector(".shared-owner");
            if (creatorElement) {
                creatorElement.textContent = creatorName;
            }

            locationElement.textContent = location
                ? location.title + ", " + US_STATES[location.state]
                : "Location unavailable";
        }
    });
}

function worldCard(world, index, shared = false) {
    return `
        <article
            class="world-card"
            data-world="${esc(world.id)}"
        >

            ${mapPreview(index)}

            <div class="world-content">

                <div class="world-top">

                    <div>

                        <h3 class="world-title">
                            ${esc(world.world_name)}
                        </h3>

                        <div class="world-location">

                            <span
                                class="location-dot"
                            ></span>

                            <span class="world-location-name">Loading location...</span>

                        </div>

                    </div>


                    ${!shared
            ? `
                                <span class="shared-owner">
                                    BY ${esc(world.creator_id)}
                                </span>
                            `
            : `
                                <button
                                    class="more-button"
                                    data-delete="${esc(world.id)}"
                                    aria-label="Delete world"
                                >
                                    
<svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
>
    <path d="M3 6h18"/>
    <path d="M8 6V4h8v2"/>
    <path d="m19 6-1 14H6L5 6"/>
    <path d="M10 10v6M14 10v6"/>
</svg>

                                </button>
                            `
        }

                </div>


                <p class="world-description">



                </p>


                <div class="world-tags">

                    <span class="world-tag">
                        ${modeLabel(world.mode)}
                    </span>

                    <span class="world-tag">
                        ${diffLabel(world.game_mode)}
                    </span>

                    <span class="world-tag">
                        ${Number(world.problems || 0)} problems
                    </span>

                </div>


                <div class="world-footer">

                    <span class="world-last">

                        ${!shared ? "Shared with you" : "Continue exploring"}

                    </span>

                    <button
                        class="world-open"
                        aria-label="Open world"
                    >
                        →
                    </button>

                </div>

            </div>

        </article>
    `;
}

async function renderWorlds() {
    const grid = $("#worldGrid");

    const empty = $("#emptyState");

    if (!grid) return;
    grid.innerHTML = worlds.map(worldCard).join("");
    await loadWorldLocations(worlds);

    if (empty) {
        empty.style.display = worlds.length ? "none" : "block";
    }

    grid.style.display = worlds.length ? "grid" : "none";

    $$("#worldGrid .world-card").forEach((card) => {
        card.onclick = (event) => {
            if (event.target.closest("[data-delete]")) {
                return;
            }

            const world = worlds.find((item) => item.id === card.dataset.world);

            if (!world) return;

            showToast(`Opening ${world.world_name}`, "→");
        };
    });

    $$("[data-delete]").forEach((button) => {
        button.onclick = (event) => {
            event.stopPropagation();

            worlds = worlds.filter((world) => world.id !== button.dataset.delete);

            save();

            showToast("World deleted", "×");
            renderWorlds();
        };
    });
}

async function renderShared() {
    const grid = $("#sharedGrid");

    if (!grid) return;

    grid.innerHTML = sharedWorlds
        .map((world, index) => worldCard(world, index, true))
        .join("");
    //await loadWorldLocations(sharedWorlds)
}

function renderFriends() {
    const grid = $("#friendsGrid");

    if (!grid) return;

    const online = friends.filter((friend) => friend.status === "Online").length;

    const onlineCounter = $("#friendsOnlineCount");

    if (onlineCounter) {
        onlineCounter.textContent = `${online} online`;
    }

    grid.innerHTML = friends
        .map(
            (friend) => `

                    <div
                        class="friend-card"
                        data-friend="${esc(friend.id)}"
                    >

                        <span class="profile-avatar">

                            ${esc(friend.display_name[0])}

                        </span>


                        <div class="friend-info">

                            <strong>
                                ${esc(friend.display_name)}
                            </strong>

                            <span>
                                @${esc(friend.display_name)}
                            </span>

                        </div>


                        <span
                            class="
                                friend-status
                                ${friend.status === "online"
                    ? "online"
                    : friend.status.toLowerCase() == "requested"
                        ? "Requested"
                        : ""
                }
                            "
                        >
                            ${friend.status}
                        </span>

                    </div>
                `,
        )
        .join("");
    $$(".friend-card").forEach((card) => {
        if (
            friends.find((friend) => {
                return friend.id == card.dataset.friend;
            }).status != "Requested"
        ) {
            card.onclick = () => {
                openChat(card.dataset.friend);

                activateSection("chatSection");
            };
        }
    });

    renderChatFriends();
}

function renderChatFriends() {
    const container = $("#chatFriends");

    if (!container) return;

    container.innerHTML = friends
        .map(
            (friend) => `

                    <div
                        class="
                            chat-friend
                            ${activeFriend?.id === friend.id ? "active" : ""}
                        "
                        data-friend="${esc(friend.id)}"
                    >

                        <span class="profile-avatar">

                            ${esc(friend.display_name[0])}

                        </span>


                        <div>

                            <strong>
                                ${esc(friend.display_name)}
                            </strong>

                            <small>
                                @${esc(friend.display_name)}
                            </small>

                        </div>

                    </div>
                `,
        )
        .join("");

    $$(".chat-friend").forEach((element) => {
        element.onclick = () => openChat(element.dataset.friend);
    });
}

function updateStats() {
    const problems = worlds.reduce(
        (total, world) => total + Number(world.problems || 0),
        0,
    );

    const analyses = worlds.reduce(
        (total, world) => total + Number(world.analyses || 0),
        0,
    );

    if ($("#worldCount")) $("#worldCount").textContent = worlds.length;

    if ($("#problemCount")) $("#problemCount").textContent = problems;

    if ($("#analysisCount")) $("#analysisCount").textContent = analyses;

    if ($("#friendCount")) $("#friendCount").textContent = friends.length;

    if ($("#sharedBadge")) $("#sharedBadge").textContent = sharedWorlds.length;

    if ($("#friendBadge")) $("#friendBadge").textContent = friends.length;

    if ($("#messageBadge"))
        $("#messageBadge").textContent = Object.values(messages).flat().length;
}

function renderNotifications() {
    const list = $("#notificationList");

    const dot = $("#notificationDot");

    if (!list) return;

    const unread = notifications.filter(
        (notification) => notification.hasRead == false,
    ).length;

    if (dot) {
        dot.style.display = unread > 0 ? "block" : "none";
    }

    if (!notifications.length) {
        list.innerHTML = `

            <div class="notification-empty" style="padding:12px;">

                <strong>
                    You're all caught up.
                </strong>

                <span>
                    No new notifications.
                </span>

            </div>

        `;

        return;
    }
    let friendIcon = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="20"
  height="20"
  viewBox="0 0 32 32"
  fill="none"
  aria-label="Friend request"
  role="img"
>
  <!-- Left person -->
  <circle
    cx="10"
    cy="9"
    r="4"
    fill="#75BDF4"
    stroke="#171717"
    stroke-width="2"
  />
  <path
    d="M2.5 25C2.5 19.8 5.5 16.5 10 16.5C14.5 16.5 17.5 19.8 17.5 25V27H2.5V25Z"
    fill="#75BDF4"
    stroke="#171717"
    stroke-width="2"
    stroke-linejoin="round"
  />

  <!-- Right person -->
  <circle
    cx="21"
    cy="12"
    r="3.5"
    fill="#20B26B"
    stroke="#171717"
    stroke-width="2"
  />
  <path
    d="M17 21C17.8 18.6 19.2 17.5 21 17.5C25 17.5 27 20.2 27 24V25H17"
    fill="#20B26B"
    stroke="#171717"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- Add friend badge -->
  <circle
    cx="25"
    cy="6"
    r="5"
    fill="#FFD84D"
    stroke="#171717"
    stroke-width="1.5"
  />
  <path
    d="M25 3.5V8.5M22.5 6H27.5"
    stroke="#171717"
    stroke-width="1.8"
    stroke-linecap="round"
  />
</svg>`;
    let regIcon = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="20"
  height="20"
  viewBox="0 0 32 32"
  fill="none"
  aria-label="Notifications"
  role="img"
>
  <!-- Bell body -->
  <path
    d="M8 13C8 8.6 11.1 5.5 16 5.5C20.9 5.5 24 8.6 24 13V19L27 23H5L8 19V13Z"
    fill="#20B26B"
    stroke="#171717"
    stroke-width="2"
    stroke-linejoin="round"
  />

  <!-- Bell clapper -->
  <path
    d="M13 26C13.5 27.5 14.5 28.5 16 28.5C17.5 28.5 18.5 27.5 19 26"
    stroke="#171717"
    stroke-width="2"
    stroke-linecap="round"
  />

  <!-- Notification accent -->
  <path
    d="M24 4L26 2M28 9H30"
    stroke="#FFD84D"
    stroke-width="2"
    stroke-linecap="round"
  />
</svg>`;
    let i = 0;
    list.innerHTML = notifications
        .map(
            (notification) => `
        <div
            class="
                notification-item
                ${notification.unread ? "unread" : ""}
            "
        >
            <span class="notif-icon">
                ${notification.header.includes("friend request")
                    ? friendIcon
                    : regIcon
                }
            </span>

            <div class="notification-content">
                <strong>
                    ${esc(
                    notification.type === "request"
                        ? notification.header.includes("friend request")
                            ? "New Friend Request"
                            : notification.type.substring(0, 1).toUpperCase() +
                            notification.type.substring(1)
                        : "New Message",
                )}
                </strong>

                <small>${esc(notification.header)}</small>

                ${notification.type === "request" &&
                    notification.header.toLowerCase().includes("friend request")
                    ? `
                            <div class="friend-request-actions">
                                <button
                                    class="accept-request"
                                    data-id="${i}"
                                >
                                    Accept
                                </button>

                                <button
                                    class="decline-request"
                                    data-id="${i++}"
                                >
                                    Decline
                                </button>
                            </div>
                        `
                    : ""
                }
            </div>
        </div>
    `,
        )

        .join("");

    list.querySelectorAll(".accept-request").forEach((button) => {
        button.addEventListener("click", async () => {
            const notificationId = button.dataset.id;
            addFriend(notifications[notificationId].header, notificationId);
        });
    });

    list.querySelectorAll(".decline-request").forEach((button) => {
        button.addEventListener("click", async () => {
            const notificationId = button.dataset.id;
        });
    });
}

async function addFriend(notifName, notificationId) {
    let query = notifName.substring(0, notifName.indexOf(" sent"));

    const possiblePeople = await supabaseClient.rpc("search_users", {
        search_term: query,
    });

    const { data } = await supabaseClient.rpc("accept_friend_request", {
        p_friend_id: possiblePeople.data[0].id,
    });
    notifications.splice(notificationId, 1);
    console.log(notifications);
    save();
    renderNotifications();
}

async function declineFriend(notifName, notificationId) {
    let query = notifName.substring(0, notifName.indexOf(" sent"));

    const possiblePeople = await supabaseClient.rpc("search_users", {
        search_term: query,
    });

    const { data } = await supabaseClient.rpc("decline_friend_request", {
        p_friend_id: possiblePeople.data[0].id,
    });
    notifications.splice(notificationId, 1);
    console.log(notifications);
    save();
    renderNotifications();
}

function openNotifications() {
    const popover = $("#notificationPopover");

    if (!popover) return;

    const isOpen = popover.classList.contains("open");

    if (isOpen) {
        popover.classList.remove("open");

        return;
    }

    popover.classList.add("open");

    popover.setAttribute("aria-hidden", "false");

    notifications = notifications.map((notification) => ({
        ...notification,
        hasRead: true,
    }));

    save();

    renderNotifications();
}

function closeNotifications() {
    const popover = $("#notificationPopover");

    if (!popover) return;

    popover.classList.remove("open");

    popover.setAttribute("aria-hidden", "true");
}

const notificationButton = $("#notificationButton");

if (notificationButton) {
    notificationButton.onclick = (event) => {
        event.stopPropagation();

        openNotifications();
    };
}

const clearNotifications = $("#clearNotifications");

if (clearNotifications) {
    clearNotifications.onclick = (event) => {
        event.stopPropagation();

        notifications = [];

        save();

        renderNotifications();

        showToast("Notifications cleared", "✓");
    };
}

document.addEventListener("click", (event) => {
    if (
        !event.target.closest("#notificationPopover") &&
        !event.target.closest("#notificationButton")
    ) {
        closeNotifications();
    }
});

function activateSection(id) {
    $$(".side-link").forEach((button) => {
        button.classList.toggle("active", button.dataset.section === id);
    });

    $$(".dashboard-section").forEach((section) => {
        section.classList.toggle("active", section.id === id);
    });
}

$$(".side-link").forEach((button) => {
    button.onclick = () => {
        activateSection(button.dataset.section);
    };
});

$$(".view-button").forEach((button) => {
    button.onclick = () => {
        $$(".view-button").forEach((item) => item.classList.remove("active"));

        button.classList.add("active");

        const listView = button.dataset.view === "list";

        $("#worldGrid")?.classList.toggle("list-view", listView);
    };
});

function openCreate() {
    resetCreate();

    $("#createModal")?.classList.add("open");

    document.body.style.overflow = "hidden";

    getLocation();
}

function closeCreate() {
    $("#createModal")?.classList.remove("open");

    document.body.style.overflow = "";
}

function resetCreate() {
    selectedType = "scratch";

    selectedDifficulty = "freeplay";

    selectedCommunity = null;

    selectedCollaborators = [];

    currentStep = 1;

    if ($("#worldName")) $("#worldName").value = "";

    if ($("#selectedCommunityName"))
        $("#selectedCommunityName").textContent = "No community selected";

    if ($("#selectedCommunityMeta"))
        $("#selectedCommunityMeta").textContent = "Choose a place above.";

    if ($("#communityContinue")) $("#communityContinue").disabled = true;

    $$(".world-type").forEach((button) => {
        button.classList.toggle("selected", button.dataset.type === "scratch");
    });

    $$(".difficulty").forEach((button) => {
        button.classList.toggle(
            "selected",
            button.dataset.difficulty === "freeplay",
        );
    });

    showCreateStep(1);

    renderCollaborators();

    updateSummary();
}

function showCreateStep(step) {
    currentStep = step;

    $$(".modal-step").forEach((section) => {
        section.classList.toggle("active", Number(section.dataset.step) === step);
    });

    $$(".create-progress button").forEach((button) => {
        button.classList.toggle(
            "active",
            Number(button.dataset.createStep) === step,
        );
    });

    updateSummary();
}

/* CREATE BUTTONS */

$("#openCreate")?.addEventListener("click", openCreate);

$("#sideCreate")?.addEventListener("click", openCreate);

$("#emptyCreate")?.addEventListener("click", openCreate);

$("#closeCreate")?.addEventListener("click", closeCreate);

$("#createModal")?.addEventListener("click", (event) => {
    if (event.target.id === "createModal") {
        closeCreate();
    }
});

/* =========================================================
   CREATE STEPS
========================================================= */

$$("[data-next]").forEach((button) => {
    button.onclick = () => {
        const next = Number(button.dataset.next);

        if (next >= 4 && !selectedCommunity) {
            showToast("Select a community first", "!");

            return;
        }

        showCreateStep(next);
    };
});

$$("[data-back]").forEach((button) => {
    button.onclick = () => {
        showCreateStep(Number(button.dataset.back));
    };
});

$$("[data-create-step]").forEach((button) => {
    button.onclick = () => {
        const step = Number(button.dataset.createStep);

        if (step > currentStep) {
            if (step >= 4 && !selectedCommunity) {
                showToast("Select a community first", "!");

                return;
            }
        }

        showCreateStep(step);
    };
});

/* =========================================================
   WORLD TYPE / DIFFICULTY
========================================================= */

$$(".world-type").forEach((button) => {
    button.onclick = () => {
        selectedType = button.dataset.type;

        $$(".world-type").forEach((item) => {
            item.classList.toggle("selected", item === button);
        });

        updateSummary();
    };
});

$$(".difficulty").forEach((button) => {
    button.onclick = () => {
        selectedDifficulty = button.dataset.difficulty;

        $$(".difficulty").forEach((item) => {
            item.classList.toggle("selected", item === button);
        });

        updateSummary();
    };
});

function updateSummary() {
    const name = $("#worldName")?.value.trim() || "Untitled world";

    if ($("#summaryWorldName")) $("#summaryWorldName").textContent = name;

    if ($("#summaryMode"))
        $("#summaryMode").textContent = modeLabel(selectedType);

    if ($("#summaryDifficulty"))
        $("#summaryDifficulty").textContent = diffLabel(selectedDifficulty);

    if ($("#summaryCommunity"))
        $("#summaryCommunity").textContent =
            selectedCommunity?.display_name ||
            selectedCommunity?.name ||
            "Community required";

    if ($("#summaryCollaborators"))
        $("#summaryCollaborators").textContent = selectedCollaborators.length
            ? `${selectedCollaborators.length} friend${selectedCollaborators.length > 1 ? "s" : ""
            }`
            : "Just you";

    if ($("#reviewMode")) $("#reviewMode").textContent = modeLabel(selectedType);

    if ($("#reviewDifficulty"))
        $("#reviewDifficulty").textContent = diffLabel(selectedDifficulty);

    if ($("#reviewCommunity"))
        $("#reviewCommunity").textContent =
            selectedCommunity?.display_name || "Not selected";

    if ($("#reviewCollaborators"))
        $("#reviewCollaborators").textContent = selectedCollaborators.length
            ? `${selectedCollaborators.length} friend${selectedCollaborators.length > 1 ? "s" : ""
            }`
            : "Just you";
}

$("#worldName")?.addEventListener("input", updateSummary);

let communityTimer;

function getLocation() {
    let userLoc = [];
    const output = document.getElementById("output");

    if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            showToast("Got Location");
            userLoc = [latitude, longitude];
            loadCommunities("", userLoc);
        },
        function (error) {
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    showToast("User denied the request for Geolocation.");
                    break;
                case error.POSITION_UNAVAILABLE:
                    showToast("Location information is unavailable.");
                    break;
                case error.TIMEOUT:
                    showToast("The request to get user location timed out.");
                    break;
                default:
                    showToast("An unknown error occurred.");
                    break;
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        },
    );
    return userLoc;
}

async function loadCommunities(query = "", userLoc = []) {
    if (query == "") {
        const { data, error } = await supabaseClient.rpc("find_nearby_cities", {
            user_lat: userLoc[0],
            user_lon: userLoc[1],
            max_results: 10,
        });
        let demoCommunities = data;
        let rows = [];

        if (!rows.length) {
            console.log(demoCommunities);
            rows = demoCommunities.filter((place) => {
                if (!query) return true;

                const search = query.toLowerCase();

                return place.title.toLowerCase().includes(search);
            });
        }
        renderCommunityResults(rows);
    } else if (query != "") {
        const { data, error } = await supabaseClient.rpc("search_communities", {
            search_text: query,
            max_results: 80,
        });

        if (error) {
            console.error("Community search failed:", error);
            return;
        }

        console.log(data);
        let demoCommunities = data;
        let rows = [];

        if (!rows.length) {
            console.log(demoCommunities);
            rows = demoCommunities.filter((place) => {
                if (!query) return true;

                const search = query.toLowerCase();

                return (place.name + " " + place.state).toLowerCase().includes(search);
            });
        }
        renderCommunityResults(rows);
    }
}
function formatNumber(number) {
    return Number(number).toLocaleString("en-US");
}

function renderCommunityResults(rows) {
    const count = $("#communityResultCount");

    const list = $("#communityResultList");

    if (count) {
        count.textContent = `${rows.length} places`;
    }

    if (!list) return;

    list.innerHTML = rows.length
        ? rows
            .map((place) => {
                const community = {
                    name: place.name || place.display_name,
                    state: place.state,

                    display_name: place.display_name || place.name,

                    type: place.type || "Community",

                    population: place.population,
                    longitude: place.longitude,
                    latitude: place.latitude,
                };

                return `

                        <div
                            class="community-result"
                            data-community='${esc(JSON.stringify(community))}'
                        >

                            <span class="community-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 20V9L12 4L20 9V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M8 20V12H16V20" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                                    <path d="M10 15H14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                                    <path d="M12 9V9.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                                </svg>
                            </span>


                            <div>

                                <strong>
                                    ${esc(community.name)}, ${US_STATES[esc(community.state)]}
                                </strong>

                                <small>

                                    ${esc(community.type)}

                                    ·

                                    ${formatNumber(community.population)} People

                                </small>

                            </div>

                        </div>
                    `;
            })
            .join("")
        : `

                <div class="notification-empty">

                    <strong>
                        No places found.
                    </strong>

                    <span>
                        Try a broader search.
                    </span>

                </div>
            `;

    $$(".community-result").forEach((element) => {
        element.onclick = () => {
            console.log(element.dataset.community);
            selectedCommunity = JSON.parse(element.dataset.community);

            $("#selectedCommunityName").textContent = selectedCommunity.display_name;

            $("#selectedCommunityMeta").textContent =
                formatNumber(selectedCommunity.population) + " People";

            $("#communityContinue").disabled = false;

            updateSummary();
        };
    });
}

$("#communitySearch")?.addEventListener("input", (event) => {
    clearTimeout(communityTimer);

    communityTimer = setTimeout(
        () => loadCommunities(event.target.value.trim()),
        150,
    );
});

$$(".community-tab").forEach((button) => {
    button.onclick = () => {
        $$(".community-tab").forEach((item) => item.classList.remove("active"));

        button.classList.add("active");

        const coordinates = button.dataset.searchMode === "coords";

        $("#nameSearchRow")?.classList.toggle("hidden", coordinates);

        $("#coordsSearchRow")?.classList.toggle("hidden", !coordinates);

        if (!coordinates) {
            loadCommunities($("#communitySearch")?.value.trim() || "");
        }
    };
});

$("#clearCommunity")?.addEventListener("click", () => {
    selectedCommunity = null;

    $("#selectedCommunityName").textContent = "No community selected";

    $("#selectedCommunityMeta").textContent = "Choose a place above.";

    $("#communityContinue").disabled = true;

    updateSummary();
});

$("#findCoordinates")?.addEventListener("click", () => {
    const latitude = Number($("#latitudeInput")?.value);

    const longitude = Number($("#longitudeInput")?.value);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        showToast("Enter valid coordinates", "!");

        return;
    }

    loadCommunities("", [latitude, longitude]);
});

function renderCollaborators() {
    const container = $("#collaboratorList");

    if (!container) return;

    const query = $("#collabSearch")?.value.toLowerCase() || "";

    const rows = friends.filter((friend) =>
        friend.display_name.toLowerCase().includes(query),
    );

    container.innerHTML = rows
        .map(
            (friend) => `

                    <label
                        class="
                            collab-row
                            ${selectedCollaborators.includes(friend.id)
                    ? "selected"
                    : ""
                }
                        "
                    >

                        <input
                            type="checkbox"
                            value="${esc(friend.id)}"
                            ${selectedCollaborators.includes(friend.id)
                    ? "checked"
                    : ""
                }
                        >


                        <span class="collab-avatar">

                            ${esc(friend.display_name[0])}

                        </span>


                        <span>

                            <strong>
                                ${esc(friend.display_name)}
                            </strong>

                            <small>
                                @${esc(friend.display_name)}
                            </small>

                        </span>

                    </label>
                `,
        )
        .join("");

    $$("#collaboratorList input").forEach((input) => {
        input.onchange = () => {
            if (input.checked) {
                if (!selectedCollaborators.includes(input.value)) {
                    selectedCollaborators.push(input.value);
                }
            } else {
                selectedCollaborators = selectedCollaborators.filter(
                    (id) => id !== input.value,
                );
            }

            renderCollaborators();

            updateSummary();
        };
    });
}

$("#collabSearch")?.addEventListener("input", renderCollaborators);

$("#launchWorld")?.addEventListener("click", async () => {
    showLoading({
        title: "Welcome to your community!",
        message: loadingMessages[0],
        status: "Loading community data",
    });
    closeCreate();
    const { data: selectedlocationId, error: locationError } =
        await supabaseClient.rpc("get_location_id", {
            user_lat: selectedCommunity.latitude,
            user_lon: selectedCommunity.longitude,
        });
    if (locationError) {
        console.error(locationError.message);
        return;
    }

    const name = $("#worldName")?.value.trim();

    if (!name) {
        showToast("Give your world a name", "!");

        return;
    }

    if (!selectedCommunity) {
        showCreateStep(3);

        showToast("Community selection is required", "!");

        return;
    }
    
    const world = {
        creator_id: universal_userInfo.id,
        world_name: name,
        assist_id: selectedCollaborators,
        visibility: "Private",
        published_at: null,
        world_type: selectedType,
        game_mode: selectedDifficulty,
        problems: [],
        statistics: {},
        views: 0,
        comments: [],
        likes: 0,
        location_id: selectedlocationId,
    };

    const { data, error } = await supabaseClient
        .from("worlds")
        .insert([world])
        .select();

    if (error) {
        console.error("Insert failed:", error.message);
    } else {
        console.log("Inserted row:", data);
    }

    worlds.unshift(data[0]);

    save();

    showToast("World created", "✓");
    renderWorlds();
    hideLoading()
});

/* =========================================================
   CHAT
========================================================= */

function openChat(id) {
    activeFriend = friends.find((friend) => friend.id === id);

    if (!activeFriend) return;

    if ($("#chatTitle")) $("#chatTitle").textContent = activeFriend.name;

    if ($("#chatStatus"))
        $("#chatStatus").textContent =
            activeFriend.status === "online" ? "Online" : "Offline";

    if ($("#chatAvatar")) $("#chatAvatar").textContent = activeFriend.name[0];

    if ($("#chatInput")) $("#chatInput").disabled = false;

    if ($("#chatForm button")) $("#chatForm button").disabled = false;

    renderFriends();

    renderMessages();
}

function renderMessages() {
    if (!activeFriend) return;

    const container = $("#chatMessages");

    if (!container) return;

    const list = messages[activeFriend.id] || [];

    container.innerHTML = list.length
        ? list
            .map(
                (message) => `

                        <div
                            class="
                                message
                                ${message.me ? "me" : ""}
                            "
                        >

                            <div
                                class="
                                    message-bubble
                                "
                            >
                                ${esc(message.text)}
                            </div>

                        </div>
                    `,
            )
            .join("")
        : `

                <div class="chat-empty">
                    Start the conversation.
                </div>
            `;

    container.scrollTop = container.scrollHeight;
}

$("#chatForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!activeFriend) return;

    const input = $("#chatInput");

    const text = input?.value.trim();

    if (!text) return;

    if (!messages[activeFriend.id]) {
        messages[activeFriend.id] = [];
    }

    messages[activeFriend.id].push({
        me: true,

        text,
    });

    input.value = "";

    save();

    renderMessages();

    updateStats();
});

/* =========================================================
   ADD FRIEND
========================================================= */

const possiblePeople = [];

$("#openAddFriend")?.addEventListener("click", () => {
    $("#friendModal")?.classList.add("open");

    document.body.style.overflow = "hidden";

    renderFriendSearch("");
});

$("#closeFriend")?.addEventListener("click", () => {
    $("#friendModal")?.classList.remove("open");

    document.body.style.overflow = "";
});

$("#friendModal")?.addEventListener("click", (event) => {
    if (event.target.id === "friendModal") {
        $("#closeFriend")?.click();
    }
});

$("#friendSearch")?.addEventListener("input", (event) => {
    renderFriendSearch(event.target.value);
});

async function renderFriendSearch(query = "") {
    const container = $("#friendSearchResults");

    if (!container) return;

    const possiblePeople = await supabaseClient.rpc("search_users", {
        search_term: query,
    });
    console.log(possiblePeople.data);
    const rows = possiblePeople.data.filter((person) =>
        person.display_name.toLowerCase().includes(query.toLowerCase()),
    );

    container.innerHTML = rows
        .map((person) => {
            const exists = friends.some(
                (friend) => friend.display_name === person.display_name,
            );

            return `

                    <div class="search-person">

                        <span class="profile-avatar">

                            ${esc(person.display_name[0])}

                        </span>


                        <div>

                            <strong>
                                ${esc(person.display_name)}
                            </strong>

                            <small>
                                @${esc(person.display_name)}
                            </small>

                        </div>


                        <button
                            data-person="${esc(person.id)}"
                            ${exists ? "disabled" : ""}
                        >

                            ${exists ? "Added" : "Add"}

                        </button>

                    </div>
                `;
        })
        .join("");

    $$("[data-person]").forEach((button) => {
        button.onclick = () => {
            const person = possiblePeople.data.find(
                (item) => item.id === button.dataset.person,
            );

            if (!person) return;

            if (
                friends.some((friend) => friend.display_name === person.display_name)
            ) {
                return;
            }

            friends.push({
                ...person,

                status: "Requested",
            });

            sendFriendRequestNotification(
                universal_username,
                friends[friends.length - 1].id,
            );

            renderFriends();
            save();

            button.disabled = true;

            button.textContent = "Request Sent";

            showToast(`Friend request sent ${person.display_name}`, "✓");
        };
    });
}

async function sendFriendRequestNotification(senderUsername, receiverId) {
    const { error } = await supabaseClient.rpc(
        "send_friend_request_notification",
        {
            sender_username: senderUsername,
            receiver_id: receiverId,
        },
    );

    if (error) {
        console.error("Failed to send friend request notification:", error.message);
        return false;
    }

    return true;
}

function showToast(message = "Done", icon = "✓") {
    const toast = $("#toast");

    if (!toast) return;

    const iconElement = toast.querySelector(".toast-icon");

    const messageElement = toast.querySelector("strong");

    if (iconElement) iconElement.textContent = icon;

    if (messageElement) messageElement.textContent = message;

    toast.classList.add("show");

    clearTimeout(window.civicToast);

    window.civicToast = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
        return;
    }

    closeCreate();

    $("#closeFriend")?.click();

    closeNotifications();
});
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingTitle = document.getElementById("loadingTitle");
const loadingMessage = document.getElementById("loadingMessage");

const loadingMessages = [
    "Getting everything ready for you!",
    "Checking in on your community...",
    "Making your dashboard shine...",
    "Almost ready to make a difference!",
];

let loadingMessageTimer;

function showLoading({
    title = "Building a better community...",
    message = "Getting everything ready for you!",
    status = "Preparing your world",
} = {}) {
    clearInterval(loadingMessageTimer);

    loadingTitle.textContent = title;
    loadingMessage.textContent = message;

    loadingOverlay.hidden = false;
    document.body.style.overflow = "hidden";
}

function updateLoading(percent, status, message) {
    const value = Math.max(0, Math.min(100, percent));

    loadingProgress.style.width = `${value}%`;
    loadingPercent.textContent = `${Math.round(value)}%`;

    if (status) loadingStatus.textContent = status;
    if (message) loadingMessage.textContent = message;
}

function hideLoading() {
    clearInterval(loadingMessageTimer);
    loadingOverlay.hidden = true;
    document.body.style.overflow = "";
}
showLoading({
    title: "Welcome to your community!",
    message: loadingMessages[0],
    status: "Loading community data"
});
lucide.createIcons();
initUser();
renderMessages();
renderShared();
hideLoading()
