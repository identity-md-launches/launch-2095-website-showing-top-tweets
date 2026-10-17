# The Pond

A dark green community board for top tweets about IdentityMD, with two illustrated Pepe agents equipped with AI gear. Browse eight sourced posts, search names and text, filter by topic, sort by recorded engagement or date, and save posts in your browser.

The published site is the complete static export in **`dist/`**. It needs no backend, credentials, wallet connection or remote assets.

## Install, develop and preview

Use Node.js 24 and npm. Dependencies are pinned in `package-lock.json`.

```sh
npm ci
npm run dev
```

To rebuild and preview the production export:

```sh
npm run typecheck
npm run build
npm run preview
```

Open the local address printed by Vite. Serve `dist/` through an HTTP static server, rather than opening `index.html` with `file://`. Vite uses `base: './'`; scripts, styles, images, fonts and the downloadable source records use relative URLs. Navigation uses URL hashes, so gateway subpaths do not need server rewrites. The production export is included alongside the source and lockfile; publishing does not require a rebuild.

## Data and updating the collection

This is a **17 October 2026 snapshot**, not a live feed or an exhaustive ranking of X. The posts were selected from public IdentityMD conversations and retrieved through the public FxTwitter API. The default ranking is recorded likes within this collection; ties use publication time. “Most reposted” and “Newest” offer alternate orders. Each post keeps its overall likes rank and an original X link. Engagement numbers are read-only snapshots, not local like buttons.

- `src/posts.json` contains the displayed text, topic, author, engagement counts and original URL. Short excerpts are labeled, and none exceeds 25 quoted words per source post.
- `artifacts/sources.json` records retrieval URLs, publication dates, counts and avatar sources. `public/sources.json` is the downloadable runtime copy; keep them identical when updating.
- `public/assets/` holds local avatars, the SVG illustration, favicon, Manrope font and PNG share image. The editable share-card SVG is `src/assets/og-card.svg`.
- Bookmarks use `localStorage` key `the-pond:saved:v1`. They are local to this browser. A storage failure shows an in-memory fallback notice, and malformed stored values are ignored.

When changing posts, update the snapshot date and the collection description in `src/App.tsx`, refresh both source-record copies and local avatars, then rebuild and validate. Original media and full conversations remain available on X. Opening those destinations may require an X session.

## Validation

```sh
npx playwright install chromium
npm run validate
```

The delivered `scripts/validate.mjs` starts and closes its own HTTP server, serves the actual `dist/` at `/preview/`, and writes disposable results/screenshots under `test/scratch/interaction/`. It checks search, combined filters, sorting, source navigation/downloads, saved posts, reloads, browser history, keyboard access, modal focus, empty states, storage failures, metadata, responsive widths and accessibility. It attempts WebKit separately and reports an unavailable runtime as a limitation.

Actual final results on 17 October 2026:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed, exit 0 |
| `npm run build` | Passed, exit 0; production export written |
| `npm run validate` | 20/20 Chromium interaction groups passed |
| axe feed and open-dialog scans | 0 violations; 0 incomplete checks |
| Pinned `taste@1` probe, offline | 16/16 checks passed at 320, 390 and 1440 wide |
| Responsive interaction checks | No horizontal overflow at 320, 390, 720, 960 and 1440 |
| 200% CSS text enlargement | Passed, including the selected sort label |
| `npm audit --json` | 0 reported vulnerabilities |
| WebKit | Could not launch: required system libraries unavailable |

The final build and typecheck ran against a temporary copy of the source and lockfile with dependencies installed outside the repository. Interaction validation and the pinned probe then inspected the repository's actual `dist/`. The pinned probe command was `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline`, using an externally installed Playwright module. Pinned inputs and scratch outputs are removed by the assignment; portable result summaries and representative screenshots are retained in `artifacts/`.

See [the six-domain review and limitations](artifacts/validation.md), [design system](DESIGN.md), and [submission size record](artifacts/submission-size.json). These are worker checks, not independent certification. Screen-reader sessions, physical phones, browser-native zoom, and a successful Safari/WebKit run were not performed. X navigation was checked for its exact destination; remote X page rendering was not certified. No `.gitignore` was created or modified, and no dependency/cache directories are included in the delivery.

## Design and attribution

The visual system uses forest green surfaces, warm cream text, lime action fills, a local Manrope variable font, and original SVG Pepe field agents. [DESIGN.md](DESIGN.md) documents the final tokens, component states and breakpoints.

Design review followed the pinned Better Interface guidance adapted from [Jakub Krehel's Better Interface](https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface), MIT. Documentation followed the pinned method adapted from [Paul Bakaus's Impeccable](https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md), Apache-2.0. License texts are retained in `artifacts/licenses/`. Manrope's OFL notice is `public/assets/FONT-LICENSE.txt`. Post text and avatars are attributed to their original authors through each source link.
