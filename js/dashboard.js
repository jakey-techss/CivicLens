const SUPABASE_URL =
    "https://iozxsdstndywnqbytzja.supabase.co";

const SUPABASE_KEY =
    "PASTE_YOUR_EXISTING_SUPABASE_ANON_KEY_HERE";

const supabaseClient =
    window.supabase && SUPABASE_KEY !== "PASTE_YOUR_EXISTING_SUPABASE_ANON_KEY_HERE"
        ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
        : null;


/* =========================================================
   HELPERS
========================================================= */

const $ = selector =>
    document.querySelector(selector);

const $$ = selector =>
    [...document.querySelectorAll(selector)];

const esc = value =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");


/* =========================================================
   WORLD CREATION STATE
========================================================= */

let selectedType = "scratch";
let selectedDifficulty = "freeplay";
let selectedCommunity = null;
let selectedCollaborators = [];
let currentStep = 1;

let activeFriend = null;


/* =========================================================
   DATA
========================================================= */

let worlds =
    JSON.parse(
        localStorage.getItem("civiclens_worlds_v3")
    ) || [];


let sharedWorlds =
    JSON.parse(
        localStorage.getItem("civiclens_shared_v3")
    ) || [
        {
            id: crypto.randomUUID(),
            name: "Newark 2040",
            location: "Newark, NJ",
            owner: "Maya Johnson",
            description:
                "A collaborative future-city experiment.",
            mode: "scratch",
            difficulty: "medium",
            problems: 6,
            analyses: 9,
            progress: 31
        }
    ];


let friends =
    JSON.parse(
        localStorage.getItem("civiclens_friends_v3")
    ) || [
        {
            id: "f1",
            name: "Maya Johnson",
            username: "maya.builds",
            status: "online",
            code: "MAYA2040"
        },
        {
            id: "f2",
            name: "Jordan Lee",
            username: "jordanlens",
            status: "offline",
            code: "JORDAN77"
        },
        {
            id: "f3",
            name: "Chris Mensah",
            username: "cmensah",
            status: "online",
            code: "CHRISLAB"
        },
        {
            id: "f4",
            name: "Aaliyah Smith",
            username: "aaliyah.city",
            status: "offline",
            code: "AALIYAH9"
        }
    ];


let messages =
    JSON.parse(
        localStorage.getItem("civiclens_messages_v3")
    ) || {
        f1: [
            {
                me: false,
                text:
                    "Want to collaborate on Newark 2040?"
            },
            {
                me: true,
                text:
                    "Absolutely. I'll join."
            }
        ],
        f2: [
            {
                me: false,
                text:
                    "Did you see the new community map?"
            }
        ],
        f3: [],
        f4: []
    };


/* =========================================================
   NOTIFICATIONS
========================================================= */

let notifications =
    JSON.parse(
        localStorage.getItem(
            "civiclens_notifications_v3"
        )
    ) || [
        {
            id: "n1",
            icon: "◈",
            title:
                "Maya shared a world with you",
            text:
                "Newark 2040 is ready to explore.",
            unread: true
        },
        {
            id: "n2",
            icon: "◎",
            title:
                "Chris is online",
            text:
                "You can invite them to collaborate.",
            unread: true
        },
        {
            id: "n3",
            icon: "✓",
            title:
                "Welcome back",
            text:
                "Your CivicLens workspace is ready.",
            unread: false
        }
    ];


function save() {

    localStorage.setItem(
        "civiclens_worlds_v3",
        JSON.stringify(worlds)
    );

    localStorage.setItem(
        "civiclens_shared_v3",
        JSON.stringify(sharedWorlds)
    );

    localStorage.setItem(
        "civiclens_friends_v3",
        JSON.stringify(friends)
    );

    localStorage.setItem(
        "civiclens_messages_v3",
        JSON.stringify(messages)
    );

    localStorage.setItem(
        "civiclens_notifications_v3",
        JSON.stringify(notifications)
    );
}


/* =========================================================
   LABELS
========================================================= */

function modeLabel(mode) {

    return mode === "improve"
        ? "Improve Existing Community"
        : "Start From Scratch";
}


function diffLabel(difficulty) {

    return {
        freeplay: "Free-play",
        medium: "Medium",
        reallife: "Real Life",
        hell: "Hell Mode"
    }[difficulty] || difficulty;
}


/* =========================================================
   AUTH
========================================================= */

async function initUser() {

    if (!supabaseClient) {

        

        return;
    }


    const {
        data: { session }
    } =
        await supabaseClient.auth.getSession();


    if (!session) {

        window.location.href =
            "login.html";

        return;
    }


    const metadata =
        session.user.user_metadata || {};


    const name =
        metadata.display_name ||
        session.user.email?.split("@")[0] ||
        "Explorer";


    setUser(name);


}


