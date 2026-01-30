"use strict";

const i18n = {
  "meta.title": {
    en: "Gabriel Costa | Data Analyst Portfolio",
    "pt-BR": "Gabriel Costa | Portfólio de Analista de Dados",
  },
  "meta.description": {
    en: "Junior Data Analyst portfolio with projects, certificates, and resume.",
    "pt-BR": "Portfólio de Analista de Dados Júnior com projetos, certificados e currículo.",
  },
  "nav.skip": { en: "Skip to content", "pt-BR": "Pular para o conteúdo" },
  "nav.about": { en: "About", "pt-BR": "Sobre" },
  "nav.projects": { en: "Projects", "pt-BR": "Projetos" },
  "nav.certificates": { en: "Certificates", "pt-BR": "Certificados" },
  "nav.resume": { en: "Resume", "pt-BR": "Currículo" },
  "nav.contact": { en: "Contact", "pt-BR": "Contato" },
  "nav.downloadResume": { en: "Download Resume (PDF)", "pt-BR": "Baixar Currículo (PDF)" },
  "nav.linkedinLabel": { en: "LinkedIn profile", "pt-BR": "Perfil no LinkedIn" },
  "nav.langLabel": { en: "Language", "pt-BR": "Idioma" },
  "nav.langToggle": { en: "EN / PT", "pt-BR": "EN / PT" },
  "nav.langOptionEn": { en: "English", "pt-BR": "Inglês" },
  "nav.langOptionPt": { en: "Português (BR)", "pt-BR": "Português (BR)" },
  "nav.menuOpen": { en: "Open navigation menu", "pt-BR": "Abrir menu de navegação" },
  "nav.menuClose": { en: "Close navigation menu", "pt-BR": "Fechar menu de navegação" },
  "hero.eyebrow": { en: "Brazil - Junior Data Analyst", "pt-BR": "Brasil - Analista de Dados Júnior" },
  "hero.title": {
    en: "Junior Data Analyst | Power BI | Python | SQL",
    "pt-BR": "Analista de Dados Júnior | Power BI | Python | SQL",
  },
  "hero.subtitle": {
    en: "I turn messy data into clear, actionable insights with dashboards, automation, and clean pipelines.",
    "pt-BR": "Transformo dados confusos em insights claros e acionáveis com dashboards, automação e pipelines limpos.",
  },
  "hero.ctaProjects": { en: "View Projects", "pt-BR": "Ver Projetos" },
  "hero.ctaCerts": { en: "Certificates", "pt-BR": "Certificados" },
  "hero.meta1": { en: "Location: Brazil", "pt-BR": "Localização: Brasil" },
  "hero.meta2": { en: "Open to internships and junior roles", "pt-BR": "Aberto a estágios e posições júnior" },
  "hero.cardTitle": { en: "What I deliver", "pt-BR": "O que eu entrego" },
  "hero.cardItem1": { en: "Automated reporting that reduces manual work", "pt-BR": "Relatórios automatizados que reduzem trabalho manual" },
  "hero.cardItem2": { en: "KPI dashboards with clear performance tracking", "pt-BR": "Dashboards de KPIs com acompanhamento claro de desempenho" },
  "hero.cardItem3": { en: "Data stories that align teams quickly", "pt-BR": "Narrativas de dados que alinham times rapidamente" },
  "about.title": { en: "About", "pt-BR": "Sobre" },
  "about.subtitle": {
    en: "Junior analyst focused on reliable reporting, clean data models, and stakeholder-friendly insights.",
    "pt-BR": "Analista júnior focado em relatórios confiáveis, modelos de dados limpos e insights para stakeholders.",
  },
  "about.bullet1": { en: "Automated reporting and reduced manual work", "pt-BR": "Automatizei relatórios e reduzi trabalho manual" },
  "about.bullet2": { en: "Built KPI dashboards and data pipelines", "pt-BR": "Criei dashboards de KPIs e pipelines de dados" },
  "about.bullet3": { en: "Comfortable with cross-functional data", "pt-BR": "Confortável com dados de áreas diferentes" },
  "about.stackTitle": { en: "Tech stack", "pt-BR": "Stack de tecnologia" },
  "projects.title": { en: "Projects", "pt-BR": "Projetos" },
  "projects.subtitle": {
    en: "Selected work focused on business performance visibility and automation.",
    "pt-BR": "Trabalhos selecionados com foco em visibilidade de performance e automação.",
  },
  "projects.featuredTag": { en: "Featured", "pt-BR": "Destaque" },
  "project.featured.title": {
    en: "End-to-End Business Performance Monitoring System",
    "pt-BR": "Sistema de Monitoramento de Performance de Negócios de Ponta a Ponta",
  },
  "project.featured.highlight1": {
    en: "ETL pipeline consolidating multi-source data",
    "pt-BR": "Pipeline ETL consolidando dados de múltiplas fontes",
  },
  "project.featured.highlight2": {
    en: "Power BI dashboard with KPI drill-downs",
    "pt-BR": "Dashboard em Power BI com detalhamento de KPIs",
  },
  "project.featured.highlight3": {
    en: "Alert automation for anomalies and SLA risks",
    "pt-BR": "Automação de alertas para anomalias e riscos de SLA",
  },
  "project.featured.viewRepo": { en: "View Repo", "pt-BR": "Ver Repositório" },
  "project.featured.viewDashboard": { en: "View Dashboard", "pt-BR": "Ver Dashboard" },
  "project.featured.readCaseStudy": { en: "Read Case Study", "pt-BR": "Ler Estudo de Caso" },
  "project.placeholder1.title": { en: "Sales Forecasting Pipeline", "pt-BR": "Pipeline de Previsão de Vendas" },
  "project.placeholder1.desc": {
    en: "Baseline forecasting with time-series features and monthly performance checks.",
    "pt-BR": "Previsão base com séries temporais e checagens mensais de performance.",
  },
  "project.placeholder2.title": { en: "Customer Retention Dashboard", "pt-BR": "Dashboard de Retenção de Clientes" },
  "project.placeholder2.desc": {
    en: "Cohort analysis with churn indicators and actionable segments.",
    "pt-BR": "Análise de coortes com indicadores de churn e segmentos acionáveis.",
  },
  "project.screenshot1": { en: "Dashboard screenshot placeholder", "pt-BR": "Placeholder de captura do dashboard" },
  "project.screenshot2": { en: "Pipeline screenshot placeholder", "pt-BR": "Placeholder de captura do pipeline" },
  "project.screenshot3": { en: "Alerting screenshot placeholder", "pt-BR": "Placeholder de captura de alertas" },
  "project.caseStudy.title": { en: "Case Study", "pt-BR": "Estudo de Caso" },
  "project.caseStudy.closeLabel": { en: "Close case study", "pt-BR": "Fechar estudo de caso" },
  "project.caseStudy.problemTitle": { en: "Problem", "pt-BR": "Problema" },
  "project.caseStudy.problemBody": {
    en: "Leaders lacked a unified view of performance across sales, operations, and support.",
    "pt-BR": "Líderes não tinham uma visão unificada de performance entre vendas, operações e suporte.",
  },
  "project.caseStudy.approachTitle": { en: "Approach", "pt-BR": "Abordagem" },
  "project.caseStudy.approachBody": {
    en: "Designed a single source of truth with automated ETL, semantic models, and alerting.",
    "pt-BR": "Desenhei uma fonte única da verdade com ETL automatizado, modelos semânticos e alertas.",
  },
  "project.caseStudy.dataModelTitle": { en: "Data Model", "pt-BR": "Modelo de Dados" },
  "project.caseStudy.dataModelBody": {
    en: "Star schema with fact tables for revenue, orders, and SLAs plus shared dimensions.",
    "pt-BR": "Esquema estrela com fatos de receita, pedidos e SLAs mais dimensões compartilhadas.",
  },
  "project.caseStudy.dashboardTitle": { en: "Dashboard Highlights", "pt-BR": "Destaques do Dashboard" },
  "project.caseStudy.dashboardBody": {
    en: "Executive overview, regional drill-downs, and alert tiles for anomalies.",
    "pt-BR": "Visão executiva, detalhamento por região e tiles de alertas para anomalias.",
  },
  "project.caseStudy.automationTitle": { en: "Automation", "pt-BR": "Automação" },
  "project.caseStudy.automationBody": {
    en: "Power Automate triggers notifications when KPIs breach thresholds.",
    "pt-BR": "Power Automate dispara notificações quando KPIs ultrapassam limites.",
  },
  "project.caseStudy.resultsTitle": { en: "Results", "pt-BR": "Resultados" },
  "project.caseStudy.resultsBody": {
    en: "Reduced manual reporting time and improved SLA visibility.",
    "pt-BR": "Reduzi tempo de reportes manuais e aumentei a visibilidade de SLAs.",
  },
  "project.caseStudy.improvementsTitle": { en: "Improvements", "pt-BR": "Melhorias" },
  "project.caseStudy.improvementsBody": {
    en: "Next steps include predictive alerts and self-serve exploration layers.",
    "pt-BR": "Próximos passos incluem alertas preditivos e camadas de exploração self-service.",
  },
  "project.caseStudy.architectureTitle": { en: "Project Architecture", "pt-BR": "Arquitetura do Projeto" },
  "project.caseStudy.architectureDesc": {
    en: "Data sources feed ETL, then a warehouse, then dashboards and alerts.",
    "pt-BR": "Fontes de dados alimentam o ETL, depois um warehouse, depois dashboards e alertas.",
  },
  "project.caseStudy.architectureSource": { en: "Data Sources", "pt-BR": "Fontes de Dados" },
  "project.caseStudy.architectureEtl": { en: "ETL + Validation", "pt-BR": "ETL + Validação" },
  "project.caseStudy.architectureWarehouse": { en: "Data Warehouse", "pt-BR": "Data Warehouse" },
  "project.caseStudy.architectureDashboard": { en: "Power BI Dashboards", "pt-BR": "Dashboards Power BI" },
  "project.caseStudy.architectureAlerts": { en: "Alert Automation", "pt-BR": "Automação de Alertas" },
  "cert.title": { en: "Certificates", "pt-BR": "Certificados" },
  "cert.subtitle": { en: "Verified credentials with shareable deep links.", "pt-BR": "Credenciais verificadas com links compartilháveis." },
  "cert.filterLabel": { en: "Certificate filters", "pt-BR": "Filtros de certificados" },
  "cert.filterAll": { en: "All", "pt-BR": "Todos" },
  "cert.filterMicrosoft": { en: "Microsoft", "pt-BR": "Microsoft" },
  "cert.filterData": { en: "Data", "pt-BR": "Dados" },
  "cert.filterEnglish": { en: "English", "pt-BR": "Inglês" },
  "cert.searchLabel": { en: "Search certificates", "pt-BR": "Buscar certificados" },
  "cert.searchPlaceholder": { en: "Search by title or issuer", "pt-BR": "Buscar por título ou emissor" },
  "cert.card.viewCredential": { en: "View credential", "pt-BR": "Ver credencial" },
  "cert.card.copyLink": { en: "Copy link", "pt-BR": "Copiar link" },
  "cert.card.copied": { en: "Link copied", "pt-BR": "Link copiado" },
  "cert.empty": { en: "No certificates match your search.", "pt-BR": "Nenhum certificado corresponde à sua busca." },
  "cert.pl900.title": { en: "PL-900: Microsoft Power Platform Fundamentals", "pt-BR": "PL-900: Fundamentos do Microsoft Power Platform" },
  "cert.pl900.issuer": { en: "Microsoft", "pt-BR": "Microsoft" },
  "cert.pl900.shortDesc": { en: "Core Power Platform concepts and capabilities.", "pt-BR": "Conceitos e capacidades essenciais do Power Platform." },
  "cert.pl900.date": { en: "2025", "pt-BR": "2025" },
  "cert.datacamp.title": { en: "Data Analyst Associate", "pt-BR": "Data Analyst Associate" },
  "cert.datacamp.issuer": { en: "DataCamp", "pt-BR": "DataCamp" },
  "cert.datacamp.shortDesc": { en: "Assessment-driven credential for analytics skills.", "pt-BR": "Credencial baseada em avaliação para habilidades analíticas." },
  "cert.datacamp.date": { en: "Sep 2025", "pt-BR": "Set 2025" },
  "cert.toeic.title": { en: "TOEIC", "pt-BR": "TOEIC" },
  "cert.toeic.issuer": { en: "ETS", "pt-BR": "ETS" },
  "cert.toeic.shortDesc": { en: "Score 910/990", "pt-BR": "Pontuação 910/990" },
  "cert.toeic.date": { en: "Score 910/990", "pt-BR": "Pontuação 910/990" },
  "resume.title": { en: "Resume", "pt-BR": "Currículo" },
  "resume.subtitle": { en: "Download the PDF for the full version.", "pt-BR": "Baixe o PDF para a versão completa." },
  "resume.download": { en: "Download Resume (PDF)", "pt-BR": "Baixar Currículo (PDF)" },
  "resume.snapshotTitle": { en: "Resume snapshot", "pt-BR": "Resumo do currículo" },
  "resume.snapshotExperience": { en: "Experience", "pt-BR": "Experiência" },
  "resume.snapshotExperienceBody": {
    en: "Internship projects focused on KPI automation and dashboarding.",
    "pt-BR": "Projetos de estágio focados em automação de KPIs e dashboards.",
  },
  "resume.snapshotEducation": { en: "Education", "pt-BR": "Formação" },
  "resume.snapshotEducationBody": {
    en: "Bachelor's studies with emphasis on analytics and statistics.",
    "pt-BR": "Graduação com ênfase em analytics e estatística.",
  },
  "resume.snapshotSkills": { en: "Skills", "pt-BR": "Habilidades" },
  "resume.snapshotSkillsBody": {
    en: "Power BI, SQL, Python, DAX, Excel, automation.",
    "pt-BR": "Power BI, SQL, Python, DAX, Excel, automação.",
  },
  "resume.note": { en: "For full details, download the PDF.", "pt-BR": "Para todos os detalhes, baixe o PDF." },
  "contact.title": { en: "Contact", "pt-BR": "Contato" },
  "contact.subtitle": { en: "Let's connect for roles, projects, or collaboration.", "pt-BR": "Vamos conversar sobre vagas, projetos ou colaboração." },
  "contact.copyEmail": { en: "Copy email", "pt-BR": "Copiar e-mail" },
  "contact.copied": { en: "Email copied", "pt-BR": "E-mail copiado" },
  "contact.emailLabel": { en: "Email address", "pt-BR": "Endereço de e-mail" },
  "contact.linkedinLabel": { en: "LinkedIn profile", "pt-BR": "Perfil no LinkedIn" },
  "contact.githubLabel": { en: "GitHub profile", "pt-BR": "Perfil no GitHub" },
  "footer.note": { en: "Built with HTML, CSS, and vanilla JavaScript.", "pt-BR": "Feito com HTML, CSS e JavaScript puro." },
  "noscript.message": {
    en: "JavaScript is required for language switching, filters, and the case study modal.",
    "pt-BR": "JavaScript é necessário para o seletor de idioma, filtros e o modal do estudo de caso.",
  },
};

