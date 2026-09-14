document.addEventListener("DOMContentLoaded", () => {


    const cityCard = document.querySelector(".city-card");
    const markers = document.querySelectorAll(".map-marker");

    if (cityCard) {
        cityCard.addEventListener("mousemove", (event) => {

            const rect = cityCard.getBoundingClientRect();

            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const rotateX = ((y / rect.height) - 0.5) * -2;
            const rotateY = ((x / rect.width) - 0.5) * 2;

            cityCard.style.transform =
                `rotate(2deg) perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        cityCard.addEventListener("mouseleave", () => {
            cityCard.style.transform = "";
        });
    }


    markers.forEach(marker => {

        marker.addEventListener("mouseenter", () => {
            marker.style.animationPlayState = "paused";
            marker.style.scale = "1.18";
        });

        marker.addEventListener("mouseleave", () => {
            marker.style.animationPlayState = "running";
            marker.style.scale = "1";
        });

    });
    const revealElements = document.querySelectorAll(
        ".step-card, .experiment-board, .discovery-item"
    );

    const observer = new IntersectionObserver(
        entries => {

            entries.forEach(entry => {

                if (!entry.isIntersecting) return;

                entry.target.classList.add("revealed");
                observer.unobserve(entry.target);

            });

        },
        {
            threshold: 0.15
        }
    );

    revealElements.forEach(element => {
        element.classList.add("reveal");
        observer.observe(element);
    });

});