function setUser(name) {

    const letter =
        name[0]?.toUpperCase() || "?";


    $$(".profile-name, .top-profile-name")
        .forEach(element => {

            element.textContent =
                name;
        });


    $$(".profile-avatar, .top-avatar")
        .forEach(element => {

            element.textContent =
                letter;
        });
}


/* =========================================================
   MAP PREVIEWS
========================================================= */

function mapPreview(index) {

    const types = [
        "city",
        "coast",
        "mountain",
        "wilderness",
        "desert",
        "chaos"
    ];


    const type =
        types[index % types.length];


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


/* =========================================================
   WORLD CARDS
========================================================= */

function worldCard(
    world,
    index,
    shared = false
) {

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
                            ${esc(world.name)}
                        </h3>

                        <div class="world-location">

                            <span
                                class="location-dot"
                            ></span>

                            ${esc(
                                world.location ||
                                "Personal World"
                            )}

                        </div>

                    </div>


                    ${
                        shared

                            ? `
                                <span class="shared-owner">
                                    BY ${esc(world.owner)}
                                </span>
                            `

                            : `
                                <button
                                    class="more-button"
                                    data-delete="${esc(world.id)}"
                                    aria-label="Delete world"
                                >
                                    ×
                                </button>
                            `
                    }

                </div>


                <p class="world-description">

                    ${esc(
                        world.description ||
                        "A CivicLens world ready for your next investigation."
                    )}

                </p>


                <div class="world-tags">

                    <span class="world-tag">
                        ${modeLabel(world.mode)}
                    </span>

                    <span class="world-tag">
                        ${diffLabel(world.difficulty)}
                    </span>

                    <span class="world-tag">
                        ${Number(
                            world.problems || 0
                        )} problems
                    </span>

                </div>


                <div class="world-footer">

                    <span class="world-last">

                        ${
                            shared
                                ? "Shared with you"
                                : "Continue exploring"
                        }

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


/* =========================================================
   WORLDS
========================================================= */

function renderWorlds() {

    const grid =
        $("#worldGrid");

    const empty =
        $("#emptyState");


    if (!grid)
        return;


    grid.innerHTML =
        worlds
            .map(worldCard)
            .join("");


    if (empty) {

        empty.style.display =
            worlds.length
                ? "none"
                : "block";
    }


    grid.style.display =
        worlds.length
            ? "grid"
            : "none";


    $$("#worldGrid .world-card")
        .forEach(card => {

            card.onclick = event => {

                if (
                    event.target.closest(
                        "[data-delete]"
                    )
                ) {

                    return;
                }


                const world =
                    worlds.find(
                        item =>
                            item.id ===
                            card.dataset.world
                    );


                if (!world)
                    return;


                showToast(
                    `Opening ${world.name}`,
                    "→"
                );
            };
        });


    $$("[data-delete]")
        .forEach(button => {

            button.onclick = event => {

                event.stopPropagation();


                worlds =
                    worlds.filter(
                        world =>
                            world.id !==
                            button.dataset.delete
                    );


                save();

         

                showToast(
                    "World deleted",
                    "×"
                );
            };
        });
}


/* =========================================================
   SHARED WORLDS
========================================================= */

function renderShared() {

    const grid =
        $("#sharedGrid");


    if (!grid)
        return;


    grid.innerHTML =
        sharedWorlds
            .map(
                (world, index) =>
                    worldCard(
                        world,
                        index,
                        true
                    )
            )
            .join("");
}


/* =========================================================
   FRIENDS
========================================================= */

function renderFriends() {

    const grid =
        $("#friendsGrid");


    if (!grid)
        return;


    const online =
        friends.filter(
            friend =>
                friend.status ===
                "online"
        ).length;


    const onlineCounter =
        $("#friendsOnlineCount");


    if (onlineCounter) {

        onlineCounter.textContent =
            `${online} online`;
    }


    grid.innerHTML =
        friends
            .map(
                friend => `

                    <div
                        class="friend-card"
                        data-friend="${esc(
                            friend.id
                        )}"
                    >

                        <span class="profile-avatar">

                            ${esc(
                                friend.name[0]
                            )}

                        </span>


                        <div class="friend-info">

                            <strong>
                                ${esc(
                                    friend.name
                                )}
                            </strong>

                            <span>
                                @${esc(
                                    friend.username
                                )}
                            </span>

                        </div>


                        <span
                            class="
                                friend-status
                                ${
                                    friend.status ===
                                    "online"
                                        ? "online"
                                        : ""
                                }
                            "
                        >
                            ${friend.status}
                        </span>

                    </div>
                `
            )
            .join("");


    $$(".friend-card")
        .forEach(card => {

            card.onclick = () => {

                openChat(
                    card.dataset.friend
                );

                activateSection(
                    "chatSection"
                );
            };
        });


    renderChatFriends();
}


function renderChatFriends() {

    const container =
        $("#chatFriends");


    if (!container)
        return;


    container.innerHTML =
        friends
            .map(
                friend => `

                    <div
                        class="
                            chat-friend
                            ${
                                activeFriend?.id ===
                                friend.id
                                    ? "active"
                                    : ""
                            }
                        "
                        data-friend="${esc(
                            friend.id
                        )}"
                    >

                        <span class="profile-avatar">

                            ${esc(
                                friend.name[0]
                            )}

                        </span>


                        <div>

                            <strong>
                                ${esc(
                                    friend.name
                                )}
                            </strong>

                            <small>
                                @${esc(
                                    friend.username
                                )}
                            </small>

                        </div>

                    </div>
                `
            )
            .join("");


    $$(".chat-friend")
        .forEach(element => {

            element.onclick = () =>
                openChat(
                    element.dataset.friend
                );
        });
}


/* =========================================================
   STATS
========================================================= */

function updateStats() {

    const problems =
        worlds.reduce(
            (total, world) =>
                total +
                Number(
                    world.problems || 0
                ),
            0
        );


    const analyses =
        worlds.reduce(
            (total, world) =>
                total +
                Number(
                    world.analyses || 0
                ),
            0
        );


    if ($("#worldCount"))
        $("#worldCount").textContent =
            worlds.length;


    if ($("#problemCount"))
        $("#problemCount").textContent =
            problems;


    if ($("#analysisCount"))
        $("#analysisCount").textContent =
            analyses;


    if ($("#friendCount"))
        $("#friendCount").textContent =
            friends.length;


    if ($("#sharedBadge"))
        $("#sharedBadge").textContent =
            sharedWorlds.length;


    if ($("#friendBadge"))
        $("#friendBadge").textContent =
            friends.length;


    if ($("#messageBadge"))
        $("#messageBadge").textContent =
            Object.values(messages)
                .flat()
                .length;
}


/* =========================================================
   NOTIFICATIONS
========================================================= */

function renderNotifications() {

    const list =
        $("#notificationList");

    const dot =
        $("#notificationDot");


    if (!list)
        return;


    const unread =
        notifications.filter(
            notification =>
                notification.unread
        ).length;


    if (dot) {

        dot.style.display =
            unread
                ? "block"
                : "none";
    }


    if (!notifications.length) {

        list.innerHTML = `

            <div class="notification-empty">

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


    list.innerHTML =
        notifications
            .map(
                notification => `

                    <div
                        class="
                            notification-item
                            ${
                                notification.unread
                                    ? "unread"
                                    : ""
                            }
                        "
                    >

                        <span class="notif-icon">

                            ${esc(
                                notification.icon
                            )}

                        </span>


                        <div>

                            <strong>
                                ${esc(
                                    notification.title
                                )}
                            </strong>

                            <small>
                                ${esc(
                                    notification.text
                                )}
                            </small>

                        </div>

                    </div>
                `
            )
            .join("");
}


function openNotifications() {

    const popover =
        $("#notificationPopover");


    if (!popover)
        return;


    const isOpen =
        popover.classList.contains(
            "open"
        );


    if (isOpen) {

        popover.classList.remove(
            "open"
        );

        return;
    }


    popover.classList.add(
        "open"
    );


    popover.setAttribute(
        "aria-hidden",
        "false"
    );


    notifications =
        notifications.map(
            notification => ({
                ...notification,
                unread: false
            })
        );


    save();

    renderNotifications();
}


function closeNotifications() {

    const popover =
        $("#notificationPopover");


    if (!popover)
        return;


    popover.classList.remove(
        "open"
    );


    popover.setAttribute(
        "aria-hidden",
        "true"
    );
}


const notificationButton =
    $("#notificationButton");


if (notificationButton) {

    notificationButton.onclick =
        event => {

            event.stopPropagation();

            openNotifications();
        };
}


const clearNotifications =
    $("#clearNotifications");


if (clearNotifications) {

    clearNotifications.onclick =
        event => {

            event.stopPropagation();


            notifications = [];

            save();

            renderNotifications();

            showToast(
                "Notifications cleared",
                "✓"
            );
        };
}


document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                "#notificationPopover"
            ) &&
            !event.target.closest(
                "#notificationButton"
            )
        ) {

            closeNotifications();
        }
    }
);


/* =========================================================
   NAVIGATION
========================================================= */

function activateSection(id) {

    $$(".side-link")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.section ===
                    id
            );
        });


    $$(".dashboard-section")
        .forEach(section => {

            section.classList.toggle(
                "active",
                section.id === id
            );
        });
}


$$(".side-link")
    .forEach(button => {

        button.onclick = () => {

            activateSection(
                button.dataset.section
            );
        };
    });


/* =========================================================
   VIEW SWITCHING
========================================================= */

$$(".view-button")
    .forEach(button => {

        button.onclick = () => {

            $$(".view-button")
                .forEach(item =>
                    item.classList.remove(
                        "active"
                    )
                );


            button.classList.add(
                "active"
            );


            const listView =
                button.dataset.view ===
                "list";


            $("#worldGrid")
                ?.classList.toggle(
                    "list-view",
                    listView
                );
        };
    });


/* =========================================================
   CREATE WORLD
========================================================= */

function openCreate() {

    resetCreate();

    $("#createModal")
        ?.classList.add("open");

    document.body.style.overflow =
        "hidden";

    loadCommunities("");
}


function closeCreate() {

    $("#createModal")
        ?.classList.remove("open");

    document.body.style.overflow =
        "";
}


function resetCreate() {

    selectedType =
        "scratch";

    selectedDifficulty =
        "freeplay";

    selectedCommunity =
        null;

    selectedCollaborators =
        [];

    currentStep =
        1;


    if ($("#worldName"))
        $("#worldName").value =
            "";


    if ($("#selectedCommunityName"))
        $("#selectedCommunityName")
            .textContent =
                "No community selected";


    if ($("#selectedCommunityMeta"))
        $("#selectedCommunityMeta")
            .textContent =
                "Choose a place above.";


    if ($("#communityContinue"))
        $("#communityContinue")
            .disabled =
                true;


    $$(".world-type")
        .forEach(button => {

            button.classList.toggle(
                "selected",
                button.dataset.type ===
                    "scratch"
            );
        });


    $$(".difficulty")
        .forEach(button => {

            button.classList.toggle(
                "selected",
                button.dataset.difficulty ===
                    "freeplay"
            );
        });


    showCreateStep(1);

    renderCollaborators();

    updateSummary();
}


function showCreateStep(step) {

    currentStep =
        step;


    $$(".modal-step")
        .forEach(section => {

            section.classList.toggle(
                "active",
                Number(
                    section.dataset.step
                ) === step
            );
        });


    $$(".create-progress button")
        .forEach(button => {

            button.classList.toggle(
                "active",
                Number(
                    button.dataset.createStep
                ) === step
            );
        });


    updateSummary();
}


/* CREATE BUTTONS */

$("#openCreate")?.addEventListener(
    "click",
    openCreate
);

$("#sideCreate")?.addEventListener(
    "click",
    openCreate
);

$("#emptyCreate")?.addEventListener(
    "click",
    openCreate
);

$("#closeCreate")?.addEventListener(
    "click",
    closeCreate
);


$("#createModal")?.addEventListener(
    "click",
    event => {

        if (
            event.target.id ===
            "createModal"
        ) {

            closeCreate();
        }
    }
);


/* =========================================================
   CREATE STEPS
========================================================= */

$$("[data-next]")
    .forEach(button => {

        button.onclick = () => {

            const next =
                Number(
                    button.dataset.next
                );


            if (
                next >= 4 &&
                !selectedCommunity
            ) {

                showToast(
                    "Select a community first",
                    "!"
                );

                return;
            }


            showCreateStep(next);
        };
    });


$$("[data-back]")
    .forEach(button => {

        button.onclick = () => {

            showCreateStep(
                Number(
                    button.dataset.back
                )
            );
        };
    });


$$("[data-create-step]")
    .forEach(button => {

        button.onclick = () => {

            const step =
                Number(
                    button.dataset.createStep
                );


            if (
                step > currentStep
            ) {

                if (
                    step >= 4 &&
                    !selectedCommunity
                ) {

                    showToast(
                        "Select a community first",
                        "!"
                    );

                    return;
                }
            }


            showCreateStep(step);
        };
    });


/* =========================================================
   WORLD TYPE / DIFFICULTY
========================================================= */

$$(".world-type")
    .forEach(button => {

        button.onclick = () => {

            selectedType =
                button.dataset.type;


            $$(".world-type")
                .forEach(item => {

                    item.classList.toggle(
                        "selected",
                        item === button
                    );
                });


            updateSummary();
        };
    });


$$(".difficulty")
    .forEach(button => {

        button.onclick = () => {

            selectedDifficulty =
                button.dataset.difficulty;


            $$(".difficulty")
                .forEach(item => {

                    item.classList.toggle(
                        "selected",
                        item === button
                    );
                });


            updateSummary();
        };
    });


/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {

    const name =
        $("#worldName")
            ?.value
            .trim() ||
        "Untitled world";


    if ($("#summaryWorldName"))
        $("#summaryWorldName")
            .textContent =
                name;


    if ($("#summaryMode"))
        $("#summaryMode")
            .textContent =
                modeLabel(
                    selectedType
                );


    if ($("#summaryDifficulty"))
        $("#summaryDifficulty")
            .textContent =
                diffLabel(
                    selectedDifficulty
                );


    if ($("#summaryCommunity"))
        $("#summaryCommunity")
            .textContent =
                selectedCommunity
                    ?.display_name ||
                selectedCommunity
                    ?.name ||
                "Community required";


    if ($("#summaryCollaborators"))
        $("#summaryCollaborators")
            .textContent =
                selectedCollaborators.length
                    ? `${selectedCollaborators.length} friend${
                        selectedCollaborators.length > 1
                            ? "s"
                            : ""
                    }`
                    : "Just you";


    if ($("#reviewMode"))
        $("#reviewMode")
            .textContent =
                modeLabel(
                    selectedType
                );


    if ($("#reviewDifficulty"))
        $("#reviewDifficulty")
            .textContent =
                diffLabel(
                    selectedDifficulty
                );


    if ($("#reviewCommunity"))
        $("#reviewCommunity")
            .textContent =
                selectedCommunity
                    ?.display_name ||
                "Not selected";


    if ($("#reviewCollaborators"))
        $("#reviewCollaborators")
            .textContent =
                selectedCollaborators.length
                    ? `${selectedCollaborators.length} friend${
                        selectedCollaborators.length > 1
                            ? "s"
                            : ""
                    }`
                    : "Just you";
}


$("#worldName")?.addEventListener(
    "input",
    updateSummary
);


/* =========================================================
   COMMUNITIES
========================================================= */

const demoCommunities = [
    {
        name:
            "Newark, New Jersey, United States",
        display_name:
            "Newark",
        type:
            "City · New Jersey · United States",
        latitude:
            40.7357,
        longitude:
            -74.1724
    },
    {
        name:
            "Jersey City, New Jersey, United States",
        display_name:
            "Jersey City",
        type:
            "City · New Jersey · United States",
        latitude:
            40.7178,
        longitude:
            -74.0431
    },
    {
        name:
            "New York City, New York, United States",
        display_name:
            "New York City",
        type:
            "City · New York · United States",
        latitude:
            40.7128,
        longitude:
            -74.006
    },
    {
        name:
            "Philadelphia, Pennsylvania, United States",
        display_name:
            "Philadelphia",
        type:
            "City · Pennsylvania · United States",
        latitude:
            39.9526,
        longitude:
            -75.1652
    },
    {
        name:
            "Boston, Massachusetts, United States",
        display_name:
            "Boston",
        type:
            "City · Massachusetts · United States",
        latitude:
            42.3601,
        longitude:
            -71.0589
    },
    {
        name:
            "Chicago, Illinois, United States",
        display_name:
            "Chicago",
        type:
            "City · Illinois · United States",
        latitude:
            41.8781,
        longitude:
            -87.6298
    },
    {
        name:
            "Los Angeles, California, United States",
        display_name:
            "Los Angeles",
        type:
            "City · California · United States",
        latitude:
            34.0522,
        longitude:
            -118.2437
    },
    {
        name:
            "Toronto, Ontario, Canada",
        display_name:
            "Toronto",
        type:
            "City · Ontario · Canada",
        latitude:
            43.6532,
        longitude:
            -79.3832
    },
    {
        name:
            "London, England, United Kingdom",
        display_name:
            "London",
        type:
            "City · England · United Kingdom",
        latitude:
            51.5074,
        longitude:
            -0.1278
    },
    {
        name:
            "Accra, Greater Accra, Ghana",
        display_name:
            "Accra",
        type:
            "City · Greater Accra · Ghana",
        latitude:
            5.6037,
        longitude:
            -0.187
    }
];


let communityTimer;


async function loadCommunities(
    query = ""
) {

    let rows = [];


    if (supabaseClient) {

        try {

            const {
                data,
                error
            } =
                await supabaseClient.rpc(
                    "search_communities",
                    {
                        search_text:
                            query || "",
                        lat:
                            null,
                        lon:
                            null,
                        limit_count:
                            100
                    }
                );


            if (!error && data) {

                rows = data;
            }

        } catch (error) {

            console.warn(
                "Community search unavailable:",
                error
            );
        }
    }


    if (!rows.length) {

        rows =
            demoCommunities.filter(
                place => {

                    if (!query)
                        return true;


                    const search =
                        query.toLowerCase();


                    return (
                        place.name
                            .toLowerCase()
                            .includes(search) ||

                        place.display_name
                            .toLowerCase()
                            .includes(search)
                    );
                }
            );
    }


    renderCommunityResults(
        rows
    );
}


function renderCommunityResults(
    rows
) {

    const count =
        $("#communityResultCount");


    const list =
        $("#communityResultList");


    if (count) {

        count.textContent =
            `${rows.length} places`;
    }


    if (!list)
        return;


    list.innerHTML =
        rows.length

            ? rows
                .map(place => {

                    const community = {

                        name:
                            place.name ||
                            place.display_name,

                        display_name:
                            place.display_name ||
                            place.name,

                        type:
                            place.type ||
                            "Community",

                        latitude:
                            place.latitude,

                        longitude:
                            place.longitude
                    };


                    return `

                        <div
                            class="community-result"
                            data-community='${esc(
                                JSON.stringify(
                                    community
                                )
                            )}'
                        >

                            <span class="place-icon">
                                ⌖
                            </span>


                            <div>

                                <strong>
                                    ${esc(
                                        community.display_name
                                    )}
                                </strong>

                                <small>

                                    ${esc(
                                        community.type
                                    )}

                                    ·

                                    ${Number(
                                        community.latitude
                                    ).toFixed(4)}

                                    ,

                                    ${Number(
                                        community.longitude
                                    ).toFixed(4)}

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


    $$(".community-result")
        .forEach(element => {

            element.onclick = () => {

                selectedCommunity =
                    JSON.parse(
                        element.dataset.community
                    );


                $("#selectedCommunityName")
                    .textContent =
                        selectedCommunity
                            .display_name;


                $("#selectedCommunityMeta")
                    .textContent =
                        `${selectedCommunity.type} · ${
                            Number(
                                selectedCommunity.latitude
                            ).toFixed(4)
                        }, ${
                            Number(
                                selectedCommunity.longitude
                            ).toFixed(4)
                        }`;


                $("#communityContinue")
                    .disabled =
                        false;


                updateSummary();
            };
        });
}


$("#communitySearch")
    ?.addEventListener(
        "input",
        event => {

            clearTimeout(
                communityTimer
            );


            communityTimer =
                setTimeout(
                    () =>
                        loadCommunities(
                            event.target.value.trim()
                        ),
                    150
                );
        }
    );


$$(".community-tab")
    .forEach(button => {

        button.onclick = () => {

            $$(".community-tab")
                .forEach(item =>
                    item.classList.remove(
                        "active"
                    )
                );


            button.classList.add(
                "active"
            );


            const coordinates =
                button.dataset.searchMode ===
                "coords";


            $("#nameSearchRow")
                ?.classList.toggle(
                    "hidden",
                    coordinates
                );


            $("#coordsSearchRow")
                ?.classList.toggle(
                    "hidden",
                    !coordinates
                );


            if (!coordinates) {

                loadCommunities(
                    $("#communitySearch")
                        ?.value
                        .trim() || ""
                );
            }
        };
    });


$("#clearCommunity")
    ?.addEventListener(
        "click",
        () => {

            selectedCommunity =
                null;


            $("#selectedCommunityName")
                .textContent =
                    "No community selected";


            $("#selectedCommunityMeta")
                .textContent =
                    "Choose a place above.";


            $("#communityContinue")
                .disabled =
                    true;


            updateSummary();
        }
    );


$("#findCoordinates")
    ?.addEventListener(
        "click",
        () => {

            const latitude =
                Number(
                    $("#latitudeInput")
                        ?.value
                );


            const longitude =
                Number(
                    $("#longitudeInput")
                        ?.value
                );


            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude) ||
                latitude < -90 ||
                latitude > 90 ||
                longitude < -180 ||
                longitude > 180
            ) {

                showToast(
                    "Enter valid coordinates",
                    "!"
                );

                return;
            }


            const rows =
                [...demoCommunities]
                    .sort(
                        (a, b) =>
                            Math.hypot(
                                a.latitude -
                                    latitude,
                                a.longitude -
                                    longitude
                            ) -
                            Math.hypot(
                                b.latitude -
                                    latitude,
                                b.longitude -
                                    longitude
                            )
                    )
                    .slice(
                        0,
                        10
                    );


            renderCommunityResults(
                rows
            );
        }
    );