const supportedLangs = ["en", "pt-BR"];

function isSupportedLang(lang) {
  return supportedLangs.includes(lang);
}

function translate(key, lang = "en") {
  const entry = i18n[key];
  if (!entry) return key;
  return entry[lang] || entry.en || "";
}

function setMeta(selector, content) {
  const el = document.querySelector(selector);
  if (el && content) {
    el.setAttribute("content", content);
  }
}

function updateMeta(lang) {
  const title = translate("meta.title", lang);
  const description = translate("meta.description", lang);
  document.title = title;
  setMeta("meta[name='description']", description);
  setMeta("meta[property='og:title']", title);
  setMeta("meta[property='og:description']", description);
  setMeta("meta[name='twitter:title']", title);
  setMeta("meta[name='twitter:description']", description);
}

function applyTranslations(lang) {
  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = translate(key, lang);
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    const mappings = el.getAttribute("data-i18n-attr");
    if (!mappings) return;
    mappings.split(";").forEach((pair) => {
      const [attr, key] = pair.split(":");
      if (!attr || !key) return;
      el.setAttribute(attr.trim(), translate(key.trim(), lang));
    });
  });

  updateMeta(lang);
}

function getLangFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang");
  if (isSupportedLang(lang)) return lang;
  return null;
}

function updateUrlLang(lang) {
  const url = new URL(window.location.href);
  url.searchParams.set("lang", lang);
  history.replaceState({}, "", url);
}

