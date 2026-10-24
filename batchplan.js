/**
 * Batch cook planning, derived from the week's actual saved plan.
 *
 * The 6-Month Transformation Plan cooks twice a week: Sunday's session covers
 * Monday to Wednesday, Wednesday's covers Thursday to Saturday. This works out
 * what those sessions have to produce given what is planned to be eaten in the
 * window — how many portions, how many batches of each recipe, which marinades
 * have to exist first, and what order to run it in so the oven is never idle.
 *
 * Used by the mini app and by scripts/welltrack.mjs, so the coach's message and
 * the app's screen are the same plan.
 */

/** Sunday cook feeds Mon-Wed; Wednesday cook feeds Thu-Sat. */
export const SESSIONS = [
  { key: "weekend", cookDay: 0, label: "Sunday cook", covers: [1, 2, 3], coversLabel: "Monday to Wednesday" },
  { key: "midweek", cookDay: 3, label: "Wednesday cook", covers: [4, 5, 6], coversLabel: "Thursday to Saturday" },
];

const isoAdd = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekday = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const dayName = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });

/** The next date on or after `from` whose weekday is `target`. */
export function nextCookDate(from, target) {
  for (let i = 0; i < 7; i++) {
    const d = isoAdd(from, i);
    if (weekday(d) === target) return d;
  }
  return from;
}

/**
 * Things worth cooking ahead.
 *
 * The plan's batch strategy is "3-4 days of protein and veg", not every meal.
 * Breakfast is made fresh — scrambled eggs cooked on Wednesday for Saturday are
 * nobody's idea of meal prep — and so is anything raw, assembled or quick.
 */
function canCookAhead(recipe) {
  const tags = recipe.tags || [];
  if (tags.includes("marinade")) return false;
  if (tags.includes("no-cook") || tags.includes("portable") || tags.includes("quick-meal")) return false;
  if (recipe.meal_type === "breakfast" && !tags.includes("make-ahead")) return false;
  if ((recipe.cook_time_min || 0) < 12) return false;
  return true;
}

/** Worth the container: a real batch recipe, or something eaten more than once. */
function worthBatching(item) {
  const tags = item.recipe.tags || [];
  return tags.includes("batch-protein") || tags.includes("meal-prep") || item.portions >= 2;
}

/** Marinades a recipe depends on, named in its ingredients as "(see X)". */
function marinadesFor(recipe, byTitle) {
  const out = [];
  for (const ing of recipe.ingredients || []) {
    const m = /\(see ([^)]+)\)/i.exec(ing.item || "");
    if (!m) continue;
    const hit = byTitle.get(m[1].trim().toLowerCase());
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out;
}

/**
 * Build one session's plan.
 *
 * @param recipes  full recipe rows, including ingredients and times
 * @param planRows saved plan rows: { date, slot, recipe_id, recipe_title, portion }
 * @param cookDate ISO date of the cook session itself
 * @param session  one of SESSIONS
 */
export function buildSession(recipes, planRows, cookDate, session) {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const byTitle = new Map(recipes.map((r) => [r.title.toLowerCase(), r]));

  // The days this session has to feed
  const windowDates = session.covers.map((offset) => {
    const delta = (offset - session.cookDay + 7) % 7 || 7;
    return isoAdd(cookDate, delta);
  });

  const inWindow = planRows.filter((r) => windowDates.includes(r.date));

  // Portions of each recipe the window needs
  const needed = new Map();
  for (const row of inWindow) {
    const recipe = (row.recipe_id && byId.get(row.recipe_id)) ||
                   byTitle.get((row.recipe_title || "").toLowerCase());
    if (!recipe || !canCookAhead(recipe)) continue;
    const prev = needed.get(recipe.id) ||
                 { recipe, portions: 0, days: new Set(), slots: new Set() };
    prev.portions += Number(row.portion) || 1;
    prev.days.add(dayName(row.date));
    prev.slots.add(row.slot);
    needed.set(recipe.id, prev);
  }

  const items = [...needed.values()]
    .map((n) => {
      const serves = n.recipe.servings || 1;
      const batches = Math.max(1, Math.ceil(n.portions / serves));
      return {
        recipe: n.recipe,
        title: n.recipe.title,
        portions: Math.round(n.portions * 100) / 100,
        batches,
        serves,
        days: [...n.days],
        slots: [...n.slots],
        prepMin: (n.recipe.prep_time_min || 0) * batches,
        cookMin: n.recipe.cook_time_min || 0,
        storage: n.recipe.storage || null,
      };
    })
    .filter(worthBatching)
    // Longest cook first: start it, then prep everything else while it runs
    .sort((a, b) => b.cookMin - a.cookMin);

  // Marinades must exist before the things that use them
  const marinades = [];
  for (const it of items) {
    for (const m of marinadesFor(it.recipe, byTitle)) {
      if (!marinades.some((x) => x.id === m.id)) marinades.push(m);
    }
  }

  const handsOn = marinades.reduce((a, m) => a + (m.prep_time_min || 0), 0) +
                  items.reduce((a, i) => a + i.prepMin, 0);
  const longestCook = items.reduce((a, i) => Math.max(a, i.cookMin), 0);
  // Other cooks mostly overlap with the longest one, but not perfectly
  const otherCook = items.reduce((a, i) => a + i.cookMin, 0) - longestCook;
  const elapsed = Math.round(handsOn + longestCook + otherCook * 0.35);

  const steps = [];
  if (marinades.length) {
    steps.push(`Make the marinades first: ${marinades.map((m) => m.title).join(", ")}.`);
  }
  if (items.length) {
    const first = items[0];
    steps.push(`Start ${first.title}${first.batches > 1 ? ` (${first.batches} batches)` : ""} — ` +
               `${first.cookMin} min, the longest cook. Get it going before anything else.`);
    for (const it of items.slice(1)) {
      steps.push(`While that runs: ${it.title}${it.batches > 1 ? ` (${it.batches} batches)` : ""}, ` +
                 `${it.prepMin} min prep and ${it.cookMin} min cook.`);
    }
    steps.push("Cool everything fully before it goes in the fridge — warm food in a sealed box sweats and spoils early.");
    steps.push(`Portion as you go: ${items.map((i) => `${i.title} ×${Math.ceil(i.portions)}`).join(", ")}.`);
  }

  const freshOnTheDay = [...new Set(inWindow
    .map((row) => (row.recipe_id && byId.get(row.recipe_id)) ||
                  byTitle.get((row.recipe_title || "").toLowerCase()))
    .filter((r) => r && !canCookAhead(r))
    .map((r) => r.title))];

  return {
    session,
    cookDate,
    freshOnTheDay,
    cookDay: dayName(cookDate),
    coversLabel: session.coversLabel,
    windowDates,
    items,
    marinades,
    handsOn,
    elapsed,
    totalPortions: items.reduce((a, i) => a + Math.ceil(i.portions), 0),
    steps,
    empty: items.length === 0,
  };
}

/** The next `count` cook sessions on or after `from`. */
export function upcomingSessions(recipes, planRows, from, count = 2) {
  return SESSIONS
    .map((s) => ({ s, date: nextCookDate(from, s.cookDay) }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, count)
    .map(({ s, date }) => buildSession(recipes, planRows, date, s));
}
