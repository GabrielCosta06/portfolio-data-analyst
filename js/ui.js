export function initUI({ state, certificates, t, onLanguageChange }) {
  document.documentElement.classList.add("has-js");

  const navToggle = document.getElementById("nav-toggle");
  const navMenu = document.getElementById("nav-menu");
  const navOverlay = document.querySelector(".nav__overlay");
  const navLinks = Array.from(document.querySelectorAll(".nav__link[data-nav]"));
  const langSelect = document.getElementById("lang-select");
  const certList = document.getElementById("cert-list");
  const certSearch = document.getElementById("cert-search");
  const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
  const toast = document.getElementById("toast");
  const modal = document.getElementById("case-study-modal");
  const modalOpenButton = document.querySelector("[data-modal-open]");
  const modalCloseButtons = Array.from(document.querySelectorAll("[data-modal-close]"));

  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobileQuery = window.matchMedia && window.matchMedia("(max-width: 900px)");

  let focusTrapCleanup = null;
  let lastFocusedElement = null;

  function isNavOpen() {
    return navMenu && navMenu.classList.contains("nav__menu--open");
  }

  function setNavToggleLabel(open) {
    if (!navToggle) return;
    navToggle.setAttribute("aria-label", open ? t("nav.menuClose") : t("nav.menuOpen"));
  }

  function setNavAria() {
    if (!navMenu) return;
    if (mobileQuery && mobileQuery.matches) {
      navMenu.setAttribute("aria-hidden", isNavOpen() ? "false" : "true");
    } else {
      navMenu.setAttribute("aria-hidden", "false");
    }
  }

  function openNav() {
    if (!navMenu) return;
    navMenu.classList.add("nav__menu--open");
    document.body.classList.add("is-nav-open");
    if (navToggle) navToggle.setAttribute("aria-expanded", "true");
    setNavToggleLabel(true);
    setNavAria();
    lastFocusedElement = document.activeElement;
    activateFocusTrap(navMenu, navMenu.querySelector("a, button, select"));
  }

  function closeNav() {
    if (!navMenu) return;
    navMenu.classList.remove("nav__menu--open");
    document.body.classList.remove("is-nav-open");
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
    setNavToggleLabel(false);
    setNavAria();
    deactivateFocusTrap();
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }

  function getFocusable(container) {
    return Array.from(
      container.querySelectorAll(
        "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
      )
    );
  }

  function activateFocusTrap(container, initialFocus) {
    deactivateFocusTrap();
    const focusable = getFocusable(container);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleKeydown = (event) => {
      if (event.key !== "Tab") return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    focusTrapCleanup = () => document.removeEventListener("keydown", handleKeydown);
    (initialFocus || first).focus();
  }

  function deactivateFocusTrap() {
    if (focusTrapCleanup) {
      focusTrapCleanup();
      focusTrapCleanup = null;
    }
  }

  function isModalOpen() {
    return modal && modal.classList.contains("modal--open");
  }

  function openModal() {
    if (!modal) return;
    modal.classList.add("modal--open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-modal-open");
    lastFocusedElement = document.activeElement;
    const closeButton = modal.querySelector("[data-modal-close]");
    activateFocusTrap(modal, closeButton);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("modal--open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-modal-open");
    deactivateFocusTrap();
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }

  function createCertCard(cert) {
    const article = document.createElement("article");
    article.className = "card cert-card";
    article.id = cert.id;

    const title = document.createElement("h3");
    title.className = "cert-card__title";
    title.textContent = cert.title[state.lang];

    const meta = document.createElement("p");
    meta.className = "cert-card__meta";
    meta.textContent = `${cert.issuer[state.lang]} - ${cert.date[state.lang]}`;

    const desc = document.createElement("p");
    desc.className = "cert-card__desc";
    desc.textContent = cert.shortDesc[state.lang];

    const actions = document.createElement("div");
    actions.className = "cert-card__actions";

    const view = document.createElement("a");
    view.className = "button button--ghost";
    view.href = cert.url;
    view.target = "_blank";
    view.rel = "noopener noreferrer";
    view.textContent = t("cert.card.viewCredential");

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "button button--secondary";
    copy.textContent = t("cert.card.copyLink");
    copy.setAttribute("data-copy-link", cert.id);

    actions.append(view, copy);
    article.append(title, meta, desc, actions);

    return article;
  }

  function renderCertificates() {
    if (!certList) return;
    certList.innerHTML = "";

    const searchTerm = state.search.trim().toLowerCase();
    const filtered = certificates.filter((cert) => {
      const matchesFilter = state.filter === "all" || cert.tags.includes(state.filter);
      const matchesSearch = !searchTerm || cert.searchIndex.includes(searchTerm);
      return matchesFilter && matchesSearch;
    });

    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = t("cert.empty");
      certList.append(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach((cert) => fragment.append(createCertCard(cert)));
    certList.append(fragment);
  }

  function buildCertUrl(certId) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", state.lang);
    url.hash = certId ? `#${certId}` : "";
    return url.toString();
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        return false;
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.focus();
    textarea.select();

    try {
      const success = document.execCommand("copy");
      textarea.remove();
      return success;
    } catch (err) {
      textarea.remove();
      return false;
    }
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("toast--show");
    window.clearTimeout(toast._timeout);
    toast._timeout = window.setTimeout(() => {
      toast.classList.remove("toast--show");
    }, 2400);
  }

  function highlightFromHash(options = {}) {
    const { scroll = true } = options;
    const id = window.location.hash.replace("#", "");
    if (!id || !id.startsWith("cert-")) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("cert-card--highlight");

    if (scroll) {
      el.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "center",
      });
    }

    window.setTimeout(() => {
      el.classList.remove("cert-card--highlight");
    }, 4000);
  }

  function initNavObserver() {
    const sections = Array.from(document.querySelectorAll("main section[id]"));
    if (!sections.length || !navLinks.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navLinks.forEach((link) => {
            const matches = link.getAttribute("href") === `#${id}`;
            link.classList.toggle("nav__link--active", matches);
            if (matches) {
              link.setAttribute("aria-current", "page");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      },
      {
        rootMargin: "-45% 0px -45% 0px",
        threshold: 0.01,
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  if (langSelect) {
    langSelect.addEventListener("change", (event) => {
      onLanguageChange(event.target.value);
    });
  }

  if (navToggle) {
    navToggle.addEventListener("click", () => {
      if (isNavOpen()) {
        closeNav();
      } else {
        openNav();
      }
    });
  }

  if (navOverlay) {
    navOverlay.addEventListener("click", closeNav);
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (isNavOpen()) closeNav();
    });
  });

  if (certSearch) {
    certSearch.addEventListener("input", (event) => {
      state.search = event.target.value;
      renderCertificates();
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.getAttribute("data-filter");
      state.filter = filter || "all";
      filterButtons.forEach((btn) => {
        const isActive = btn === button;
        btn.classList.toggle("filters__button--active", isActive);
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
      renderCertificates();
    });
  });

  if (certList) {
    certList.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-copy-link]");
      if (!button) return;
      const certId = button.getAttribute("data-copy-link");
      const url = buildCertUrl(certId);
      const success = await copyText(url);
      showToast(success ? t("cert.card.copied") : t("cert.card.copyLink"));
    });
  }

  const copyEmailButton = document.querySelector("[data-copy-email]");
  if (copyEmailButton) {
    copyEmailButton.addEventListener("click", async () => {
      const email = copyEmailButton.getAttribute("data-email");
      if (!email) return;
      const success = await copyText(email);
      showToast(success ? t("contact.copied") : t("contact.copyEmail"));
    });
  }

  if (modalOpenButton) {
    modalOpenButton.addEventListener("click", openModal);
  }

  modalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (isModalOpen()) {
      closeModal();
      return;
    }
    if (isNavOpen()) {
      closeNav();
    }
  });

  if (mobileQuery && mobileQuery.addEventListener) {
    mobileQuery.addEventListener("change", setNavAria);
  }

  window.addEventListener("hashchange", () => {
    highlightFromHash({ scroll: true });
  });

  initNavObserver();
  setNavAria();

  return {
    setNavToggleLabel,
    setNavAria,
    renderCertificates,
    highlightFromHash,
    updateLangSelect: (lang) => {
      if (langSelect) {
        langSelect.value = lang;
      }
    },
    isNavOpen,
  };
}
