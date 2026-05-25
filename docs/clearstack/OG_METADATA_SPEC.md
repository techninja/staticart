# Spec-Driven OG Metadata Generation

## Problem

Every Clearstack site shares links that look blank in messaging apps. No title,
no description, no image. Social crawlers (Slack, Discord, Twitter, iMessage)
only read static HTML — they don't execute JavaScript. Since Clearstack apps are
SPAs with a single `index.html`, every shared link shows the same generic
metadata regardless of the actual page content.

This is a baseline expectation for any web project in 2025. If your link preview
looks sketchy, people don't click.

## Proposal

Clearstack already requires routes to be defined in the app spec with metadata
(title, description). The build system should use this to generate static HTML
shells for each route — just enough for crawlers to read OG tags, while the SPA
still handles rendering for real users.

## How it should work

1. **Spec defines routes with metadata:**

   ```yaml
   routes:
     /traits/:id:
       title: '{trait.emoji} {trait.name} | {app.name}'
       description: '{trait.description}'
       image: '{trait.cover_image.url}'
       data: trait_manifest.traits
   ```

2. **Build reads the spec + data sources:**
   - For static routes (`/about`, `/pricing`): generate one HTML file
   - For dynamic routes (`/traits/:id`): iterate over the data source, generate
     one HTML file per entry

3. **Generated HTML contains:**
   - Correct `<title>` and `<meta name="description">`
   - `og:title`, `og:description`, `og:image`, `og:url`
   - `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
   - The same `<body>` as index.html (SPA takes over client-side)

4. **Deploy serves these files:**
   - Cloudflare Pages / Netlify / Vercel serve the static file if it exists
   - Falls back to `404.html` (SPA) for routes without generated pages

## Requirements

- Zero config for basic cases (route title + description → OG tags)
- Opt-in image support (from data source or static asset)
- Works with any deploy target that supports static files + SPA fallback
- Doesn't require a server or edge function
- Build is fast (64 pages in <1s, 648 pages in <5s)

## Prior art

- Asili's `scripts/build-og.js` — generates 64 trait pages from manifest data
- Next.js `generateMetadata` — server-side, requires Node runtime
- Astro content collections — static generation from markdown frontmatter

## Implementation notes

This could be a `clearstack build` subcommand or a plugin:

```bash
clearstack build og          # Generate OG pages from spec
clearstack build             # Full build including OG
```

The spec parser already knows all routes. The data source connection is the new
piece — reading from JSON manifests, markdown frontmatter, or API responses at
build time.

## Open questions

- Should this live in core clearstack or as an optional plugin?
- How to handle routes that need auth/user data (skip them? generic fallback?)
- Image generation (dynamic OG images with text overlay) — future scope?