/* =========================================================
   COLLABORATORS
========================================================= */

function renderCollaborators() {

    const container =
        $("#collaboratorList");


    if (!container)
        return;


    const query =
        $("#collabSearch")
            ?.value
            .toLowerCase() || "";


    const rows =
        friends.filter(
            friend =>
                (
                    friend.name +
                    " " +
                    friend.username
                )
                    .toLowerCase()
                    .includes(query)
        );


    container.innerHTML =
        rows
            .map(
                friend => `

                    <label
                        class="
                            collab-row
                            ${
                                selectedCollaborators
                                    .includes(
                                        friend.id
                                    )
                                    ? "selected"
                                    : ""
                            }
                        "
                    >

                        <input
                            type="checkbox"
                            value="${esc(
                                friend.id
                            )}"
                            ${
                                selectedCollaborators
                                    .includes(
                                        friend.id
                                    )
                                    ? "checked"
                                    : ""
                            }
                        >


                        <span class="collab-avatar">

                            ${esc(
                                friend.name[0]
                            )}

                        </span>


                        <span>

                            <strong>
                                ${esc(
                                    friend.name
                                )}
                            </strong>

                            <small>
                                @${esc(
                                    friend.username
                                )}
                            </small>

                        </span>

                    </label>
                `
            )
            .join("");


    $$("#collaboratorList input")
        .forEach(input => {

            input.onchange = () => {

                if (input.checked) {

                    if (
                        !selectedCollaborators
                            .includes(
                                input.value
                            )
                    ) {

                        selectedCollaborators
                            .push(
                                input.value
                            );
                    }

                } else {

                    selectedCollaborators =
                        selectedCollaborators
                            .filter(
                                id =>
                                    id !==
                                    input.value
                            );
                }


                renderCollaborators();

                updateSummary();
            };
        });
}


