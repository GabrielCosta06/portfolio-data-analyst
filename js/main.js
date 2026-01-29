import { applyTranslations, getInitialLang, i18n, isSupportedLang, translate, updateUrlLang } from "./i18n.js";
import { buildCertificates } from "./data.js";
import { initUI } from "./ui.js";

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
