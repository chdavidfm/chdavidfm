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

/** One row per repository: its newest commit message and when it landed. */
function summarise(pushes) {
  const seen = new Map();
  for (const push of pushes) {
    const repo = push.repo?.name;
    const commits = push.payload?.commits ?? [];
    if (!repo || commits.length === 0 || seen.has(repo)) continue;

    const subject = commits[commits.length - 1].message.split("\n")[0].trim();
    seen.set(repo, {
      repo: repo.replace(`${USER}/`, ""),
      subject: subject.length > 72 ? `${subject.slice(0, 71)}…` : subject,
      when: push.created_at.slice(0, 10),
    });
    if (seen.size === MAX_ROWS) break;
  }
  return [...seen.values()];
}

function render(rows) {
  if (rows.length === 0) {
    return "Nothing pushed publicly in the last stretch. The product repository is private.";
  }
  return [
    "| Repository | Last change | Date |",
    "|---|---|---|",
    ...rows.map(
      ({ repo, subject, when }) =>
        `| [\`${repo}\`](https://github.com/${USER}/${repo}) | ${subject} | ${when} |`,
    ),
  ].join("\n");
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
  render(summarise(pushes)) +
  "\n\n" +
  readme.slice(to);

if (updated === readme) {
  console.log("No change.");
} else {
  await writeFile(README, updated);
  console.log(`Updated ${README}.`);
}