$("#collabSearch")
    ?.addEventListener(
        "input",
        renderCollaborators
    );


/* =========================================================
   CREATE WORLD
========================================================= */

$("#launchWorld")
    ?.addEventListener(
        "click",
        () => {

            const name =
                $("#worldName")
                    ?.value
                    .trim();


            if (!name) {

                showToast(
                    "Give your world a name",
                    "!"
                );

                return;
            }


            if (!selectedCommunity) {

                showCreateStep(3);

                showToast(
                    "Community selection is required",
                    "!"
                );

                return;
            }


            const difficultyStats = {

                freeplay:
                    [0, 0, 0],

                medium:
                    [0, 0, 5],

                reallife:
                    [0, 0, 8],

                hell:
                    [0, 0, 2]
            };


            const stats =
                difficultyStats[
                    selectedDifficulty
                ];


            const world = {

                id:
                    crypto.randomUUID(),

                name,

                location:
                    selectedCommunity
                        .display_name,

                community:
                    selectedCommunity,

                description:
                    selectedType === "improve"

                        ? "Investigating an existing community using public data and local observations."

                        : "A fictional CivicLens world anchored to a real community.",

                mode:
                    selectedType,

                difficulty:
                    selectedDifficulty,

                problems:
                    stats[0],

                analyses:
                    stats[1],

                progress:
                    stats[2],

                collaborators:
                    [...selectedCollaborators]
            };


            worlds.unshift(
                world
            );


            save();


            closeCreate();

            showToast(
                "World created",
                "✓"
            );
        }
    );


