# The Pond design system

## Overview

The Pond is a reading board for people following IdentityMD's builders and community. Its visual character follows the requested dark green palette and Pepes armed with AI: two SVG field agents carry a neural visor, AI terminal and scout drone. Cream type and lime controls sit on flat forest surfaces. The feed is the product; supporting copy and illustration stay compact on phones.

The implementation is React and TypeScript with plain CSS. `src/styles.css` owns the system, `src/App.tsx` owns the page and post pattern, and `src/icons.tsx` owns the consistent SVG icon set. `src/model.ts` owns filters, sorting and bookmark parsing. There is one dark theme and one English page with hash navigation.

## Colors

Primitives and semantic aliases are declared together at the beginning of `src/styles.css`. Components use the semantic aliases. Illustration colors live inside the SVG and are separate from interface state colors.

| Semantic token | Value | Role |
| --- | --- | --- |
| `--bg` / `--on-accent` | `#0b1510` | Page background / text on lime fills |
| `--surface` | `#101d15` | Tweet cards and fields |
| `--surface-raised` | `#14241a` | Hero, first tweet, note and modal |
| `--hover` | `#1b3022` | Hover, selected navigation and saved state |
| `--border` | `#2b4231` | Structural separators and card edges |
| `--control-border` | `#658069` | Field boundaries and selected filter outline |
| `--text` | `#edf0df` | Main content and headings |
| `--secondary` | `#c5cdbd` | Supporting text and source actions |
| `--muted` | `#9bac99` | Metadata and secondary utilities |
| `--accent` | `#b8dd82` | Primary action fill and selected icons |
| `--accent-hover` / `--focus` | `#c9e9a0` | Primary hover fill / keyboard ring |

Measured solid pairs include main text on raised surface **13.98:1**, muted metadata on raised surface **6.75:1**, supporting text on raised surface **9.90:1**, field placeholder on field background **7.24:1**, dark text on the primary fill **12.14:1**, and focus color on field background **12.95:1**. Control borders measure **4.01:1** against fields and **3.25:1** against selected-filter fill. See `artifacts/validation.md` for scope and image-related measurement limits.

State is also conveyed by filled bookmark icons, `aria-pressed`, selected outlines, current-page semantics, and visible status text. The snapshot dot is static, not a live-data indicator. There is no light-theme switch or unused status palette.

## Typography

`public/assets/manrope-latin.woff2` is a local variable Manrope face, declared for weights 200–800, normal style, with `font-display: swap`. The interface uses only **400, 600 and 700**. The fallback stack is `Manrope, Arial, sans-serif`. The loaded Manrope face was confirmed through `document.fonts` in Chromium. Its OFL license accompanies it.

| Token | Default size | Use |
| --- | --- | --- |
| `--text-xs` | 0.75rem / 12px | Dense post metadata and utilities |
| `--text-sm` | 0.875rem / 14px | Buttons, author names and supporting copy |
| `--text-body` | 1rem / 16px | Post text, mobile inputs and modal section headings |
| `--text-lg` | 1.25rem / 20px | First desktop tweet and phone feed heading |
| `--text-title` | 1.5rem / 24px | Desktop feed heading, wordmark and modal title |
| `--text-display` | 3rem / 48px | Hero; changes to 2rem / 32px at 720px and below |

The root line height is 1.5. Hero type uses 1.1 line height and −0.045em tracking, adjusted to −0.035em on mobile. Feed headings use 1.3 and −0.025em. Post text uses 1.65, with the first desktop post at 1.6; paragraphs have 12px separation. Headings use balanced wrapping; post paragraphs use pretty wrapping. Text is selectable and critical content is not ellipsized. Engagement and count labels use tabular numerals. Phone input/select text is 16px to avoid input-triggered iOS zoom.

## Layout

The page is capped at 1536px. The desktop shell combines a 224px left navigation column and flexible content; main padding is 32px top, 40px end and 16px start. Below the hero, `.content-layout` divides the feed and 264px contextual sidebar with a 32px gap. Post cards have 24px padding and 16px between them.

The spacing vocabulary is 4, 8, 12, 16, 24, 32 and 40px, also declared as `--space-*` custom properties. Existing component declarations use explicit values from that vocabulary, with a few optical and control-specific dimensions. Reuse these increments instead of introducing unrelated spacing scales.

| Width | Adaptation |
| --- | --- |
| Above 1536px | Centered shell gains thin inline frame edges |
| 1260px and below | Left column becomes 196px, contextual sidebar 230px, gaps/padding tighten |
| 1080px and below | Contextual sidebar and decorative hero caption disappear; feed gets the available width |
| 720px and below | Sidebar becomes an ordinary-flow horizontal navigation row; supporting rail copy disappears; page inset 20px; header utility becomes a named icon link; hero is 142px minimum; hero CTA is omitted and post source actions remain visible |
| 420px and below | Header byline disappears; navigation labels use 12px; hero art narrows to 105px |
| 350px and below | Page inset 16px; post padding 16px; avatars 36px; navigation counts hide; illustration narrows to 65px |

