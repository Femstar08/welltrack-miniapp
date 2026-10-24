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
 * How long a jar keeps in the fridge, taken from each marinade's own storage
 * line. Fresh herbs and raw alliums are the limit, not the sugar or acid.
 */
export const SHELF_LIFE_DAYS = {
  "jerk marinade": 14,
  "honey garlic marinade": 14,
  "sofrito base": 7,
  "lemon herb marinade": 7,
};
export const DEFAULT_SHELF_LIFE = 7;

export const shelfLife = (recipe) =>
  SHELF_LIFE_DAYS[(recipe.title || "").toLowerCase()] ?? DEFAULT_SHELF_LIFE;

/**
 * What is in the jars right now.
 * @param pantry rows of { recipe_id, made_on, expires_on, remaining }
 */
export function stockFor(recipeId, pantry, onDate) {
  const live = (pantry || []).filter(
    (j) => j.recipe_id === recipeId &&
           Number(j.remaining) > 0 &&
           j.expires_on >= onDate);
  if (!live.length) return null;
  const total = live.reduce((a, j) => a + Number(j.remaining), 0);
  const soonest = live.map((j) => j.expires_on).sort()[0];
  return { remaining: Math.round(total * 10) / 10, expiresOn: soonest, jars: live.length };
}

/**
 * Components of a fresh meal that can still be done in advance.
 *
 * Not everything is a tray of chicken. A schnitzel is cooked on the night, but
 * its marinade can be made, its chicken can sit in it, and its grain can be
 * cooked on Sunday — which is the difference between a 40-minute weeknight and
 * a 15-minute one.
 */
// Only dry staples are worth cooking ahead — a tin of chickpeas is already cooked
const GRAINS = /\b(rice|quinoa|dried lentils?|lentils?|oats|pearl barley|couscous)\b/i;
const ALREADY_DONE = /\b(tinned|canned|drained|cooked|pre-cooked|sauce|cake|bread|waffle)\b/i;

// Fresh produce only. "Garlic powder" and "salt and pepper" are not chopping jobs.
const CHOPPABLE = /\b(pepper|onion|carrot|celery|spinach|kale|broccoli|tomato|coriander|parsley|garlic cloves?|plantain|mushroom|avocado)\b/i;
const NOT_PRODUCE = /\b(powder|dried|ground|flakes?|seasoning|salt|puree|sauce|stock|oil|vinegar|paprika|cumin|cayenne|oregano|thyme|cinnamon|nutmeg|allspice|curry)\b/i;

const PROTEIN = /\b(chicken|salmon|turkey|beef|mince|prawn|mackerel|tuna)\b/i;

export function prepTasksFor(recipe, byTitle, inStock = new Set()) {
  const tasks = [];
  const ings = recipe.ingredients || [];

  const marinades = marinadesFor(recipe, byTitle);
  const protein = ings.find((i) => PROTEIN.test(i.item || ""));
  for (const m of marinades) {
    if (inStock.has(m.id)) {
      tasks.push({
        kind: "marinate",
        marinade: m,
        text: protein
          ? `Take the ${m.title} out of the fridge and marinate the ${String(protein.item).split(",")[0].toLowerCase()}`
          : `Use the ${m.title} from the fridge`,
        minutes: 5,
      });
      continue;
    }
    tasks.push({
      kind: "marinade",
      marinade: m,
      text: protein
        ? `Make ${m.title} and leave the ${String(protein.item).split(",")[0].toLowerCase()} in it`
        : `Make ${m.title}`,
      minutes: m.prep_time_min || 10,
    });
  }

  const grains = ings.filter((i) => GRAINS.test(i.item || "") && !ALREADY_DONE.test(i.item || ""));
  if (grains.length) {
    tasks.push({
      kind: "grain",
      text: `Cook the ${grains.map((g) => String(g.item).split(",")[0].toLowerCase()).join(" and ")} ahead`,
      minutes: 20,
    });
  }

  const chop = ings.filter((i) => CHOPPABLE.test(i.item || "") && !NOT_PRODUCE.test(i.item || ""));
  if (chop.length >= 3) {
    tasks.push({
      kind: "chop",
      text: `Chop ${chop.slice(0, 4).map((c) => String(c.item).split(",")[0].toLowerCase()).join(", ")}` +
            (chop.length > 4 ? ` and ${chop.length - 4} more` : ""),
      minutes: 10,
    });
  }

  return tasks;
}

/**
 * Build one session's plan.
 *
 * @param recipes  full recipe rows, including ingredients and times
 * @param planRows saved plan rows: { date, slot, recipe_id, recipe_title, portion }
 * @param cookDate ISO date of the cook session itself
 * @param session  one of SESSIONS
 */
