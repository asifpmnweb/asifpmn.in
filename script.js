function toggleMenu() {
  const menu = document.querySelector(".menu-links");
  const icon = document.querySelector(".hamburger-icon");
  menu.classList.toggle("open");
  icon.classList.toggle("open");
}

const profileSection = document.querySelector("#profile");

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      profileSection.classList.add("animate");
    }
  });
}, { threshold: 0.5 });

observer.observe(profileSection);

document.addEventListener("DOMContentLoaded", () => {
  gsap.from("#profile", { 
    opacity: 0, 
    y: 50, 
    duration: 1, 
    ease: "power2.out" 
  });
});