/* =========================================================
   CHAT
========================================================= */

function openChat(id) {

    activeFriend =
        friends.find(
            friend =>
                friend.id === id
        );


    if (!activeFriend)
        return;


    if ($("#chatTitle"))
        $("#chatTitle")
            .textContent =
                activeFriend.name;


    if ($("#chatStatus"))
        $("#chatStatus")
            .textContent =
                activeFriend.status ===
                "online"
                    ? "Online"
                    : "Offline";


    if ($("#chatAvatar"))
        $("#chatAvatar")
            .textContent =
                activeFriend.name[0];


    if ($("#chatInput"))
        $("#chatInput")
            .disabled =
                false;


    if ($("#chatForm button"))
        $("#chatForm button")
            .disabled =
                false;


    renderFriends();

    renderMessages();
}


function renderMessages() {

    if (!activeFriend)
        return;


    const container =
        $("#chatMessages");


    if (!container)
        return;


    const list =
        messages[
            activeFriend.id
        ] || [];


    container.innerHTML =
        list.length

            ? list
                .map(
                    message => `

                        <div
                            class="
                                message
                                ${
                                    message.me
                                        ? "me"
                                        : ""
                                }
                            "
                        >

                            <div
                                class="
                                    message-bubble
                                "
                            >
                                ${esc(
                                    message.text
                                )}
                            </div>

                        </div>
                    `
                )
                .join("")

            : `

                <div class="chat-empty">
                    Start the conversation.
                </div>
            `;


    container.scrollTop =
        container.scrollHeight;
}


