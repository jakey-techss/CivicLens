

const defaultWorlds = [
    {
        id: crypto.randomUUID(),
        name: "Newark Safety Hunt",
        location: "Newark, NJ",
        description: "Exploring road safety and community-reported problems.",
        mode: "improve",
        difficulty: "reallife",
        problems: 8,
        analyses: 14,
        progress: 68,
        lastActivity: "12 minutes ago"
    },

    {
        id: crypto.randomUUID(),
        name: "Downtown Crossings",
        location: "Newark, NJ",
        description: "Investigating pedestrian crossings and intersections.",
        mode: "scratch",
        difficulty: "medium",
        problems: 4,
        analyses: 7,
        progress: 42,
        lastActivity: "Yesterday"
    },

    {
        id: crypto.randomUUID(),
        name: "The Sidewalk Project",
        location: "Vailsburg",
        description: "Mapping accessibility problems around the neighborhood.",
        mode: "improve",
        difficulty: "freeplay",
        problems: 12,
        analyses: 19,
        progress: 84,
        lastActivity: "3 days ago"
    }
];



let worlds = JSON.parse(
    localStorage.getItem("civiclens_worlds")
);

if (!worlds) {
    worlds = defaultWorlds;

    saveWorlds();
}

let selectedType = "scratch";
let selectedDifficulty = "freeplay";

let currentStep = 1;


const worldGrid =
    document.getElementById("worldGrid");

const emptyState =
    document.getElementById("emptyState");

const worldCount =
    document.getElementById("worldCount");

const problemCount =
    document.getElementById("problemCount");

const analysisCount =
    document.getElementById("analysisCount");

const activityCount =
    document.getElementById("activityCount");

const modal =
    document.getElementById("createModal");

const worldName =
    document.getElementById("worldName");

const communityName =
    document.getElementById("communityName");

const summaryMode =
    document.getElementById("summaryMode");

const summaryDifficulty =
    document.getElementById("summaryDifficulty");



function saveWorlds() {

    localStorage.setItem(
        "civiclens_worlds",
        JSON.stringify(worlds)
    );
}


function renderWorlds() {

    worldGrid.innerHTML = "";

    if (worlds.length === 0) {

        worldGrid.style.display = "none";

        emptyState.classList.add("visible");

        updateStats();

        return;
    }

    worldGrid.style.display = "grid";

    emptyState.classList.remove("visible");


    worlds.forEach((world, index) => {

        const card =
            document.createElement("article");

        card.className = "world-card";

        card.dataset.id = world.id;


        const map = createMapPreview(index);


        card.innerHTML = `

            ${map}

            <div class="world-content">

                <div class="world-top">

                    <div>

                        <h3 class="world-title">
                            ${escapeHTML(world.name)}
                        </h3>

                        <div class="world-location">

                            <span class="location-dot"></span>

                            ${escapeHTML(
            world.location || "Personal World"
        )}

                        </div>

                    </div>

                    <button
                        class="more-button"
                        aria-label="More options"
                        data-id="${world.id}"
                        style= "display:flex; align-items:center; justify-content:center;"
                    >
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="delete-icon">
  <path d="M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M9 7V4H15V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M18 7L17.2 19C17.13 20.12 16.2 21 15.08 21H8.92C7.8 21 6.87 20.12 6.8 19L6 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>
                    </button>

                </div>


                <p class="world-description">
                    ${escapeHTML(world.description)}
                </p>


                <div class="world-tags">

                    <span class="world-tag">
                        ${getModeLabel(world.mode)}
                    </span>

                    <span class="world-tag">
                        ${getDifficultyLabel(world.difficulty)}
                    </span>

                    <span class="world-tag">
                        ${world.problems} problems
                    </span>

                </div>


                <div class="world-footer">

                    <button
                        class="world-open"
                        aria-label="Open world"
                    >
                        ↗
                    </button>

                </div>

            </div>
        `;


        card.addEventListener("click", (event) => {

            if (
                event.target.closest(".more-button")
            ) {
                return;
            }

            openWorld(world.id);

        });


        const moreButton =
            card.querySelector(".more-button");

        moreButton.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                showWorldMenu(world.id);
            }
        );


        worldGrid.appendChild(card);

    });


    updateStats();
}

