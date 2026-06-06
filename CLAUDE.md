# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start local development preview against a live Shopify store
shopify theme dev

# Push theme to store without previewing
shopify theme push

# Pull latest theme settings from store
shopify theme pull
```

There is no build step, bundler, or test suite — the Shopify CLI handles all asset delivery.

## Architecture

This is a custom Shopify theme built on the [Skeleton Theme](https://github.com/Shopify/skeleton-theme). The niche is automotive car care (skin-car brand).

### CSS loading order

1. **`snippets/css-variables.liquid`** — rendered inline in `<head>` via `{% render 'css-variables' %}`. Translates `settings.*` values from `config/settings_schema.json` into `:root` CSS custom properties.
2. **`assets/critical.css`** — global reset and base element styles (body, button, inputs). Loaded with `preload` for performance. Only put styles here that are needed on every page.
3. **`{% stylesheet %}` tags** — per-section/block CSS, scoped by class name. Shopify deduplicates these if the same section appears multiple times.

### Design tokens (CSS variables)

All design tokens live in `snippets/css-variables.liquid` and are driven by theme settings:

| Variable | Setting ID |
|---|---|
| `--color-background` / `--color-background-text` | `color_background` / `color_background_text` |
| `--color-highlight` / `--color-highlight-text` | `color_highlight` / `color_highlight_text` |
| `--color-accent` / `--color-accent-text` | `color_accent` / `color_accent_text` |
| `--page-width` | `max_page_width` |
| `--page-margin` | `min_page_margin` |
| `--style-border-radius-inputs` | `input_corner_radius` |
| `--style-border-radius-buttons` | `button_corner_radius` |

Always use these variables in section/block CSS rather than hardcoded values.

### Global settings schema

`config/settings_schema.json` defines the theme-level settings (Typography, Layout, Colors) visible in the Shopify theme editor. Adding a new global setting requires three steps: add the setting to `settings_schema.json`, expose it as a CSS variable in `css-variables.liquid`, and consume the variable in the relevant CSS.

### Section schema patterns

From the README — follow these conventions when wiring schema settings to CSS:

- **Single CSS property** → inline CSS variable on the element, consumed via `var()` in the stylesheet block.
- **Multiple CSS properties** → a `select` setting whose values are CSS class names applied directly to the element.

Section-level overrides (e.g. per-section margins) go in a `{% style %}` block scoped to `#shopify-section-{{ section.id }}` to avoid bleeding into other sections.

### Required settings for every section

Every section must include these schema settings and apply them in the Liquid:

**1. Color scheme** — lets the merchant pick a predefined colour pack in the theme editor:

```json
{
  "type": "color_scheme",
  "id": "color_scheme",
  "label": "Color scheme",
  "default": "scheme-1"
}
```

Apply it in HTML as two elements — a full-bleed background layer and the section container:

```liquid
<div class="section-background color-{{ section.settings.color_scheme }}"></div>
<div class="my-section full-width color-{{ section.settings.color_scheme }}">
```

Use `var(--color-background)`, `var(--color-foreground)`, `var(--color-border)`, etc. in CSS — these are automatically scoped by the scheme class. Never hardcode colour values or use `var(--color-highlight)` / `var(--color-accent)` directly in new sections.

**2. Spacing** — top and bottom margin control:

```json
{
  "type": "range",
  "id": "margin_top",
  "label": "Top margin",
  "min": 0, "max": 10, "step": 0.5, "unit": "rem", "default": 4
},
{
  "type": "range",
  "id": "margin_bottom",
  "label": "Bottom margin",
  "min": 0, "max": 10, "step": 0.5, "unit": "rem", "default": 4
}
```

Applied in `{% style %}`:

```liquid
{% style %}
  #shopify-section-{{ section.id }} {
    margin-top: {{ section.settings.margin_top }}rem;
    margin-bottom: {{ section.settings.margin_bottom }}rem;
  }
{% endstyle %}
```

### Section heading design pattern

Section headings sit **outside** the section's styled container (e.g. a coloured background box) but remain part of the same Shopify section. The heading renders before the container div, uses `--color-foreground` (the page body text colour), and is constrained to the page width with `padding-inline: var(--page-margin)` and `max-width: var(--page-width); margin-inline: auto`.

```liquid
{%- if section.settings.heading != blank -%}
  <h2 class="my-section__heading">{{ section.settings.heading }}</h2>
{%- endif -%}

<div class="my-section full-width">
  <div class="my-section__inner">
    ...
  </div>
</div>
```

```css
.my-section__heading {
  text-align: center;
  color: var(--color-foreground);
  padding-inline: var(--page-margin);
  max-width: var(--page-width);
  margin-inline: auto;
  margin-bottom: 2rem;
}
```

Section spacing (`margin-top` / `margin-bottom`) is applied to `#shopify-section-{{ section.id }}` directly so it wraps both the heading and the container as one unit.

### Localisation

Section and block schema labels use `t:` translation keys (e.g. `"label": "t:labels.page_width"`). Keys are defined in `locales/en.default.schema.json`. Plain English strings in schemas are fine for custom sections that won't be translated.

### Layout

`layout/theme.liquid` is the single page shell. It renders:
- `snippets/css-variables` (inline, before any CSS)
- `critical.css` (preloaded)
- `sections 'header-group'` → `sections 'footer-group'` around `content_for_layout`

Page structure is defined by JSON templates in `templates/` which reference sections by name.

## Design inspiration: Car Detailing Theme Export

The reference export of a fully built car detailing Shopify theme lives outside the repo at `~/.claude/reference/car-detailing/`. Use the `/inspiration <topic>` skill to search it — it is completely invisible to Shopify CLI.

### `/inspiration <topic>` skill

Invoke `/inspiration hero` (or any keyword) to search the reference theme and get a focused summary of relevant patterns. The skill greps sections, snippets, and blocks by content and filename, reads the best matches, and returns only what is useful for implementation — adapted to skin-car's CSS variable conventions.
