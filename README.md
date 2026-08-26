# David Flórez

Founder of **[Renovo](https://userenovo.com)** — AI that handles reviews and content for
independent restaurants. In production, in Spanish and French. Paris / Alicante.

Five years behind a bar before I wrote a line of this. That is the whole edge: I am
building for the person I used to be at 2am, closing the till, with a one-star review
sitting unanswered since Tuesday.

## What lives here

| Surface | What it is |
|---|---|
| [userenovo.com](https://userenovo.com) | The product. Paying restaurants, real reviews. |
| [`skills`](https://github.com/chdavidfm/skills) | Agent Skills I actually run — `github` · `ship` · `absorb` · `verify` · `skill-author` |
| [`rag-agent-lab`](https://github.com/chdavidfm/rag-agent-lab) | Retrieval lab: TF-IDF, dense, RRF fusion, cross-encoder rerank. **Not** the product. |
| `renovo-core` | The repository that runs production. Private. |

## How the work runs

```
brief  →  PR  →  CI  →  merge  →  prod
```

Claude writes the brief. Cursor executes it in the repo. `ship` watches CI until it is
green. `verify` refuses to let "done" through without a command and its output. Nothing
ships on a claim; it ships on evidence measured on a real device or in production.

Three rules I do not bend:

- **Secrets never enter git.** Not once, not in a branch, not "temporarily".
- **The product never shows a number it did not measure.** A fabricated metric on a
  dashboard is worse than an empty state, because the owner will make a decision on it.
- **A green pipeline is not a verified feature.** `curl` proves the server answered. It
  does not prove the restaurant owner can use the screen.

## Recent

<!-- pulse:start -->

_Populated on a schedule from the public events API._

<!-- pulse:end -->

<sub>Written by `scripts/pulse.mjs` on a daily schedule — real commits, no third-party
widget, no external image, nothing that tracks whoever reads this page.</sub>

## Not here

Life notes, venue records, personal data, tokens. Memory is Obsidian. Pipeline is Notion.
GitHub is code and skills — not a second brain.
