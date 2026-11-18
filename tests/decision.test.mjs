import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareCategories, rankCategories} from '../projects/analytics/decision.mjs';

const manifest = JSON.parse(readFileSync(new URL('../data/processed/manifest.json', import.meta.url), 'utf8'));
const groups = manifest.categories.map(({category, revenue_cents, profit_cents}) => ({
  name: category, revenue: revenue_cents, profit: profit_cents, margin: profit_cents / revenue_cents,
}));

test('synthetic sales case distinguishes revenue, profit and margin leaders', () => {
  const {leaders, priority} = compareCategories(groups, manifest.profit_cents / manifest.revenue_cents);
  assert.equal(leaders.revenue[0].name, 'Equipamentos');
  assert.equal(leaders.profit[0].name, 'Servicos');
  assert.equal(leaders.margin[0].name, 'Servicos');
  assert.equal(priority.name, 'Equipamentos');
  assert.equal(priority.gapCents, 3616753);
  assert.equal(rankCategories(groups, 'profit')[0].name, 'Servicos');
});

test('does not recommend a category without a comparison and handles ties', () => {
  assert.equal(compareCategories([], null).priority, null);
  assert.equal(compareCategories([groups[0]], groups[0].margin).priority, null);
  const zero = {name: 'Zero', revenue: 0, profit: 0, margin: null};
  const tie = {...groups[0], name: 'Equal'};
  assert.equal(compareCategories([groups[0], zero, tie], tie.margin).leaders.margin.length, 2);
  assert.equal(rankCategories([zero, ...groups], 'margin').at(-1), zero);
});