$("#chatForm")
    ?.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            if (!activeFriend)
                return;


            const input =
                $("#chatInput");


            const text =
                input
                    ?.value
                    .trim();


            if (!text)
                return;


            if (
                !messages[
                    activeFriend.id
                ]
            ) {

                messages[
                    activeFriend.id
                ] = [];
            }


            messages[
                activeFriend.id
            ].push({

                me:
                    true,

                text
            });


            input.value =
                "";


            save();

            renderMessages();

            updateStats();
        }
    );


/* =========================================================
   ADD FRIEND
========================================================= */

const possiblePeople = [
    ...friends,
    {
        id:
            "p5",
        name:
            "Sam Rivera",
        username:
            "sam.maps",
        code:
            "SAMMAPS"
    },
    {
        id:
            "p6",
        name:
            "Noah Williams",
        username:
            "noahbuilds",
        code:
            "NOAH88"
    }
];


$("#openAddFriend")
    ?.addEventListener(
        "click",
        () => {

            $("#friendModal")
                ?.classList.add(
                    "open"
                );

            document.body.style.overflow =
                "hidden";

            renderFriendSearch("");
        }
    );


$("#closeFriend")
    ?.addEventListener(
        "click",
        () => {

            $("#friendModal")
                ?.classList.remove(
                    "open"
                );

            document.body.style.overflow =
                "";
        }
    );