function getInitialLang() {
  const urlLang = getLangFromUrl();
  if (urlLang) {
    localStorage.setItem("lang", urlLang);
    return urlLang;
  }

  const stored = localStorage.getItem("lang");
  if (isSupportedLang(stored)) return stored;

  const browserLang = navigator.language || "en";
  return browserLang.toLowerCase().startsWith("pt") ? "pt-BR" : "en";
}

const certData = [
  {
    id: "cert-pl900",
    titleKey: "cert.pl900.title",
    issuerKey: "cert.pl900.issuer",
    shortDescKey: "cert.pl900.shortDesc",
    dateKey: "cert.pl900.date",
    url: "./cert-pl900.pdf",
    tags: ["microsoft"],
  },
  {
    id: "cert-datacamp",
    titleKey: "cert.datacamp.title",
    issuerKey: "cert.datacamp.issuer",
    shortDescKey: "cert.datacamp.shortDesc",
    dateKey: "cert.datacamp.date",
    url: "./cert-datacamp.pdf",
    tags: ["data"],
  },
  {
    id: "cert-toeic",
    titleKey: "cert.toeic.title",
    issuerKey: "cert.toeic.issuer",
    shortDescKey: "cert.toeic.shortDesc",
    dateKey: "cert.toeic.date",
    url: "./cert-toeic.pdf",
    tags: ["english"],
  },
];

