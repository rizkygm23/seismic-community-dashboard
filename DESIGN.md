---
version: alpha
name: Seismic-design-analysis
source: https://www.seismic.systems/
captured_at: 2026-05-24
description: |
  Seismic's public site is a restrained fintech/blockchain system: white canvas, near-black ink, muted plum accents, premium Swiss grotesk typography, and a few editorial serif headlines. The interface feels like regulated financial software rather than a crypto landing page. Most surfaces are white or soft gray panels with 1px borders, 4-12px radius, and very light shadows. Brand energy comes from the mauve/plum accent, glassy product mockups, precise financial labels, and privacy-themed redaction dots.

colors:
  white: "#ffffff"
  canvas: "#fcfcfc"
  ink: "#161616"
  charcoal: "#282826"
  plum-deep: "#523542"
  plum: "#825a6d"
  gray-900: "#282826"
  gray-600: "#737373"
  gray-400: "#a4a3a1"
  gray-300: "#d4d4d4"
  gray-200: "#e8e8e8"
  panel-tint: "rgba(232, 232, 232, 0.5)"
  overlay: "rgba(209, 209, 209, 0.8)"
  glass: "rgba(255, 255, 255, 0.7)"
  glass-strong: "rgba(255, 255, 255, 0.85)"
  dark-ui: "#131014"
  brand-glow: "rgba(129, 90, 109, 0.7)"
  hairline: "rgba(22, 22, 22, 0.12)"

typography:
  font-sans: "Inter, SuisseIntl-Regular, system-ui, sans-serif"
  font-sans-medium: "Inter, SuisseIntl-Medium, system-ui, sans-serif"
  font-serif: "SuisseWorks-Regular-WebS, Georgia, serif"
  display-xl:
    fontFamily: "{typography.font-serif}"
    fontSize: 52px
    fontWeight: 400
    lineHeight: 120%
    letterSpacing: -0.04em
  display-lg:
    fontFamily: "{typography.font-serif}"
    fontSize: 45px
    fontWeight: 400
    lineHeight: 120%
    letterSpacing: -0.04em
  heading-lg:
    fontFamily: "{typography.font-sans}"
    fontSize: 32px
    fontWeight: 400
    lineHeight: 130%
    letterSpacing: -0.01em
  heading-md:
    fontFamily: "{typography.font-sans}"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 130%
    letterSpacing: -0.01em
  body-lg:
    fontFamily: "{typography.font-sans}"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 150%
    letterSpacing: 0
  body-md:
    fontFamily: "{typography.font-sans}"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 150%
    letterSpacing: 0
  body-sm:
    fontFamily: "{typography.font-sans}"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 150%
    letterSpacing: 0
  label:
    fontFamily: "{typography.font-sans-medium}"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 160%
    letterSpacing: 0.05em
  micro:
    fontFamily: "{typography.font-sans}"
    fontSize: 10px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0

rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 8px
  lg: 12px
  full: 999px

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  section: 96px
  page-gutter-desktop: 40px
  page-gutter-tablet: 32px
  page-gutter-mobile: 16px

effects:
  panel-shadow: "0px 4px 10px rgba(0, 0, 0, 0.15)"
  small-shadow: "0px 2.65px 10px rgba(0, 0, 0, 0.15)"
  plum-glow: "0px 15px 50px rgba(129, 90, 109, 0.7)"
  inset-soft: "inset 1px 2px 8px rgba(0, 0, 0, 0.04)"
  hero-gradient: "linear-gradient(#fff 13.517%, rgba(130, 90, 109, 0.10) 52.3543%, #fff 94.8955%)"
  glass-gradient: "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.70) 100%)"

components:
  page:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    maxWidth: 1200px
    gutterDesktop: "{spacing.page-gutter-desktop}"
    gutterTablet: "{spacing.page-gutter-tablet}"
    gutterMobile: "{spacing.page-gutter-mobile}"
  primary-nav:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    height: 72px
    borderColor: "{colors.hairline}"
  primary-button:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 12px 18px
  secondary-button:
    backgroundColor: "{colors.white}"
    textColor: "{colors.plum}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    borderColor: "{colors.hairline}"
    padding: 12px 18px
  hero-eyebrow:
    textColor: "{colors.plum}"
    typography: "{typography.label}"
    textTransform: uppercase
  hero-headline:
    textColor: "{colors.ink}"
    typography: "{typography.display-xl}"
  hero-copy:
    textColor: "{colors.gray-600}"
    typography: "{typography.body-lg}"
  glass-product-panel:
    background: "{effects.glass-gradient}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.lg}"
    shadow: "{effects.panel-shadow}"
  account-card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    borderColor: "{colors.hairline}"
    shadow: "{effects.small-shadow}"
    padding: 16px
  redacted-value:
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    pattern: "privacy dots or masked account numbers"
  pill:
    backgroundColor: "{colors.gray-200}"
    textColor: "{colors.ink}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: 4px 8px
  footer:
    backgroundColor: "{colors.dark-ui}"
    textColor: "{colors.gray-300}"
    linkColor: "{colors.white}"
    typography: "{typography.body-sm}"
---

## Overview

Seismic's site uses a premium financial-software language: calm white space, near-black typography, muted plum accents, and product mockups that look like banking infrastructure rather than crypto dashboards. The brand line is privacy-enabled blockchain, but the visual system avoids neon, cyberpunk, and terminal motifs. It should feel precise, regulated, and useful.

The strongest visual cues are the serif hero headline, compact Swiss-style navigation, 1px bordered product panels, small-radius buttons, and masked financial details. Purple is not a loud gradient theme; it is a restrained accent used for brand marks, links, glows, and occasional section atmosphere.