export function buildSession(recipes, planRows, cookDate, session, pantry = []) {
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

  // Marinade demand is per cook, not per planned day: one tray of thighs needs
  // one lot of marinade however many days it then feeds.
  const batchedIds0 = new Set(items.map((i) => i.recipe.id));
  const demand = new Map();

  const addDemand = (recipe, lots) => {
    for (const m of marinadesFor(recipe, byTitle)) {
      const line = (recipe.ingredients || []).find((i) =>
        new RegExp(`\\(see ${m.title}\\)`, "i").test(i.item || ""));
      const perLot = Number(line?.quantity) || 2;
      const prev = demand.get(m.id) || { marinade: m, needed: 0, usedBy: new Set() };
      prev.needed += perLot * lots;
      prev.usedBy.add(recipe.title);
      demand.set(m.id, prev);
    }
  };

  // Cooked ahead: one lot per batch
  for (const it of items) addDemand(it.recipe, it.batches);

  // Cooked fresh: one lot each time it is made
  const freshCounts = new Map();
  for (const row of inWindow) {
    const recipe = (row.recipe_id && byId.get(row.recipe_id)) ||
                   byTitle.get((row.recipe_title || "").toLowerCase());
    if (!recipe || batchedIds0.has(recipe.id)) continue;
    freshCounts.set(recipe, (freshCounts.get(recipe) || 0) + 1);
  }
  for (const [recipe, times] of freshCounts) addDemand(recipe, times);

  // Only ask for a jar when there is not one already, or not enough left
  const marinadeJobs = [...demand.values()].map((d) => {
    const stock = stockFor(d.marinade.id, pantry, cookDate);
    const have = stock?.remaining ?? 0;
    const short = Math.max(0, d.needed - have);
    const perJar = d.marinade.servings || 8;
    return {
      marinade: d.marinade,
      needed: Math.round(d.needed * 10) / 10,
      have,
      stock,
      jarsToMake: short > 0 ? Math.ceil(short / perJar) : 0,
      perJar,
      usedBy: [...d.usedBy],
      makeJar: short > 0,
      keepsDays: shelfLife(d.marinade),
    };
  });

  const marinades = marinadeJobs.filter((j) => j.makeJar).map((j) => j.marinade);
  const marinadesInStock = marinadeJobs.filter((j) => !j.makeJar);

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

  // Everything in the window that is not a full cook-ahead batch, with
  // whatever can still be done in advance for it.
  const batchedIds = new Set(items.map((i) => i.recipe.id));
  const inStockIds = new Set(marinadesInStock.map((j) => j.marinade.id));
  const freshSeen = new Map();
  for (const row of inWindow) {
    const recipe = (row.recipe_id && byId.get(row.recipe_id)) ||
                   byTitle.get((row.recipe_title || "").toLowerCase());
    if (!recipe || batchedIds.has(recipe.id)) continue;
    const prev = freshSeen.get(recipe.id) || {
      recipe,
      title: recipe.title,
      days: new Set(),
      slots: new Set(),
      prepMin: recipe.prep_time_min || 0,
      cookMin: recipe.cook_time_min || 0,
      tasks: prepTasksFor(recipe, byTitle, inStockIds),
    };
    prev.days.add(dayName(row.date));
    prev.slots.add(row.slot);
    freshSeen.set(recipe.id, prev);
  }
  const fresh = [...freshSeen.values()].map((f) => ({ ...f, days: [...f.days], slots: [...f.slots] }));
  const prepAhead = fresh.filter((f) => f.tasks.length);
  const nothingToPrep = fresh.filter((f) => !f.tasks.length);
  const freshOnTheDay = fresh.map((f) => f.title);

  const prepMinutes = prepAhead.reduce(
    (a, f) => a + f.tasks.reduce((b, t) => b + (t.minutes || 0), 0), 0);

  return {
    session,
    cookDate,
    fresh,
    prepAhead,
    nothingToPrep,
    freshOnTheDay,
    prepMinutes,
    marinadeJobs,
    marinadesInStock,
    cookDay: dayName(cookDate),
    coversLabel: session.coversLabel,
    windowDates,
    items,
    marinades,
    handsOn,
    elapsed,
    totalPortions: items.reduce((a, i) => a + Math.ceil(i.portions), 0),
    steps,
    empty: items.length === 0 && prepAhead.length === 0,
  };
}

/** The next `count` cook sessions on or after `from`. */
export function upcomingSessions(recipes, planRows, from, count = 2, pantry = []) {
  return SESSIONS
    .map((s) => ({ s, date: nextCookDate(from, s.cookDay) }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, count)
    .map(({ s, date }) => buildSession(recipes, planRows, date, s, pantry));
}