function fallbackEntry(key) {
  return { en: key, "pt-BR": key };
}

function buildCertificates(i18nMap) {
  return certData.map((cert) => {
    const title = i18nMap[cert.titleKey] || fallbackEntry(cert.titleKey);
    const issuer = i18nMap[cert.issuerKey] || fallbackEntry(cert.issuerKey);
    const shortDesc = i18nMap[cert.shortDescKey] || fallbackEntry(cert.shortDescKey);
    const date = i18nMap[cert.dateKey] || fallbackEntry(cert.dateKey);
    const searchIndex = [
      title.en,
      title["pt-BR"],
      issuer.en,
      issuer["pt-BR"],
      shortDesc.en,
      shortDesc["pt-BR"],
    ]
      .join(" ")
      .toLowerCase();

    return {
      ...cert,
      title,
      issuer,
      shortDesc,
      date,
      searchIndex,
    };
  });
}

function initUI({ state, certificates, t, onLanguageChange }) {
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

const state = {
  lang: "en",
  filter: "all",
  search: "",
};

const t = (key) => translate(key, state.lang);
const certificates = buildCertificates(i18n);

let uiApi = null;

function setLanguage(lang, options = {}) {
  const { persist = true, updateUrl = true } = options;
  if (!isSupportedLang(lang)) return;

  state.lang = lang;
  if (persist) {
    localStorage.setItem("lang", lang);
  }
  if (updateUrl) {
    updateUrlLang(lang);
  }
  if (uiApi) {
    uiApi.updateLangSelect(lang);
  }

  applyTranslations(lang);

  if (uiApi) {
    uiApi.renderCertificates();
    uiApi.highlightFromHash({ scroll: false });
    uiApi.setNavToggleLabel(uiApi.isNavOpen());
  }
}

function init() {
  const initialLang = getInitialLang();
  uiApi = initUI({
    state,
    certificates,
    t,
    onLanguageChange: setLanguage,
  });

  setLanguage(initialLang, { persist: true, updateUrl: true });
  uiApi.highlightFromHash({ scroll: true });
}

init();
