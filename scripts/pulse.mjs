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

/** One row per repository: newest public push. The events API often omits
 *  `payload.commits`; fall back to the commit at `payload.head`. */
async function summarise(pushes) {
  const seen = new Map();
  const headers = { Accept: "application/vnd.github+json", "User-Agent": USER };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  for (const push of pushes) {
    const full = push.repo?.name;
    if (!full || !full.startsWith(`${USER}/`) || seen.has(full)) continue;

    const commits = push.payload?.commits ?? [];
    let subject = "";
    if (commits.length > 0) {
      subject = String(commits[commits.length - 1].message || "")
        .split("\n")[0]
        .trim();
    } else if (push.payload?.head) {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${full}/commits/${push.payload.head}`,
          { headers },
        );
        if (response.ok) {
          const data = await response.json();
          subject = String(data.commit?.message || "")
            .split("\n")[0]
            .trim();
        }
      } catch {
        /* leave subject empty; skip the row */
      }
    }
    if (!subject || subject.startsWith("pulse:")) continue;

    const short = full.replace(`${USER}/`, "");
    seen.set(full, {
      repo: short,
      subject: subject.length > 72 ? `${subject.slice(0, 71)}…` : subject,
      when: push.created_at.slice(0, 10),
    });
    if (seen.size === MAX_ROWS) break;
  }
  return [...seen.values()];
}

function render(rows) {
  if (rows.length === 0) {
    return "Nada pusheado en público en este tramo. El repo de producto es privado.";
  }
  return [
    "| Repo | Último cambio | Fecha |",
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
  render(await summarise(pushes)) +
  "\n\n" +
  readme.slice(to);

if (updated === readme) {
  console.log("No change.");
} else {
  await writeFile(README, updated);
  console.log(`Updated ${README}.`);
}
