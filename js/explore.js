/* =========================================================
   CIVICLENS EXPLORE
========================================================= */


/* =========================================================
   CITY DATA
========================================================= */

const cityData = {

    "Greenfield": {
        title: "Greenfield: A City That Breathes",
        description:
            "A city experiment focused on connecting parks, housing, schools, and transportation instead of treating them as separate problems.",
        cost: "$8.4B",
        budget: "$10.0B",
        population: "142K",
        quality: "91%",
        education: "89%",
        safety: "86%",
        likes: "342",
        comments: "48"
    },

    "Sunrise Valley": {
        title: "Sunrise Valley",
        description:
            "A custom-built community designed around walkability, affordable housing, and easy access to green space.",
        cost: "$4.2B",
        budget: "$5.0B",
        population: "84K",
        quality: "88%",
        education: "85%",
        safety: "82%",
        likes: "271",
        comments: "31"
    },

    "Newark Reimagined": {
        title: "Newark Reimagined",
        description:
            "A real-world experiment exploring what could happen when development, transportation, parks, and public spaces are redesigned together.",
        cost: "$7.8B",
        budget: "$8.5B",
        population: "311K",
        quality: "84%",
        education: "81%",
        safety: "76%",
        likes: "418",
        comments: "67"
    },

    "Harbor City": {
        title: "Harbor City",
        description:
            "A small custom city built around waterfront access, compact neighborhoods, local businesses, and public spaces.",
        cost: "$2.9B",
        budget: "$3.5B",
        population: "51K",
        quality: "87%",
        education: "84%",
        safety: "90%",
        likes: "195",
        comments: "22"
    },

    "Transit First": {
        title: "Transit First",
        description:
            "What if public transportation came first and the rest of the city grew around it?",
        cost: "$9.1B",
        budget: "$11.0B",
        population: "224K",
        quality: "90%",
        education: "86%",
        safety: "88%",
        likes: "523",
        comments: "82"
    },

    "Little Planet": {
        title: "Little Planet",
        description:
            "A tiny custom city focused on community, neighborhood parks, accessible services, and keeping things close together.",
        cost: "$1.6B",
        budget: "$2.0B",
        population: "29K",
        quality: "93%",
        education: "91%",
        safety: "94%",
        likes: "147",
        comments: "19"
    },

    "More Parks Please": {
        title: "More Parks Please",
        description:
            "A real-world city experiment asking a simple question: what happens when access to nature becomes a major planning priority?",
        cost: "$6.5B",
        budget: "$7.2B",
        population: "178K",
        quality: "89%",
        education: "83%",
        safety: "87%",
        likes: "389",
        comments: "54"
    }
};


/* =========================================================
   ELEMENTS
========================================================= */

const citySearch = document.getElementById("citySearch");
const cityGrid = document.getElementById("cityGrid");
const noResults = document.getElementById("noResults");

const filterButtons = document.querySelectorAll(".filter-button");
const sortCities = document.getElementById("sortCities");

const cityCards = Array.from(
    document.querySelectorAll(".city-card")
);


/* =========================================================
   CURRENT FILTER
========================================================= */

let currentFilter = "all";


/* =========================================================
   FILTER BUTTONS
========================================================= */

filterButtons.forEach(button => {

    button.addEventListener("click", () => {

        filterButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        currentFilter = button.dataset.filter;

        updateCities();
    });

});


/* =========================================================
   SEARCH
========================================================= */

citySearch.addEventListener("input", () => {
    updateCities();
});


/* =========================================================
   SORTING
========================================================= */

sortCities.addEventListener("change", () => {
    updateCities();
});


/* =========================================================
   UPDATE CITY GRID
========================================================= */

function updateCities() {

    const searchTerm =
        citySearch.value.trim().toLowerCase();

    let visibleCards = [];

    cityCards.forEach(card => {

        const type = card.dataset.type;
        const name = card.dataset.name.toLowerCase();
        const creator = card.dataset.creator.toLowerCase();

        const matchesFilter =
            currentFilter === "all" ||
            currentFilter === type;

        const matchesSearch =
            !searchTerm ||
            name.includes(searchTerm) ||
            creator.includes(searchTerm);

        const shouldShow =
            matchesFilter && matchesSearch;

        card.style.display =
            shouldShow ? "" : "none";

        if (shouldShow) {
            visibleCards.push(card);
        }
    });


    /* SORT */

    visibleCards.sort((a, b) => {

        const sortType = sortCities.value;

        if (sortType === "likes") {
            return (
                Number(b.dataset.likes) -
                Number(a.dataset.likes)
            );
        }

        if (sortType === "population") {
            return (
                Number(b.dataset.population) -
                Number(a.dataset.population)
            );
        }

        if (sortType === "recent") {
            return (
                Number(b.dataset.date) -
                Number(a.dataset.date)
            );
        }

        return (
            Number(b.dataset.likes) -
            Number(a.dataset.likes)
        );
    });


    visibleCards.forEach(card => {
        cityGrid.appendChild(card);
    });


    noResults.style.display =
        visibleCards.length === 0
            ? "block"
            : "none";
}


/* =========================================================
   CITY MODAL
========================================================= */

const cityModal = document.getElementById("cityModal");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");

const modalTitle =
    document.getElementById("modalTitle");

const modalDescription =
    document.getElementById("modalDescription");

const modalCost =
    document.getElementById("modalCost");

const modalBudget =
    document.getElementById("modalBudget");

const modalPopulation =
    document.getElementById("modalPopulation");

const modalQuality =
    document.getElementById("modalQuality");

const modalEducation =
    document.getElementById("modalEducation");

const modalSafety =
    document.getElementById("modalSafety");

const modalLikes =
    document.getElementById("modalLikes");

const modalComments =
    document.getElementById("modalComments");


/* =========================================================
   OPEN MODAL
========================================================= */

function openCity(cityName) {

    const city = cityData[cityName];

    if (!city) {
        return;
    }

    modalTitle.textContent = city.title;
    modalDescription.textContent = city.description;

    modalCost.textContent = city.cost;
    modalBudget.textContent = city.budget;
    modalPopulation.textContent = city.population;

    modalQuality.textContent = city.quality;
    modalEducation.textContent = city.education;
    modalSafety.textContent = city.safety;

    modalLikes.textContent = city.likes;
    modalComments.textContent = city.comments;

    cityModal.classList.add("open");

    document.body.style.overflow = "hidden";
}


/* =========================================================
   CITY BUTTONS
========================================================= */

document.querySelectorAll(
    "[data-city]"
).forEach(button => {

    button.addEventListener("click", () => {

        const cityName =
            button.dataset.city;

        openCity(cityName);
    });

});


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    cityModal.classList.remove("open");

    document.body.style.overflow = "";
}


modalClose.addEventListener(
    "click",
    closeModal
);

modalOverlay.addEventListener(
    "click",
    closeModal
);


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            cityModal.classList.contains("open")
        ) {
            closeModal();
        }

    }
);


document.querySelectorAll(
    ".modal-build"
).forEach(button => {

    button.addEventListener("click", () => {

        window.location.href =
            "login.html?mode=signup";
    });

});


updateCities();