$("#friendModal")
    ?.addEventListener(
        "click",
        event => {

            if (
                event.target.id ===
                "friendModal"
            ) {

                $("#closeFriend")
                    ?.click();
            }
        }
    );


$("#friendSearch")
    ?.addEventListener(
        "input",
        event => {

            renderFriendSearch(
                event.target.value
            );
        }
    );


function renderFriendSearch(
    query = ""
) {

    const container =
        $("#friendSearchResults");


    if (!container)
        return;


    const rows =
        possiblePeople.filter(
            person =>
                (
                    person.name +
                    " " +
                    person.username +
                    " " +
                    person.code
                )
                    .toLowerCase()
                    .includes(
                        query.toLowerCase()
                    )
        );


    container.innerHTML =
        rows
            .map(person => {

                const exists =
                    friends.some(
                        friend =>
                            friend.username ===
                            person.username
                    );


                return `

                    <div class="search-person">

                        <span class="profile-avatar">

                            ${esc(
                                person.name[0]
                            )}

                        </span>


                        <div>

                            <strong>
                                ${esc(
                                    person.name
                                )}
                            </strong>

                            <small>
                                @${esc(
                                    person.username
                                )}
                                ·
                                ${esc(
                                    person.code
                                )}
                            </small>

                        </div>


                        <button
                            data-person="${esc(
                                person.id
                            )}"
                            ${
                                exists
                                    ? "disabled"
                                    : ""
                            }
                        >

                            ${
                                exists
                                    ? "Added"
                                    : "Add"
                            }

                        </button>

                    </div>
                `;
            })
            .join("");


    $$("[data-person]")
        .forEach(button => {

            button.onclick = () => {

                const person =
                    possiblePeople.find(
                        item =>
                            item.id ===
                            button.dataset.person
                    );


                if (!person)
                    return;


                if (
                    friends.some(
                        friend =>
                            friend.username ===
                            person.username
                    )
                ) {

                    return;
                }


                friends.push({

                    ...person,

                    status:
                        "offline"
                });


                save();

         


                button.disabled =
                    true;

                button.textContent =
                    "Added";


                showToast(
                    `${person.name} added`,
                    "✓"
                );
            };
        });
}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message = "Done",
    icon = "✓"
) {

    const toast =
        $("#toast");


    if (!toast)
        return;


    const iconElement =
        toast.querySelector(
            ".toast-icon"
        );


    const messageElement =
        toast.querySelector(
            "strong"
        );


    if (iconElement)
        iconElement.textContent =
            icon;


    if (messageElement)
        messageElement.textContent =
            message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        window.civicToast
    );


    window.civicToast =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2600
        );
}


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;
        }


        closeCreate();

        $("#closeFriend")
            ?.click();

        closeNotifications();
    }
);


/* =========================================================
   INITIALIZE
========================================================= */
lucide.createIcons();
loadCommunities("");


initUser();