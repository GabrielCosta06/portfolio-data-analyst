(() => {
  const currentLanguage = document.documentElement.lang === 'en' ? 'en' : 'pt';
  const alternative = document.querySelector('link[rel="alternate"][hreflang="' +
    (currentLanguage === 'en' ? 'pt-BR' : 'en') + '"]');
  if (!alternative) return;

  const preferenceKey = 'portfolio-data.language';
  const automaticKey = 'portfolio-data.automatic-language';
  const isLanguage = (value) => value === 'pt' || value === 'en';

  function read(storage, key) {
    try {
      const value = window[storage].getItem(key);
      return isLanguage(value) ? value : null;
    } catch {
      return null;
    }
  }

  function remember(storage, key, value) {
    try {
      window[storage].setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function preference() {
    return read('localStorage', preferenceKey) || read('sessionStorage', preferenceKey);
  }

  function languageUrl(language) {
    const current = new URL(location.href);
    const target = language === currentLanguage ? current : new URL(alternative.href);
    target.search = current.search;
    target.hash = current.hash;
    target.searchParams.delete('lang');
    return target;
  }

  function useLanguage(language) {
    if (language !== currentLanguage) location.replace(languageUrl(language));
  }

  for (const link of document.querySelectorAll('[data-language]')) {
    link.addEventListener('click', () => {
      const target = languageUrl(link.dataset.language);
      target.searchParams.set('lang', link.dataset.language);
      link.href = target.href;
    });
  }

  const requested = new URL(location.href).searchParams.get('lang');
  if (isLanguage(requested)) {
    const saved = remember('localStorage', preferenceKey, requested) ||
      remember('sessionStorage', preferenceKey, requested);
    const target = languageUrl(requested);
    if (!saved) target.searchParams.set('lang', requested);
    if (requested !== currentLanguage) location.replace(target);
    else if (saved) history.replaceState(history.state, '', target);
    return;
  }

  const saved = preference();
  if (saved) {
    useLanguage(saved);
    return;
  }

  // English links are explicit entry points. Legacy Portuguese links apply auto selection.
  if (currentLanguage === 'en') return;
  const cached = read('sessionStorage', automaticKey);
  if (cached) {
    useLanguage(cached);
    return;
  }

  const fallback = /^(pt|pt-br)$/i.test(navigator.language) ? 'pt' : 'en';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  fetch('https://api.country.is/', {
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) return fallback;
      const { country } = await response.json();
      return typeof country === 'string' && /^[A-Z]{2}$/.test(country)
        ? (country === 'BR' ? 'pt' : 'en')
        : fallback;
    })
    .catch(() => fallback)
    .then((language) => {
      remember('sessionStorage', automaticKey, language);
      useLanguage(preference() || language);
    })
    .finally(() => clearTimeout(timeout));
})();