The mobile form uses wrapping flex layout: search grows from a 9rem basis and sort has an 8rem minimum/basis, both bounded by available width. This keeps the active sort readable when text is enlarged. Topic controls wrap when necessary, with decorative icons omitted on phones. The hero can grow with text; only its illustration is clipped. Main content and actions have no fixed-height clipping.

Chromium rendered checks covered 320, 390, 720, 960 and 1440 CSS pixels, plus 200% CSS text enlargement. At 390×844, the first tweet's source action spans y=558–602 and its text starts at y=631. Browser-native zoom and a translated/RTL layout were not inspected.

## Elevation & Depth

This is a flat system. Cards use a structural border without a shadow; the note uses a tonal surface without a border. No text gradients or nested card stacks are used. The hero's grid, circuits and two agents form one SVG scene rather than separate UI effects. Avatars have a subtle 1px white outline at 10% opacity.

The about dialog uses the native top layer and a dark translucent `#060e0acd` backdrop. `body:has(dialog[open])` locks background scrolling. It is at most 85svh tall and scrolls internally. There are no toasts, sticky mobile bars or autoplay effects. The desktop left navigation alone uses sticky positioning.

## Shapes

`--radius-sm: 6px` is for controls and selected rows, `--radius: 12px` for posts and the note, and `--radius-lg: 16px` for hero and dialog. Avatars are circular. Focus outlines are 2px solid with 4px offset; the search wrapper uses a 2px offset. The lime primary action is a compact rectangle with a 6px radius. The frog favicon has its own deliberately rounded square silhouette.

## Components

- **`Icon`**, `src/icons.tsx`: a single outline set, `currentColor`, 1.7px rounded strokes, default 20px. Icons inside named controls are decorative and excluded from the accessibility tree. Selected bookmarks use fill in addition to color.
- **Primary and utility actions**, `src/styles.css`: `.primary-button` is the lime emphasis, with dark text, minimum 44px height and 700 weight. `.external-link` is outlined. `.text-button` is a low-emphasis utility with a hover underline. Hover styles apply only on hover-capable devices. Press scales actions to 0.96; reduced motion removes that transform.
- **Navigation**, `App`: native hash links for Top tweets and Saved tweets, computed counts and `aria-current`. About is a button with a persistent accessible name even when its visible text hides on phones.
- **Search and sort**, `App`: persistent visible labels, native `search` input and `select`, independent query and sort state, and a named clear button. Search and topics combine. Empty results offer Clear filters and restore focus to search.
- **Topic filters**, `App`: native buttons in a named group, each exposing `aria-pressed`. A selected outline/fill mirrors the state. Desktop contextual topic rows invoke the same state.
- **`PostCard`**, `src/App.tsx`: accepts `post`, overall likes `rank`, `saved`, and `onSave`. Author/profile, publication date, original-source action, excerpt/full-post label, topic and recorded engagement remain in a consistent order. The 44px bookmark is separate from read-only engagement numbers. Full engagement labels are accessible text; visual compact numbers are hidden from assistive technology to avoid duplication.
- **About dialog**, `App`: native `showModal()`, title association, close button, Escape and backdrop dismissal, explicit Tab/Shift+Tab wrap, and native trigger focus return. Original sources expand with native `details`; source records download as JSON.
- **Status and recovery**, `App` / `model.ts`: stable polite live regions announce counts and saves. Empty saved state links to the feed. Storage errors disclose that bookmarks are temporary. Invalid stored JSON produces an empty saved list without crashing. The bundled snapshot needs no loading screen or network error state.

Transitions name only background, foreground and border colors, lasting 120ms with `cubic-bezier(.2,0,0,1)`. There is no page-load or endless animation. Reduced-motion and forced-colors CSS are present; reduced motion was tested, forced-colors rendering was not.

## Do's and Don'ts

- Start another surface inside `.app-layout` / `main` and reuse the semantic colors, scale and spacing. Keep substantive content before contextual explanation on phones.
- Use a lime fill for the view's primary action; use source links and outlined or quiet utility actions for peers.
- Keep source actions above the tweet body. Keep author names, full post excerpts and accessible engagement values available.
- Preserve the distinction between structural edges and the higher-contrast `--control-border` token.
- Keep the snapshot date, ranking description and runtime/download source records consistent when changing the collection.
- Do not introduce simulated live numbers, local votes presented as shared engagement, extra font families, global tracked capitals or a wallet flow.

For another feed view, reuse `PostCard` and `filterPosts`, add a normal hash navigation link, keep one main heading hierarchy, and test its empty, keyboard and narrow-screen states. Validate the production export after the change; source inspection alone does not establish rendered behavior.