function createMapPreview(index) {

    const mapTypes = [
        "city",
        "coast",
        "mountain",
        "wilderness",
        "desert",
        "chaos"
    ];

    const type = mapTypes[index % mapTypes.length];

    const configs = {

        city: {
            blocks: 4,
            parks: 1,
            roads: 2,
            pins: 3
        },

        coast: {
            blocks: 2,
            parks: 1,
            roads: 1,
            pins: 2
        },

        mountain: {
            blocks: 2,
            parks: 2,
            roads: 1,
            pins: 2
        },

        wilderness: {
            blocks: 1,
            parks: 3,
            roads: 1,
            pins: 2
        },

        desert: {
            blocks: 2,
            parks: 0,
            roads: 2,
            pins: 1
        },

        chaos: {
            blocks: 4,
            parks: 1,
            roads: 2,
            pins: 3
        }

    };

    const config = configs[type];


    /* ----------------------------- */
    /* BLOCKS */
    /* ----------------------------- */

    let blocks = "";

    for (let i = 1; i <= config.blocks; i++) {
        blocks += `
            <div class="map-block block-${i}"></div>
        `;
    }


    /* ----------------------------- */
    /* PARKS */
    /* ----------------------------- */

    let parks = "";

    for (let i = 0; i < config.parks; i++) {

        parks += `
            <div class="map-park park-${i + 1}"></div>
        `;

    }


    /* ----------------------------- */
    /* ROADS */
    /* ----------------------------- */

    let roads = "";

    if (config.roads >= 1) {
        roads += `
            <div class="map-road horizontal"></div>
        `;
    }

    if (config.roads >= 2) {
        roads += `
            <div class="map-road vertical"></div>
        `;
    }


    /* ----------------------------- */
    /* PINS */
    /* ----------------------------- */

    const pinClasses = [
        "pin-a",
        "pin-b",
        "pin-c"
    ];

    const symbols = [
        "!",
        "?",
        "+"
    ];

    let pins = "";

    for (let i = 0; i < config.pins; i++) {

        pins += `
            <div class="map-pin ${pinClasses[i]}">
                <span>${symbols[i]}</span>
            </div>
        `;

    }


    return `

        <div class="world-map map-${type}">

            ${blocks}

            ${parks}

            ${roads}

            ${pins}

        </div>

    `;
}


function updateStats() {

    const problems =
        worlds.reduce(
            (sum, world) =>
                sum + Number(world.problems || 0),
            0
        );

    const analyses =
        worlds.reduce(
            (sum, world) =>
                sum + Number(world.analyses || 0),
            0
        );

    worldCount.textContent =
        worlds.length;

    problemCount.textContent =
        problems;

    analysisCount.textContent =
        analyses;

    activityCount.textContent =
        worlds.length
            ? problems + analyses
            : 0;
}


document
    .getElementById("openCreate")
    .addEventListener(
        "click",
        openCreateModal
    );


document
    .getElementById("emptyCreate")
    .addEventListener(
        "click",
        openCreateModal
    );


document
    .getElementById("closeCreate")
    .addEventListener(
        "click",
        closeCreateModal
    );


modal.addEventListener(
    "click",
    (event) => {

        if (
            event.target === modal
        ) {
            closeCreateModal();
        }

    }
);


function openCreateModal() {

    modal.classList.add("open");

    document.body.style.overflow = "hidden";

    currentStep = 1;

    resetCreateForm();

    showStep(1);
}


function closeCreateModal() {

    modal.classList.remove("open");

    document.body.style.overflow = "";

}


function resetCreateForm() {

    selectedType = "scratch";

    selectedDifficulty = "freeplay";

    worldName.value = "";

    communityName.value = "";

    document
        .querySelectorAll(".world-type")
        .forEach(button => {

            button.classList.toggle(
                "selected",
                button.dataset.type === selectedType
            );

        });


    document
        .querySelectorAll(".difficulty")
        .forEach(button => {

            button.classList.toggle(
                "selected",
                button.dataset.difficulty === selectedDifficulty
            );

        });


    updateSummary();
}

document
    .querySelectorAll("[data-next]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const next =
                    Number(button.dataset.next);

                if (
                    currentStep === 3
                ) {
                    return;
                }

                currentStep = next;

                showStep(currentStep);

            }
        );

    });


document
    .querySelectorAll("[data-back]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                currentStep =
                    Number(button.dataset.back);

                showStep(currentStep);

            }
        );

    });


function showStep(step) {

    document
        .querySelectorAll(".modal-step")
        .forEach(element => {

            element.classList.toggle(
                "active",
                Number(element.dataset.step) === step
            );

        });


    document
        .querySelectorAll(".progress-dot")
        .forEach((dot, index) => {

            dot.classList.toggle(
                "active",
                index <= step - 1
            );

        });


    updateSummary();
}



