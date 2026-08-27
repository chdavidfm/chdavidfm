/**
 * Rewrites the "Recent" block of the profile README from real GitHub activity.
 *
 * Third-party widgets render someone else's idea of a developer: trophy
 * cabinets, streak counters, star totals. They also break, rate-limit, and
 * leak the visitor's IP to a server nobody audits. This reads the public
 * events API, keeps the last few pushes, and writes plain Markdown into the
 * file. No dependencies, no external images, no tracking.
 *
 *   node scripts/pulse.mjs
 */

import { readFile, writeFile } from "node:fs/promises";

const USER = process.env.PULSE_USER ?? "chdavidfm";
const README = process.env.PULSE_README ?? "README.md";
const START = "<!-- pulse:start -->";
const END = "<!-- pulse:end -->";
const MAX_ROWS = 5;

/** Public push events, newest first. Returns null rather than throwing: a
 *  profile that fails to build is worse than one with a quiet week. */
async function fetchPushes() {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": USER };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  try {
    const response = await fetch(
      `https://api.github.com/users/${USER}/events/public?per_page=100`,
      { headers },
    );
    if (!response.ok) {
      console.error(`GitHub responded ${response.status}; leaving the block untouched.`);
      return null;
    }
    return (await response.json()).filter((event) => event.type === "PushEvent");
  } catch (error) {
    console.error(`Could not reach GitHub (${error.message}); leaving the block untouched.`);
    return null;
  }
}

/** Public events lag. The commits API is the source of truth: skip `pulse:`
 *  commits so the profile never advertises its own housekeeping. */
async function latestPublicCommit(full, headers) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${full}/commits?per_page=15`,
      { headers },
    );
    if (!response.ok) return null;
    for (const commit of await response.json()) {
      const subject = String(commit.commit?.message || "")
        .split("\n")[0]
        .trim();
      if (!subject || subject.startsWith("pulse:") || /^Update README\.md$/i.test(subject)) continue;
      const when = String(
        commit.commit?.author?.date || commit.commit?.committer?.date || "",
      ).slice(0, 10);
      return { subject, when };
    }
  } catch {
    return null;
  }
  return null;
}

async function summarise(pushes) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": USER };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const order = [];
  const seen = new Set();
  for (const name of [
    `${USER}/chdavidfm`,
    `${USER}/skills`,
    `${USER}/rag-agent-lab`,
    ...pushes.map((p) => p.repo?.name).filter(Boolean),
  ]) {
    if (!name.startsWith(`${USER}/`) || seen.has(name)) continue;
    seen.add(name);
    order.push(name);
  }

  const rows = [];
  for (const full of order) {
    const latest = await latestPublicCommit(full, headers);
    if (!latest) continue;
    const short = full.replace(`${USER}/`, "");
    rows.push({
      repo: short,
      subject:
        latest.subject.length > 72
          ? `${latest.subject.slice(0, 71)}…`
          : latest.subject,
      when: latest.when,
    });
    if (rows.length === MAX_ROWS) break;
  }
  return rows;
}

function render(rows) {
  if (rows.length === 0) {
    return "_Nada pusheado en público en este tramo. El repo de producto es privado._";
  }
  return rows
    .map(
      ({ repo, subject, when }) =>
        `- [\`${repo}\`](https://github.com/${USER}/${repo}) — ${subject} · ${when}`,
    )
    .join("\n");
}

const pushes = await fetchPushes();
if (pushes === null) process.exit(0);

const readme = await readFile(README, "utf8");
const from = readme.indexOf(START);
const to = readme.indexOf(END);
if (from === -1 || to === -1) {
  console.error(`Markers ${START} / ${END} not found in ${README}.`);
  process.exit(1);
}

const updated =
  readme.slice(0, from + START.length) +
  "\n\n" +
  render(await summarise(pushes)) +
  "\n\n" +
  readme.slice(to);

if (updated === readme) {
  console.log("No change.");
} else {
  await writeFile(README, updated);
  console.log(`Updated ${README}.`);
}
