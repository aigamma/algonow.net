// One number, shared by the prerendered HTML and the browser: the UTC day.
//
// The homepage picks the day's pair and expires the new-puzzle pill from the
// calendar, and the markup for both is now written at build time. React only
// keeps prerendered markup when the first client render reproduces it exactly,
// so the client cannot open on its own clock: it opens on the day the HTML was
// rendered for, stamped onto the root element, and adopts the real day in an
// effect once hydration has already matched. A mismatch would not just cost the
// prerender, it would log a console error, which is its own audit.
//
// Counting whole days rather than milliseconds is the second half of that
// agreement. A puzzle's `added` field is a plain YYYY-MM-DD, so comparing it
// against a day boundary makes the new-puzzle window turn over at a UTC
// midnight instead of at whatever moment the build happened to run.

export const DAY_MS = 86400000;

// Days since the Unix epoch, UTC, so every visitor is on the same day at the
// same moment regardless of timezone.
export function dayNow(now = Date.now()) {
  return Math.floor(now / DAY_MS);
}

// The instant a given day begins, for comparing against authored dates.
export function dayStart(day) {
  return day * DAY_MS;
}

// The day the served HTML was rendered for. The prerender writes it onto
// #root; a dev server with an empty root has no stamp and falls back to the
// real day, which is correct because there is no markup to match there.
export function stampedDay(root) {
  const raw = root?.dataset?.day;
  const parsed = Number(raw);
  return raw && Number.isFinite(parsed) ? parsed : dayNow();
}