document
    .querySelectorAll(".world-type")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                selectedType =
                    button.dataset.type;

                document
                    .querySelectorAll(".world-type")
                    .forEach(option => {

                        option.classList.toggle(
                            "selected",
                            option === button
                        );

                    });

                updateSummary();

            }
        );

    });



document
    .querySelectorAll(".difficulty")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                selectedDifficulty =
                    button.dataset.difficulty;

                document
                    .querySelectorAll(".difficulty")
                    .forEach(option => {

                        option.classList.toggle(
                            "selected",
                            option === button
                        );

                    });

                updateSummary();

            }
        );

    });



function updateSummary() {

    summaryMode.textContent =
        getModeLabel(selectedType);

    summaryDifficulty.textContent =
        getDifficultyLabel(selectedDifficulty);
}


function getModeLabel(mode) {

    const labels = {

        scratch:
            "Start from Scratch",

        improve:
            "Improve the World Around You"

    };

    return labels[mode] || mode;
}


function getDifficultyLabel(difficulty) {

    const labels = {

        freeplay:
            "Free-play",

        medium:
            "Medium",

        reallife:
            "Real Life",

        hell:
            "Hell Mode"

    };

    return labels[difficulty] || difficulty;
}


document
    .getElementById("launchWorld")
    .addEventListener(
        "click",
        createWorld
    );


function createWorld() {

    let name =
        worldName.value.trim();

    let location =
        communityName.value.trim();


    if (!name) {

        worldName.focus();

        worldName.style.borderColor =
            "var(--orange)";

        setTimeout(() => {

            worldName.style.borderColor =
                "";

        }, 1000);

        return;
    }


    if (!location) {

        location =
            selectedType === "improve"
                ? "Your Community"
                : "Personal World";

    }


    const difficultyData = {

        freeplay: {
            problems: 0,
            analyses: 0,
            progress: 0
        },

        medium: {
            problems: 0,
            analyses: 0,
            progress: 5
        },

        reallife: {
            problems: 0,
            analyses: 0,
            progress: 8
        },

        hell: {
            problems: 0,
            analyses: 0,
            progress: 2
        }

    };


    const world =
        difficultyData[selectedDifficulty];


    const newWorld = {

        id: crypto.randomUUID(),

        name,

        location,

        description:
            selectedType === "improve"
                ? "Investigating your community using public data and local observations."
                : "A blank CivicLens world ready for your next investigation.",

        mode:
            selectedType,

        difficulty:
            selectedDifficulty,

        problems:
            world.problems,

        analyses:
            world.analyses,

        progress:
            world.progress,

        lastActivity:
            "Just now"

    };


    worlds.unshift(newWorld);

    saveWorlds();

    renderWorlds();

    closeCreateModal();

    showToast();

}


/* -------------------------------- */
/* OPEN WORLD */
/* -------------------------------- */

function openWorld(id) {

    const world =
        worlds.find(
            world => world.id === id
        );

    if (!world) return;


    showToast(
        `Opening ${world.name}...`,
        "🗺️"
    );
}


function showWorldMenu(id) {

    const world =
        worlds.find(
            world => world.id === id
        );

    if (!world) return;


    const shouldDelete =
        confirm(
            `Delete "${world.name}"?`
        );


    if (!shouldDelete) return;


    worlds =
        worlds.filter(
            world => world.id !== id
        );

    saveWorlds();

    renderWorlds();

    showToast(
        "World deleted.",
        "🗑️"
    );
}


/* -------------------------------- */
/* TOAST */
/* -------------------------------- */

function showToast(
    message = "World created!",
    icon = "✨"
) {

    const toast =
        document.getElementById("toast");

    const iconElement =
        toast.querySelector(".toast-icon");

    const title =
        toast.querySelector("strong");

    const description =
        toast.querySelector("div span");


    iconElement.textContent = icon;

    title.textContent = message;

    description.textContent =
        "Your CivicLens universe is ready.";


    toast.classList.add("show");


    clearTimeout(
        window.civicToastTimeout
    );


    window.civicToastTimeout =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );
}



document
    .querySelectorAll(".view-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".view-button")
                    .forEach(btn => {

                        btn.classList.remove(
                            "active"
                        );

                    });


                button.classList.add("active");


                const view =
                    button.dataset.view;


                if (view === "list") {

                    worldGrid.classList.add(
                        "list-view"
                    );

                } else {

                    worldGrid.classList.remove(
                        "list-view"
                    );

                }

            }
        );

    });


function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}




document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            modal.classList.contains("open")
        ) {
            closeCreateModal();
        }

    }
);


renderWorlds();