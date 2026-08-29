/**
 * Rewrites the "Recent" block of the profile README from real GitHub activity.
 *
 * Third-party widgets render someone else's idea of a developer: trophy
 * cabinets, streak counters, star totals. They also break, rate-limit, and
 * leak the visitor's IP to a server nobody audits. This reads the public API,
 * picks the most telling recent event per repository, and writes plain
 * Markdown into the file. No dependencies, no external images, no tracking.
 *
 *   node scripts/pulse.mjs
 *
 * Point PULSE_API at a local fixture to exercise it without the network.
 */

import { readFile, writeFile } from "node:fs/promises";

const USER = process.env.PULSE_USER ?? "chdavidfm";
const README = process.env.PULSE_README ?? "README.md";
const API = process.env.PULSE_API ?? "https://api.github.com";
const START = "<!-- pulse:start -->";
const END = "<!-- pulse:end -->";
const MAX_ROWS = 5;
const SUBJECT_LIMIT = 72;

/**
 * Commit subjects that describe maintenance rather than work. Dependency
 * bumps and CI edits are the majority of commits in a healthy repository and
 * the least worth reading: a profile whose only living block announces
 * "deps: bump pytest" tells a visitor the wrong thing about the week.
 */
const HOUSEKEEPING =
  /^(pulse|vitrina|deps|ci|docker|chore|build|style|revert)(\(.+\))?:|^Merge |^Update README\.md$/i;

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

const headers = { Accept: "application/vnd.github+json", "User-Agent": USER };
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

/**
 * One GET against the API. Returns null on any failure rather than throwing:
 * a profile that fails to build is worse than one with a quiet week. A 404 is
 * an ordinary answer here — most repositories have never cut a release — so
 * it is not worth a line of log.
 */
async function get(path) {
  try {
    const response = await fetch(`${API}${path}`, { headers });
    if (!response.ok) {
      if (response.status !== 404) {
        console.error(`GET ${path} responded ${response.status}.`);
      }
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`GET ${path} failed: ${error.message}`);
    return null;
  }
}

/**
 * Public repositories, most recently pushed first. Discovered rather than
 * listed by hand, so a new repository appears on the profile the day it gets
 * its first commit and a deleted one leaves without anybody editing a script.
 * Forks and archives are somebody else's work or finished work.
 */
async function repositories() {
  const all = await get(`/users/${USER}/repos?type=owner&sort=pushed&per_page=100`);
  if (all === null) return null;
  return all
    .filter((repo) => !repo.private && !repo.fork && !repo.archived && repo.name !== USER)
    .map((repo) => repo.full_name);
}

/** The newest published release, if the repository has ever cut one. */
async function latestRelease(full) {
  const release = await get(`/repos/${full}/releases/latest`);
  if (!release?.tag_name || release.draft) return null;
  const when = String(release.published_at ?? release.created_at ?? "").slice(0, 10);
  if (!when) return null;
  return { kind: "release", label: release.tag_name, when };
}

/**
 * The newest commit worth reading. Housekeeping is passed over while anything
 * substantive is still in the window; if the window holds nothing else, the
 * chore is shown anyway — a real quiet week beats an invented busy one.
 */
async function latestCommit(full) {
  const commits = await get(`/repos/${full}/commits?per_page=20`);
  if (!Array.isArray(commits)) return null;

  let housekeeping = null;
  for (const entry of commits) {
    const subject = String(entry.commit?.message ?? "").split("\n")[0].trim();
    if (!subject) continue;
    const when = String(
      entry.commit?.author?.date ?? entry.commit?.committer?.date ?? "",
    ).slice(0, 10);
    if (!when) continue;

    const row = { kind: "commit", label: subject, when };
    if (HOUSEKEEPING.test(subject)) {
      housekeeping ??= row;
      continue;
    }
    return row;
  }
  return housekeeping;
}

/**
 * One row per repository. Shipping is the louder event, so a release wins
 * whenever it is at least as recent as the last commit worth showing. ISO
 * dates compare correctly as strings, which is the whole reason to keep them.
 */
async function summarise(repos) {
  const rows = [];
  for (const full of repos) {
    const [release, commit] = await Promise.all([latestRelease(full), latestCommit(full)]);
    const chosen =
      release && (!commit || release.when >= commit.when) ? release : commit;
    if (!chosen) continue;
    rows.push({ ...chosen, repo: full.slice(full.indexOf("/") + 1) });
    if (rows.length === MAX_ROWS) break;
  }
  return rows;
}

/** 2026-08-28 is a key, not a date. Visitors read "28 Aug 2026". */
function readableDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  const name = MONTHS[month - 1];
  return name ? `${day} ${name} ${year}` : iso;
}

function truncate(subject) {
  return subject.length > SUBJECT_LIMIT
    ? `${subject.slice(0, SUBJECT_LIMIT - 1)}…`
    : subject;
}

function render(rows) {
  if (rows.length === 0) {
    return "_Nothing public in this window. Product source is private._";
  }
  return rows
    .map(({ repo, kind, label, when }) => {
      const link = `[\`${repo}\`](https://github.com/${USER}/${repo})`;
      const event =
        kind === "release" ? `**released \`${label}\`**` : truncate(label);
      return `- ${link} — ${event} · ${readableDate(when)}`;
    })
    .join("\n");
}

const repos = await repositories();
if (repos === null) process.exit(0);

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
  render(await summarise(repos)) +
  "\n\n" +
  readme.slice(to);

if (updated === readme) {
  console.log("No change.");
} else {
  await writeFile(README, updated);
  console.log(`Updated ${README}.`);
}