## Source Notes

Extracted from `https://www.seismic.systems/` on May 24, 2026. The site is a Framer build. Visible tokens include:

- `#ffffff`, `#fcfcfc`, `#161616`, `#282826`
- `#523542` deep plum and `#825a6d` mauve/plum
- `#737373`, `#a4a3a1`, `#d4d4d4`, `#e8e8e8`
- `Inter`, `SuisseIntl-Regular`, `SuisseIntl-Medium`, and `SuisseWorks-Regular-WebS`
- type sizes from `10px` through `52px`, with `120%`, `130%`, `150%`, and `160%` line heights
- radii `2px`, `4px`, `8px`, `12px`, and pill radius
- shadows including `0 4px 10px rgba(0,0,0,0.15)` and plum glow `0 15px 50px rgba(129,90,109,0.7)`

## Visual Direction

Use Seismic as a white, editorial fintech shell with dark data surfaces only where the product benefits from contrast. Keep the dashboard quiet: white page background, black text, gray supporting copy, and plum as a focused accent. Avoid full-page dark themes unless the view is explicitly a technical console or NFT media preview.

The current community dashboard can preserve its data-heavy structure, but should move toward this system:

- Replace heavy black/purple gradients with white or `#fcfcfc` page surfaces.
- Use `#161616` for primary text and action fills.
- Use `#825a6d` for brand accent, active states, chart highlights, role accents, and subtle glows.
- Prefer 1px borders and small shadows over thick outlines or intense neon effects.
- Keep cards and controls at `4px` to `12px` radius.
- Use real product/data visuals as the main visual interest: leaderboards, account-style stats, privacy masks, and clean charts.

## Typography

Primary UI text should use `Inter` or `Suisse Intl` equivalents. Headlines can use `Suisse Works`/Georgia for the Seismic editorial feel, especially first-viewport headings and major section titles. Body and dashboard labels should remain sans-serif for scan speed.

Recommended mapping:

- Page hero: serif, `45-52px`, `120%`, `-0.04em`.
- Section headings: sans, `24-32px`, `130%`, `-0.01em`.
- Body: sans, `16-18px`, `150%`.
- Labels and nav: sans medium, `12-14px`, `0.05em` only for small uppercase labels.
- Micro product text: `10-12px`, line-height `16px`, used sparingly inside mock account panels.

Do not use negative tracking on compact cards or buttons. Reserve it for large editorial headlines.

## Color Usage

White is the dominant color. `#fcfcfc` is an alternate canvas for slight section separation, not a full beige theme. `#161616` is both text and primary CTA fill. `#523542` and `#825a6d` define the brand accent range; use the deeper plum for dense states and mauve for active links, highlights, and glows.

Neutral grays should carry hierarchy:

- `#737373` for secondary body text.
- `#a4a3a1` for tertiary metadata.
- `#d4d4d4` for footer copy or disabled text.
- `#e8e8e8` for soft fills, pills, and separators.

Avoid saturated purple-blue gradients, bright crypto greens, and large black blocks. Success/danger colors may exist for app states, but they should be less visually dominant than the brand palette.

## Layout

Pages should use a centered max width around `1200px`, with desktop gutters near `40px`, tablet `32px`, and mobile `16px`. Section rhythm is generous, typically around `96px` between major bands on desktop, compressed on mobile.

The nav is simple: logo left, compact links right, white background, no heavy underline system. Hero layouts should place the product/brand immediately in view, using a large headline and a product mockup or data panel instead of a generic marketing card.

Dashboard pages should prioritize dense information but keep generous row spacing and clear borders. Use full-width bands or unframed content areas; reserve cards for actual repeated records, charts, modals, and framed tools.

## Component Guidance

Buttons are small-radius rectangles. Primary buttons are black with white text. Secondary buttons are white with a hairline border and plum or ink text. Hover states should be subtle: slight background tint, lower opacity, or border darkening.

Cards and panels use white backgrounds, `1px` hairline borders, `8-12px` radius, and restrained shadows. Large feature panels can use glassy white gradients and a faint plum glow, but this should be rare. For dashboard cards, prefer clean borders and a tiny shadow.

Tables and stat rows should borrow the account-panel language: labels like Balance, Account Number, Routing Number, Onchain, and masked values. Privacy can be expressed with dot masks and redacted details instead of lock-heavy iconography.

Badges and pills use soft gray backgrounds, black text, and pill radius. Role/magnitude badges can introduce plum or role-specific color, but keep the base neutral.

## Motion

Motion should be slow, polished, and infrastructural. Framer uses subtle appear animations with opacity, small vertical movement, and scale settling. For this app:

- Use fades and `y: 10-40px` entrance motion for major sections.
- Use short hover transitions around `150-250ms`.
- Avoid jittery terminal effects or constant animated gradients.
- Reserve stronger motion for NFT/video previews where the artifact itself is the focus.

## Imagery

Use screenshots, product mockups, account panels, data visualizations, partner/logo strips, and realistic financial infrastructure motifs. Avoid abstract crypto art as the primary visual. When showing privacy, use masked account numbers, dot strings, translucent overlays, and careful redaction.

## Implementation Notes For This Repo

This dashboard already has Seismic-specific data and NFT surfaces. Bring it closer to the source brand by:

- Updating CSS variables toward the tokens in this file.
- Replacing dominant dark gradients with white/off-white surfaces.
- Keeping black primary CTAs and plum accents.
- Using serif only for high-level page headings, not for dense dashboard data.
- Making leaderboard/search/stat cards feel like financial account panels: bordered, compact, precise.
- Keeping NFT media previews visually richer, but framed by the quieter Seismic UI shell.
