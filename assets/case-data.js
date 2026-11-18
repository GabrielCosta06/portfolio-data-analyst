export const english = document.documentElement.lang === 'en';
export const locale = english ? 'en-US' : 'pt-BR';
export const count = new Intl.NumberFormat(locale);
export const currency = new Intl.NumberFormat(locale, {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 2,
});
export const percent = new Intl.NumberFormat(locale, {
  style: 'percent', maximumFractionDigits: 2,
});
export const loadError = english ? 'Could not load the demonstration data.' : 'Não foi possível carregar os dados da demonstração.';

export function node(tag, content) {
  const element = document.createElement(tag);
  if (content !== undefined) element.textContent = content;
  return element;
}

export async function readJSON(path) {
  const response = await fetch(new URL('../' + path, import.meta.url));
  if (!response.ok) throw new Error(path);
  return response.json();
}

export function renderBars(container, rows, {onSelect, activeKey} = {}) {
  const values = rows.map(row => row.value ?? 0);
  const lower = Math.min(0, ...values);
  const span = (Math.max(0, ...values) - lower) || 1;
  const list = node('ul');
  list.className = 'case-bars';
  list.setAttribute('role', 'list');
  const buttons = new Map();

  for (const row of rows) {
    const item = node('li');
    const content = node(onSelect ? 'button' : 'div');
    content.className = 'case-bar-row';
    if (onSelect) {
      content.type = 'button';
      content.setAttribute('aria-pressed', String(activeKey === row.key));
      content.addEventListener('click', () => onSelect(row.key));
      buttons.set(row.key, content);
    }
    const track = node('span');
    track.className = 'case-bar-track';
    track.setAttribute('aria-hidden', 'true');
    if (row.value !== null) {
      const bar = node('span');
      bar.className = row.value < 0 ? 'case-bar-fill negative' : 'case-bar-fill';
      bar.style.left = ((Math.min(0, row.value) - lower) / span * 100) + '%';
      bar.style.width = (Math.abs(row.value) / span * 100) + '%';
      track.append(bar);
    }
    const amount = node('span', row.formatted);
    amount.className = 'case-bar-value';
    content.append(node('span', row.label), track, amount);
    item.append(content);
    list.append(item);
  }
  container.replaceChildren(list);
  return buttons;
}
