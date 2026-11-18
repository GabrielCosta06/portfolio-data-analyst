export function rankCategories(groups, metric) {
  return [...groups].sort((left, right) => {
    const a = left[metric];
    const b = right[metric];
    if (a == null || b == null) return Number(a == null) - Number(b == null);
    return b - a || left.name.localeCompare(right.name);
  });
}

export function compareCategories(groups, totalMargin) {
  const comparable = groups.filter(group => group.revenue > 0 && group.margin !== null);
  const leaders = Object.fromEntries(['revenue', 'profit', 'margin'].map(metric => {
    const ranked = rankCategories(metric === 'margin' ? comparable : groups, metric);
    return [metric, ranked.filter(group => group[metric] === ranked[0]?.[metric])];
  }));

  let priority = null;
  if (comparable.length > 1 && totalMargin !== null) {
    for (const group of comparable) {
      const gapCents = Math.round(group.revenue * (totalMargin - group.margin));
      if (gapCents > 0 && (!priority || gapCents > priority.gapCents ||
          (gapCents === priority.gapCents && group.name.localeCompare(priority.name) < 0))) {
        priority = {...group, gapCents};
      }
    }
  }
  return {leaders, priority};
}
