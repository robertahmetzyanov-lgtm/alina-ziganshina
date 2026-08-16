const burger = document.querySelector(".burger");
const mobileNav = document.getElementById("mobile-nav");

function setMobileNavOpen(isOpen) {
  if (!burger || !mobileNav) {
    return;
  }

  burger.setAttribute("aria-expanded", String(isOpen));
  mobileNav.setAttribute("aria-hidden", String(!isOpen));
  mobileNav.classList.toggle("is-open", isOpen);
  document.body.classList.toggle("menu-open", isOpen);
}

if (burger && mobileNav) {
  burger.addEventListener("click", () => {
    const isOpen = burger.getAttribute("aria-expanded") === "true";
    setMobileNavOpen(!isOpen);
  });

  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      setMobileNavOpen(false);
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMobileNavOpen(false);
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 720) {
      setMobileNavOpen(false);
    }
  });
}

const filters = document.querySelectorAll(".filter");
const portfolioItems = document.querySelectorAll(".portfolio__item");

filters.forEach((filter) => {
  filter.addEventListener("click", () => {
    const value = filter.dataset.filter;

    filters.forEach((btn) => btn.classList.remove("is-active"));
    filter.classList.add("is-active");

    portfolioItems.forEach((item) => {
      const category = item.dataset.category;
      const show = value === "all" || category === value;
      item.classList.toggle("is-hidden", !show);
    });
  });
});
