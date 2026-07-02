# The Help Page, End to End

> **This file is the source of truth for how the Help page works.**
> It is written for someone who already knows **HTML, CSS, and JavaScript** but has
> never touched **Shopify** or its templating language, **Liquid**.
>
> Read it top to bottom once. After that, use the section numbers (§1, §2, …) as
> anchors — the code blocks below contain comments like `{# see §7 #}` that point
> you to the section where that thing is explained in depth.

---

## Table of contents

| # | Section | What you'll learn |
|---|---------|-------------------|
| §1 | [The 30-second summary](#1-the-30-second-summary) | What the page is, in one breath |
| §2 | [Shopify for web developers](#2-shopify-for-web-developers) | The mental model: Liquid + the 5 file types |
| §3 | [The request flow (big picture)](#3-the-request-flow-big-picture) | URL → HTML, the whole chain |
| §4 | [`layout/theme.liquid` — the shell](#4-layoutthemeliquid--the-shell) | The `<html>` document every page lives in |
| §5 | [`templates/page.help.json` — the page JSON](#5-templatespagehelpjson--the-page-json) | **"The JSON you add for a page"** |
| §6 | [`sections/main-page.liquid` — the title section](#6-sectionsmain-pageliquid--the-title-section) | The block container that holds the page header |
| §7 | [The title block + renderer](#7-the-title-block--its-renderer) | `blocks/text.liquid` + `snippets/text.liquid` |
| §8 | [`sections/faq.liquid` — the FAQ accordion](#8-sectionsfaqliquid--the-faq-accordion) | The custom, hand-written part of the page |
| §9 | [The styling engine](#9-the-styling-engine-css-variables--color-schemes) | CSS variables & color schemes |
| §10 | [The actual colors of this page](#10-the-actual-colors-of-this-page) | Concrete hex values, layer by layer |
| §11 | [Worked example: a visitor opens the page](#11-worked-example-a-visitor-opens-the-page) | Step-by-step trace, including a click |
| §12 | [Cookbook: how to change things](#12-cookbook-how-to-change-things) | Recipes for the common edits |
| §13 | [File map & glossary](#13-file-map--glossary) | Every file in the flow, one line each |

---

## §1 The 30-second summary

The Help page is a Shopify **page** whose URL is something like `/pages/ajuda`. When a
visitor requests it, Shopify assembles the final HTML from small files:

1. A **layout** (`layout/theme.liquid`, §4) is the outer `<html>…</html>` shell.
2. A **template** (`templates/page.help.json`, §5) is a JSON file that lists which
   **sections** appear on this page and in what order. Here it lists two:
   - `main-page` (§6) → renders the page **title** ("Ajuda") via a **text block** (§7).
   - `faq` (§8) → the custom accordion of questions & answers.
3. Each section's look comes from **CSS variables** that are produced by the active
   **color scheme** (§9), so the merchant can re-colour everything from the theme editor
   without touching code.

There is **no framework, no build step, and almost no JavaScript**. The accordion is
built from the native HTML `<details>`/`<summary>` elements and animated purely in CSS.

---

## §2 Shopify for web developers

If you know HTML/CSS/JS, here is the whole mental model you need.

### §2.1 Liquid = HTML with a server-side templating language

Every `.liquid` file is HTML with two extra delimiters that Shopify's servers evaluate
**before** sending HTML to the browser (like PHP or Handlebars):

```liquid
{{ output_something }}      {# prints a value into the HTML #}
{% do_some_logic %}         {# a tag: if/for/assign/render… prints nothing itself #}
{# this is a Liquid comment, stripped from the output #}
```

- `{{ block.settings.question }}` → prints the text the merchant typed.
- `{% if x %}…{% endif %}`, `{% for item in list %}…{% endfor %}` → control flow.
- `{% assign name = value %}` → declare a variable.
- `{{ 'Baradig-Bold.otf' | asset_url }}` → the `|` is a **filter** (a function);
  `asset_url` turns a filename into a full CDN URL. Filters chain: `{{ x | a | b }}`.

By the time the browser receives the page, **all Liquid is gone** — it's plain HTML, CSS,
and JS. Liquid only runs on Shopify's server at request time.

### §2.2 The five file types (all you need for this page)

| Folder | What it is | Analogy | This page uses |
|--------|------------|---------|----------------|
| `layout/` | The `<html>` shell wrapping every page | The master template | `theme.liquid` (§4) |
| `templates/` | Per-URL config: **which sections** render | The page's "playlist" | `page.help.json` (§5) |
| `sections/` | A self-contained band of UI + its own CSS + its editor settings | A web component | `main-page.liquid` (§6), `faq.liquid` (§8) |
| `blocks/` | A reusable sub-unit that lives **inside** a section | A child component | `text.liquid` (§7) |
| `snippets/` | A shared partial you `{% render %}` to avoid repetition | An `#include` / helper function | `text`, `css-variables`, `color-schemes`, … (§7, §9) |

### §2.3 How files pull each other in

Four tags do the wiring. You'll see all of them in this flow:

```liquid
{% sections 'header-group' %}   {# render a GROUP of sections (defined by a *.json in sections/) #}
{{ content_for_layout }}        {# the template's sections get injected HERE, inside the layout #}
{% content_for 'blocks' %}      {# a section renders ITS blocks HERE #}
{% render 'text', block: block %}  {# include a snippet, passing it variables (isolated scope) #}
```

> **Key idea:** `{% render %}` gives the snippet a *fresh* scope — it only sees the
> variables you explicitly pass. That's why you'll see `block: block` handed over
> everywhere (§7.1).

### §2.4 `{% schema %}` — how a file becomes editable in the admin

At the bottom of every section/block file is a `{% schema %}…{% endschema %}` block
containing **JSON**. It declares the settings the merchant can change in the visual theme
editor (text fields, colour pickers, range sliders, checkboxes). Whatever the merchant
sets is then readable in the Liquid above as `section.settings.<id>` or
`block.settings.<id>`.

So there are **two layers of "settings"**:

- **Global** → `settings.*` (defined in `config/settings_schema.json`, stored in
  `config/settings_data.json`). Theme-wide things like fonts and the colour schemes.
- **Local** → `section.settings.*` / `block.settings.*` (defined in that file's own
  `{% schema %}`). Per-instance things like this FAQ's heading.

### §2.5 `{% stylesheet %}` and `{% style %}` — two ways to ship CSS

```liquid
{% stylesheet %}  /* plain CSS. Shopify collects it, de-duplicates it, and bundles it.
                     CANNOT contain Liquid. Scope it yourself with class names. */ {% endstylesheet %}

{% style %}       /* an inline <style> tag that CAN contain Liquid, so you can inject
                     per-section values like the section's unique id. */ {% endstyle %}
```

You use `{% style %}` when the CSS needs a Liquid value (e.g. a unique
`#shopify-section-{{ section.id }}` selector, §8.2); otherwise `{% stylesheet %}` (§8.4).

---

## §3 The request flow (big picture)

Here is the entire journey from a browser request to painted pixels. Each box names the
file and the section of this doc that covers it.

```
Browser requests  /pages/ajuda
        │
        ▼
Shopify looks up the page → its template is "page.help"
        │
        ▼
templates/page.help.json   ……………………………………  §5   (the JSON: "render these sections, in this order")
        │   order: [ "main", "faq" ]
        │
        ▼
layout/theme.liquid        ……………………………………  §4   (wraps everything in <html>…</html>)
        │   <head> builds the CSS variables…………  §9
        │   <body> renders header, then ↓ content_for_layout
        │
        ├─►  section "main"  → sections/main-page.liquid …  §6
        │         └─ block "heading" (type: text) … §7
        │              └─ snippets/text.liquid  →  <h1>Ajuda</h1>
        │         └─ block "page-content"  (the page body, if any)
        │
        └─►  section "faq"   → sections/faq.liquid ………… §8
                  └─ blocks q1…q5 (type: faq_item) → <details> accordions
        │
        ▼
Final HTML + bundled CSS sent to the browser → painted
        │
        ▼
User clicks a question → native <details> toggles → CSS animates it open (§8.5). No JS.
```

The next sections walk each box in order.

---

## §4 `layout/theme.liquid` — the shell

**File:** `layout/theme.liquid` · **Role:** the single `<html>` document that *every*
page (product, collection, this Help page, …) is rendered inside. The template's content
is dropped into it at `{{ content_for_layout }}`.

### §4.1 The `<head>`: building styles before any pixels paint

```liquid
<head>
  {%- render 'meta-tags' -%}
  {%- render 'stylesheets' -%}          {# links base.css (the global stylesheet) #}
  {%- render 'fonts' -%}
  {%- render 'scripts' -%}
  {%- render 'theme-styles-variables' -%}  {# defines --font-h1--size, etc. from settings #}
  {%- render 'color-schemes' -%}        {# turns each colour scheme into --color-* vars …… §9.3 #}
  {%- render 'css-variables' -%}        {# skin-car brand bridge + font overrides ………… §9.2 #}

  {{ content_for_header }}              {# Shopify injects required <script>/<meta> here #}
</head>
```

**Order matters.** `color-schemes` (§9.3) runs first to define the colour variables, then
`css-variables` (§9.2) runs to override a few of them with skin-car brand values (e.g. it
swaps the H1 font to the brand font). Last write wins, so the brand file is rendered last
on purpose.

### §4.2 The `<body>`: header, main, footer

```liquid
<body class="page-width-{{ settings.page_width }} …">
  {% render 'skip-to-content-link', href: '#MainContent', … %}   {# a11y skip link #}

  <div id="header-group">
    {% sections 'header-group' %}      {# the site-wide nav/announcement bar (shared by all pages) #}
  </div>

  <script> /* … inline header-height math … see §4.3 … */ </script>

  <main id="MainContent" … data-template="{{ template }}">
    {{ content_for_layout }}           {# ★ THE HELP PAGE'S SECTIONS RENDER HERE ★  → §5 #}
  </main>

  <footer>{% sections 'footer-group' %}</footer>

  {% render 'search-modal' %}
</body>
```

`{{ content_for_layout }}` is the seam between the shell and the page. For our URL,
Shopify fills it with the two sections listed in `page.help.json` (§5).

### §4.3 The only JavaScript in the shell (and it's not for the FAQ)

The `<script>` block (lines 50–115) is an **IIFE** (`(function(){…})()`) that measures the
header's height and writes it into CSS variables (`--header-height`,
`--header-group-height`) on `document.body`. This prevents **layout shift** — content
below the sticky header can reserve the right amount of space immediately instead of
"jumping" once the header finishes laying out.

> This script has **nothing to do with the Help page content**. The Help page itself
> (title + FAQ) ships **zero** JavaScript. Keep that in mind in §8 — the accordion is
> pure HTML + CSS.

---

## §5 `templates/page.help.json` — the page JSON

**File:** `templates/page.help.json` · **Role:** the heart of "adding a page." This is the
JSON the goal refers to with *"it's normal to add a json about a page."* It does **not**
contain HTML — it's a **configuration object** that says *"on this page, render these
sections, with these settings, in this order."*

### §5.1 How a `.json` template gets used at all

The filename encodes the binding:

- `templates/page.json` → the **default** template for any Shopify page.
- `templates/page.help.json` → an **alternate** template named `help`. A page only uses
  it if, in the Shopify admin, that page's **Theme template** dropdown is set to `help`.
  (That admin step is the one thing not visible in the codebase.)

So the chain is: *admin page "Ajuda" → template `help` → this file.*

### §5.2 The shape of the file (annotated)

The whole file is one JSON object with two top-level keys: `sections` (a map of what to
render) and `order` (the sequence). Here it is, trimmed and commented:

```jsonc
{
  "sections": {

    "main": {                      // ← an instance id we made up; referenced in "order" below
      "type": "main-page",         // ← which file: sections/main-page.liquid  …………………… §6
      "blocks": {
        "heading": {               // ← block instance id
          "type": "text",          // ← which block file: blocks/text.liquid  ……………………… §7
          "settings": {
            "text": "<h1>{{ closest.page.title }}</h1>",  // prints the page's admin title → §7.2
            "type_preset": "h1",   // ← styles it as an H1 (this is what actually sizes it) §7.3
            "font": "var(--font-body--family)",  // ← INERT here — only used if type_preset=="custom" §7.3
            "font_size": "1rem",                  // ← INERT here, same reason §7.3
            "color": "var(--color-foreground)",   // ← becomes the inline --color §7.3
            "alignment": "left", "width": "100%", "max_width": "normal"
          }
        },
        "page-content": {          // the page's rich-text body (empty on Help, but wired up)
          "type": "page-content", "settings": {}
        }
      },
      "block_order": ["heading", "page-content"],   // order of blocks WITHIN this section
      "settings": {
        "color_scheme": "",        // ← EMPTY → inherits the :root scheme (scheme-1) ……………… §10
        "padding-block-start": 40, // top padding in px (consumed in §6)
        "padding-block-end": 24
      }
    },

    "faq": {                       // ← the second section instance
      "type": "faq",               // ← sections/faq.liquid  ……………………………………………………… §8
      "blocks": {
        "q1": { "type": "faq_item", "settings": {
                  "question": "Como devo lavar o meu carro sem riscar a pintura?",
                  "answer": "<p>Usa o método dos dois baldes…</p>",
                  "open_by_default": true } },     // q1 starts expanded → §8.3
        "q2": { "type": "faq_item", "settings": { "question": "…", "answer": "…" } },
        "q3": { "...": "…" }, "q4": { "...": "…" }, "q5": { "...": "…" }
      },
      "block_order": ["q1","q2","q3","q4","q5"],   // the order the questions appear
      "settings": {
        "margin_top": 1, "margin_bottom": 0,       // section spacing in rem → §8.2
        "color_scheme": "skin-car-schema",         // ← the light-grey band scheme → §10
        "heading": "", "subheading": ""            // empty → the FAQ header is hidden → §8.3
      }
    }
  },

  "order": ["main", "faq"]          // ★ render "main" first, then "faq" ★
}
```

### §5.3 The four things to understand about this file

1. **`type` is a filename.** `"type": "faq"` means "render `sections/faq.liquid`."
   `"type": "text"` (inside a block) means "render `blocks/text.liquid`."
2. **The keys (`"main"`, `"q1"`) are instance ids** you invent. You could have two `faq`
   sections by giving them two different keys both with `"type": "faq"`.
3. **`settings` here override the schema defaults.** Each value must correspond to a
   setting `id` declared in that file's `{% schema %}` (§8.6). If you write a setting the
   schema doesn't know, it's ignored.
4. **`order` / `block_order` are the source of truth for sequence.** Reordering the array
   reorders the page. (The theme editor edits exactly this file when a merchant drags
   things around — note the auto-generated warning banner at the top of the file.)

> **Takeaway:** to add a page you (a) create a page in admin, (b) optionally add a
> `templates/page.<name>.json` like this, (c) list the sections you want in `order`. No
> HTML is written at this layer — you're *composing* existing sections.

---

## §6 `sections/main-page.liquid` — the title section

**File:** `sections/main-page.liquid` · **Role:** a generic container section. It doesn't
hard-code a title; it just renders whatever **blocks** the template gave it (here: the
`heading` text block and the `page-content` block from §5.2). On the Help page, its job is
to host the page **header** ("Ajuda").

### §6.1 The HTML (annotated)

```liquid
{# A full-bleed background layer painted with the section's colour scheme.
   On Help the scheme is "" (empty), so it inherits :root = scheme-1 (navy). → §10 #}
<div class="section-background color-{{ section.settings.color_scheme }}"></div>

<div class="section page-width-content color-{{ section.settings.color_scheme }}">
  <div
    class="spacing-style layout-panel-flex layout-panel-flex--column section-content-wrapper mobile-column"
    style="
      {% render 'layout-panel-style', settings: section.settings %}   {# flex direction/gap/alignment → §9.6 #}
      {% render 'spacing-style',      settings: section.settings %}   {# the 40px/24px padding → §9.5 #}
    "
  >
    {% content_for 'blocks' %}   {# ★ the heading + page-content blocks render HERE → §7 ★ #}
  </div>
</div>
```

Two things a web dev should note:

- **`color-{{ … }}`** builds a class name like `color-skin-car-schema` from a setting.
  That class is what activates a colour scheme's variables on this subtree (§9.3).
- **`style="{% render 'layout-panel-style' … %}{% render 'spacing-style' … %}"`** — the
  section turns its slider/select settings into a string of **inline CSS variables**
  (`--flex-direction`, `--gap`, `--padding-block-start`, …). The actual CSS rules that
  *consume* those variables live in `base.css` (the global stylesheet). This
  "settings → inline CSS variables → global rules read them" pattern is the theme's whole
  styling strategy; see §7.4 and §9.

### §6.2 The `{% schema %}` (why it's reusable)

```liquid
{% schema %}
{
  "name": "t:names.page",          // "t:…" = a translation key (localised label in the editor)
  "blocks": [ { "type": "@theme" }, { "type": "@app" }, { "type": "_divider" } ],
  // "@theme" = "any theme block is allowed inside me" — that's why a `text` block can live here.
  "disabled_on": { "groups": ["header"] },
  "settings": [
    { "type": "range",  "id": "gap", … },
    { "type": "color_scheme", "id": "color_scheme", "default": "scheme-1" },
    { "type": "range", "id": "padding-block-start", … },
    { "type": "range", "id": "padding-block-end",  … }
  ]
}
{% endschema %}
```

Because it accepts `@theme` blocks, `main-page` is a flexible shell: the **template**
(§5) decides what goes inside. On the Help page that's a heading + page body; on another
page it could be images, buttons, etc.

---

## §7 The title block + its renderer

The page **header** you see ("Ajuda") is produced by a **text block**. Two files
cooperate: the block definition `blocks/text.liquid`, and the shared renderer
`snippets/text.liquid` that actually emits the HTML and ships the CSS.

### §7.1 `blocks/text.liquid` — definition delegates to the snippet

The block file is thin. Its top is literally one line of rendering; the rest is its
`{% schema %}` (the long list of settings you saw populated in §5.2):

```liquid
{% render 'text', block: block %}   {# hand the whole block to the shared renderer → §7.2 #}

{% schema %}
{ "name": "t:names.text",
  "settings": [
    { "type": "richtext", "id": "text", … },          // the HTML content
    { "type": "select",   "id": "type_preset", "options": ["rte","paragraph","h1",…,"custom"] }, // → §7.3
    { "type": "select",   "id": "font", … },
    … width, max_width, alignment, font_size, color, line_height, case, wrap, background …
  ] }
{% endschema %}
```

Why split definition (block) from rendering (snippet)? So other blocks/sections can reuse
the exact same text rendering by calling `{% render 'text', block: someBlock %}` without
duplicating it.

### §7.2 `snippets/text.liquid` — what HTML actually comes out

The snippet decides the wrapper tag and assembles a `class` and `style` string, then
prints your text inside it. The essential parts:

```liquid
{% liquid
  assign plain_text = block.settings.text | strip_newlines | strip
  # is_rte is true only for the "rte"/"paragraph" presets; ours is "h1", so is_rte = false
  assign element = 'div'                      # → our wrapper is a <div>
%}

{% capture attributes %}
  class="… text-block text-block--{{ block.id }} {{ block.settings.type_preset }} {{ text_block_classes }}"
        {#                                    ↑ this prints the class "h1"  → §7.3 #}
  style="
    {% render 'spacing-padding',  settings: block.settings %}   {# padding vars → §9.5 #}
    {% render 'typography-style', settings: block.settings %}   {# colour/font vars → §7.3, §9.4 #}
    --width: {{ text_width }};
    --max-width: var(--max-width--{{ type }}-{{ block.settings.max_width }});
  "
{% endcapture %}

{% if plain_text != blank %}
  <{{ element }} {{ attributes }}>
    {{ block.settings.text }}     {# prints: <h1>{{ closest.page.title }}</h1>  → so "Ajuda" #}
  </{{ element }}>
{% endif %}
```

So the browser ultimately receives roughly:

```html
<div class="text-block text-block--<id> h1 text-block--align-left" style="--color: var(--color-foreground); …">
  <h1>Ajuda</h1>
</div>
```

`{{ closest.page.title }}` is Liquid resolving the **nearest page object's title** — i.e.
whatever the merchant named the page in admin. That's why the header text isn't hard-coded.

### §7.3 The gotcha: which settings actually affect the size

This trips people up, so it's worth stating plainly. In the JSON (§5.2) the heading block
has `font: var(--font-body--family)` and `font_size: "1rem"`, which *look like* they'd make
the title small and body-font. **They don't.** Here's why:

`snippets/typography-style.liquid` only emits `--font-size` / `--font-family` **when
`type_preset == "custom"`.** Our preset is `"h1"`, so that branch is skipped — the only
thing it emits is the colour:

```liquid
{# from snippets/typography-style.liquid #}
{%- if preset != 'rte' and settings.color != "" -%}
  --color: {{ settings.color }};         {# → --color: var(--color-foreground)  (this DOES apply) #}
{%- endif -%}
{%- if preset == 'custom' -%}            {# ← our preset is "h1", so EVERYTHING below is skipped #}
  --font-size: …; --font-family: …; --font-weight: …; …
{%- endif -%}
```

Instead, the size/family come from a rule in the **global** `base.css` that targets the
`h1` class on the wrapper:

```css
/* assets/base.css (lines ~742–753) */
.text-block.h1 > *,                       /* ← the inner <h1> #}
.text-block.h1 :is(h1,h2,h3,h4,h5,h6) {
  font-family: var(--font-h1--family);    /* skin-car overrides this to the brand font → §9.2 */
  font-size:   var(--font-h1--size);      /* the real, large H1 size (from Typography settings) */
  line-height: var(--font-h1--line-height);
  color: var(--color, var(--font-h1-color)); /* uses the inline --color we set above */
}
```

**Conclusion:** the title renders as a proper, large H1 in the **brand font**, coloured
with the scheme's `--color-foreground`. The `font`/`font_size` values in the JSON are dead
config left by the theme editor. (If you *did* want a custom size, you'd switch
`type_preset` to `"custom"` — §12.)

### §7.4 The pattern to remember

> **settings (schema/JSON) → inline CSS variables on the element → global CSS rules read
> the variables.** The block never writes `font-size: 32px`. It writes
> `--font-size: …` (or, here, lets a class trigger `--font-h1--size`), and CSS elsewhere
> consumes it. You'll see the identical pattern in the FAQ (§8) and the colour system
> (§9).

---

## §8 `sections/faq.liquid` — the FAQ accordion

This is the **custom, hand-written** part of the page — the most instructive file to read.
It's a single self-contained section: HTML + its own scoped CSS + its editor schema, all
in one file. **No JavaScript.**

### §8.1 What it renders (the shape)

For each question block it outputs a native HTML **disclosure widget**:

```html
<details class="faq__item color-scheme-1" open>   <!-- "open" only on q1 → §8.3 -->
  <summary class="faq__question">                  <!-- the clickable bar -->
    <span class="faq__question-text">Como devo lavar…?</span>
    <span class="faq__icon"><svg>▾ chevron</svg></span>
  </summary>
  <div class="faq__answer">
    <div class="faq__answer-inner rte"><p>Usa o método dos dois baldes…</p></div>
  </div>
</details>
```

`<details>` + `<summary>` is a browser-native accordion: clicking the `<summary>` toggles
the `open` attribute on `<details>` and shows/hides everything after the summary — **with
zero JavaScript.** This section's cleverness is making that smooth and on-brand in CSS.

### §8.2 Section spacing via `{% style %}` (Liquid-in-CSS)

The very top of the file injects the merchant's top/bottom margins. It needs Liquid (the
unique section id + the slider values), so it uses `{% style %}`, not `{% stylesheet %}`
(recall §2.5):

```liquid
{% style %}
  #shopify-section-{{ section.id }} {       /* Shopify auto-wraps every section in this id wrapper */
    margin-top:    {{ section.settings.margin_top }}rem;     /* 1rem on Help (from §5.2) */
    margin-bottom: {{ section.settings.margin_bottom }}rem;  /* 0rem  on Help */
  }
{% endstyle %}
```

Scoping to `#shopify-section-{{ section.id }}` guarantees these margins affect **only this
instance**, never other FAQ sections elsewhere.

### §8.3 The HTML loop (annotated)

```liquid
<div class="faq color-{{ section.settings.color_scheme }}">   {# color-skin-car-schema → the grey band §10 #}

  {# The heading/subheading are optional. On Help both are "" (§5.2), so this whole block is skipped. #}
  {%- if section.settings.heading != blank or section.settings.subheading != blank -%}
    <div class="faq__header">
      {%- if section.settings.heading != blank -%}<h2 class="faq__heading">{{ section.settings.heading }}</h2>{%- endif -%}
      {%- if section.settings.subheading != blank -%}<p class="faq__subheading">{{ section.settings.subheading }}</p>{%- endif -%}
    </div>
  {%- endif -%}

  {%- if section.blocks.size > 0 -%}
    <div class="faq__inner"><div class="faq__list">
      {%- for block in section.blocks -%}                  {# loops q1…q5 in block_order #}
        <details class="faq__item color-scheme-1"          {# ★ each card FORCES scheme-1 (navy) → §10 #}
          {% if block.settings.open_by_default %}open{% endif %}   {# q1 has this = true #}
          {{ block.shopify_attributes }}>                  {# lets the theme editor select this block #}
          <summary class="faq__question">
            <span class="faq__question-text">{{ block.settings.question }}</span>
            <span class="faq__icon" aria-hidden="true"><svg class="faq__icon-svg" …>▾</svg></span>
          </summary>
          <div class="faq__answer">
            <div class="faq__answer-inner rte">{{ block.settings.answer }}</div>
          </div>
        </details>
      {%- endfor -%}
    </div></div>
  {%- endif -%}
</div>
```

Notes:

- **`{{ block.shopify_attributes }}`** prints data-attributes Shopify needs so that, in the
  theme editor, clicking a question selects that block. Always include it on a block's root.
- **`color-scheme-1` is hard-coded on every card on purpose** (see the file's top comment):
  the surrounding band uses the merchant's scheme, but the cards always use the brand navy
  palette so they look identical regardless of the band colour. This is the key to the
  colour story in §10.
- **`aria-hidden="true"`** on the icon hides the decorative chevron from screen readers
  (the `<summary>` text already conveys everything).

### §8.4 The CSS — layout & brand colours

All of it is in this section's `{% stylesheet %}` (plain CSS, auto-bundled, scoped by the
`faq__*` class names — recall §2.5). The important rules:

```css
.faq {                                  /* the full-width band */
  background-color: var(--color-background);  /* = skin-car-schema grey #f0f0f0  → §10 */
  color: var(--color-foreground);
  padding-block: 4.5rem;
}
.faq__inner { max-width: 52rem; margin-inline: auto; padding-inline: var(--page-margin); } /* centered column */

.faq__list { display: flex; flex-direction: column; gap: 0.75rem;
             interpolate-size: allow-keywords; }   /* ← enables animating to height:auto, see §8.5 */

.faq__item {                            /* a card. It is .color-scheme-1, so its vars = navy palette */
  background-color: var(--color-background);   /* = scheme-1 navy #071121 */
  color: var(--color-foreground);              /* = scheme-1 off-white #fcfcfc */
  border: 1px solid var(--color-border);
  border-radius: 0;                            /* brand rule: square corners, no radius */
}

.faq__question:hover {                  /* hover the bar → brand blue */
  background-color: var(--color-primary);            /* #0852a5 */
  color: var(--color-primary-button-text);           /* #fcfcfc */
}
.faq__item[open] {                      /* an OPEN card → the whole card turns brand blue */
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-primary-button-text);
}
```

Every colour is a `var(--color-*)` — never a hex literal. Those variables are supplied by
whichever colour scheme is active on the element (§9.3, §10). That's what makes the whole
thing re-skinnable from the admin.

### §8.5 The CSS — the open/close animation (modern CSS, no JS)

Animating `<details>` open used to be impossible without JS, because you can't transition
to `height: auto`. This file uses four newer CSS features to do it natively:

```css
/* 1. interpolate-size lets the browser animate between a fixed size and the auto keyword. */
.faq__list { interpolate-size: allow-keywords; }

/* 2. ::details-content is the pseudo-element wrapping everything after <summary>.
      Collapsed state: zero height, transparent, hidden. */
.faq__item::details-content {
  block-size: 0; opacity: 0; overflow: hidden;
  interpolate-size: allow-keywords;
  transition: content-visibility var(--animation-speed,.3s) allow-discrete,
              opacity   var(--animation-speed,.3s) ease,
              block-size var(--animation-speed,.3s) ease;
}

/* 3. When the card is open, expand to the natural height and fade in. */
.faq__item[open]::details-content {
  block-size: auto; opacity: 1;
  @starting-style {           /* the values to animate FROM on first reveal */
    block-size: 0; opacity: 0;
  }
}

/* 4. Don't animate a card that opens WITHOUT user focus (e.g. q1's open-by-default on load).
      :focus-within is only true right after a real click, so page-load opens are instant. */
.faq__item:not(:focus-within)::details-content { transition: none; }

/* The chevron: rotate 180° when open. */
.faq__icon { transition: transform var(--animation-speed,.25s) ease; }
.faq__item[open] .faq__icon { transform: rotate(180deg); }

/* Respect users who asked the OS to reduce motion. */
@media (prefers-reduced-motion: reduce) {
  .faq__item, .faq__question, .faq__icon, .faq__item::details-content { transition: none; }
}
```

That's the entire interactivity model: the browser toggles `open`, and these rules animate
the height, opacity, and chevron. If you've only ever built accordions with a JS
click-handler and a `max-height` hack, this is the modern, scriptless replacement.

### §8.6 The `{% schema %}` — settings, blocks, and presets

```liquid
{% schema %}
{
  "name": "FAQ",
  "settings": [                       // section-level settings (read as section.settings.*)
    { "type": "range", "id": "margin_top",    … "default": 4 },   // used in §8.2
    { "type": "range", "id": "margin_bottom", … "default": 4 },
    { "type": "color_scheme", "id": "color_scheme", "default": "scheme-2" },  // the band scheme §10
    { "type": "inline_richtext", "id": "heading",    "default": "Perguntas Frequentes" },
    { "type": "text",            "id": "subheading", "default": "Tudo o que precisas…" }
  ],
  "blocks": [                         // what a child block looks like (read as block.settings.*)
    { "type": "faq_item", "name": "Question", "settings": [
        { "type": "text",     "id": "question",        "default": "A tua pergunta aqui?" },
        { "type": "richtext", "id": "answer",          "default": "<p>Escreve aqui…</p>" },
        { "type": "checkbox", "id": "open_by_default", "default": false }   // used in §8.3
    ] }
  ],
  "presets": [ { "name": "FAQ", "blocks": [ /* 5 ready-made Q&A in PT */ ] } ]
}
{% endschema %}
```

Three layers to notice:

- **`settings`** → section-wide knobs. Their `id`s are exactly the keys you saw populated
  in the template JSON (§5.2). Defaults here are overridden by the template.
- **`blocks`** → the schema of a *single* question. The `id`s (`question`, `answer`,
  `open_by_default`) are what the loop reads in §8.3.
- **`presets`** → when a merchant drags a fresh "FAQ" section onto *any* page in the
  editor, it appears pre-filled with these 5 Portuguese Q&A. (The Help page's actual 5
  questions live in the template JSON, §5.2 — the preset is just the starting point.)

---

## §9 The styling engine: CSS variables & color schemes

Everything visual on this page is driven by CSS custom properties (`--color-*`,
`--font-*`, `--page-*`). This section explains where they come from. A web dev can think
of it as: **the theme compiles the merchant's settings into a big block of `:root`/class
CSS variables at request time, and every component just reads them.**

### §9.1 The two stylesheets that ship

From `snippets/stylesheets.liquid` (rendered in §4.1):

```liquid
{{ 'overflow-list.css' | asset_url | preload_tag: as: 'style' }}
{{ 'base.css'          | asset_url | stylesheet_tag: preload: true }}
```

- **`assets/base.css`** (~4,200 lines) is the global stylesheet: element resets, the
  heading rules from §7.3, the layout utility classes that consume `--flex-direction`,
  `--gap`, `--padding-*`, etc.
- Per-section CSS (like all the `.faq__*` rules in §8) is bundled separately from each
  section's `{% stylesheet %}`.
- Note: `assets/critical.css` exists but **is not loaded** — `base.css` + the variable
  snippets below are the real global styles.

### §9.2 `snippets/css-variables.liquid` — the skin-car brand bridge

Small but important. It (a) declares the brand `@font-face`s, and (b) overrides a handful
of tokens so the generic theme looks like skin-car:

```liquid
{% style %}
  @font-face { font-family:'Baradig'; src:url('…Baradig-Bold.otf'); font-weight:700; … }  /* brand font */
  :root {
    --font-brand: 'Baradig', sans-serif;
    --font-h1--family: var(--font-brand);     /* ★ this is why the title (§7.3) is in the brand font */
    --page-width: var(--{{ settings.page_width }}-page-width, 90rem);
    --page-margin: 20px;                       /* used by .faq__inner / .faq__header (§8.4) */
    --color-highlight: var(--color-primary);   /* aliases so old code keeps working */
    --style-border-radius-buttons: 0;          /* brand rule: no rounded corners */
  }
{% endstyle %}
```

Because §4.1 renders this **after** `color-schemes`, these overrides win.

### §9.3 `snippets/color-schemes.liquid` — schemes → CSS variables

This is the engine room. It loops over every colour scheme defined in theme settings and
emits a class full of `--color-*` variables for each one:

```liquid
{% for scheme in settings.color_schemes %}
  {% if forloop.index == 1 %}:root,{% endif %}   {# the FIRST scheme also becomes the page default #}
  .color-{{ scheme.id }} {
    --color-background:       rgb({{ scheme.settings.background.rgba }});
    --color-foreground:       rgb({{ scheme.settings.foreground.rgba }});
    --color-primary:          rgb({{ scheme.settings.primary.rgba }});
    --color-primary-button-text: rgb({{ scheme.settings.primary_button_text.rgba }});
    --color-border:           rgb({{ scheme.settings.border.rgba }});
    /* …~40 more tokens: buttons, inputs, variants, shadows… */
  }
{% endfor %}

/* and finally, paint the body with the default scheme: */
body, .color-scheme-1, .color-scheme-2, …, .color-skin-car-schema {
  color: var(--color-foreground);
  background-color: var(--color-background);
}
```

Two consequences that matter for §10:

1. **The first scheme in the list (`scheme-1`) is attached to `:root`**, so it's the
   page-wide default. Anything that doesn't specify a scheme inherits scheme-1.
2. **Applying `class="color-skin-car-schema"`** to an element redefines all the
   `--color-*` variables for that element and its descendants. That's how a single class
   re-skins a whole subtree (the basis of §8.3's per-card override).

### §9.4 `snippets/typography-style.liquid`

Already dissected in §7.3. Its job: turn a block's font settings into inline
`--font-size`/`--font-family`/`--color`/… variables — but, crucially, only the full set
when `type_preset == "custom"`. For presets like `h1` it emits just `--color` and lets the
global `.h1` rule (§7.3) supply size/family.

### §9.5 `snippets/spacing-style.liquid` & `snippets/spacing-padding.liquid`

Both convert padding settings into CSS variables. `spacing-padding` is the simple one:

```liquid
{# snippets/spacing-padding.liquid → e.g. for the title block (all zeros) #}
--padding-block-start: {{ settings.padding-block-start | default: 0 }}px;
--padding-block-end:   {{ settings.padding-block-end   | default: 0 }}px;
--padding-inline-start:{{ settings.padding-inline-start | default: 0 }}px;
--padding-inline-end:  {{ settings.padding-inline-end   | default: 0 }}px;
```

`spacing-style.liquid` (used by the `main-page` section, §6.1) does the same for the
40px/24px padding but adds **responsive scaling**: any value above 20px is wrapped in
`max(20px, calc(var(--spacing-scale) * <n>px))` so big paddings shrink on small screens.
The matching `padding: var(--padding-block-start) …` rules live in `base.css`.

### §9.6 `snippets/layout-panel-style.liquid`

Used by `main-page` (§6.1) to turn its `content_direction`/`gap`/alignment settings into
`--flex-direction`, `--gap`, `--horizontal-alignment`, `--vertical-alignment` variables.
The `.layout-panel-flex` class in `base.css` reads them to lay the blocks out as a flex
column. (The FAQ section doesn't use this — it writes its own flexbox in §8.4.)

---

## §10 The actual colors of this page

Now we can state, concretely, every colour the visitor sees and *why* — by combining the
scheme data (`config/settings_data.json`) with the rules above. This is the single most
useful "aha" for understanding the page.

| Layer | Element | Scheme in effect | Resulting colours |
|-------|---------|------------------|-------------------|
| Page background | `<body>` | `:root` = **scheme-1** (the first scheme, §9.3) | bg **`#071121` navy**, text `#fcfcfc` off-white |
| Title ("Ajuda") | `main-page` section, `color_scheme:""` (§5.2) | inherits `:root` = **scheme-1** | off-white H1 (brand font, §7.3) on the navy page |
| FAQ band | `.faq`, `color_scheme:"skin-car-schema"` (§5.2) | **skin-car-schema** | band bg **`#f0f0f0` light grey**, text `#071121` |
| FAQ card (closed) | `.faq__item.color-scheme-1` (§8.3) | **forced scheme-1** | card bg **`#071121` navy**, text `#fcfcfc` |
| FAQ card (hover/open) | `.faq__question:hover`, `.faq__item[open]` | scheme-1's `--color-primary` | **`#0852a5` brand blue**, text `#fcfcfc` |

So the page reads as: **a dark navy page**, an **off-white title**, then a **light-grey FAQ
band** containing **navy cards** that light up **brand blue** on hover/open. The three
brand colours from the design system —
`#FCFCFC` (off-white), `#071121` (navy), `#0852A5` (blue) — appear exactly as intended,
all sourced from scheme variables rather than hard-coded.

> **Why force `color-scheme-1` on the cards (§8.3)?** So the cards stay navy-on-blue
> regardless of what scheme the merchant picks for the band. The band is themeable; the
> cards are locked to the brand identity.

---

## §11 Worked example: a visitor opens the page

A concrete, click-by-click trace tying every section together.

**Step 1 — Request.** A visitor hits `https://…/pages/ajuda`. In the admin, that page's
template is set to `help`, so Shopify selects `templates/page.help.json` (§5).

**Step 2 — Read the template.** Shopify reads `order: ["main","faq"]` (§5.2). It will
render the `main` section, then the `faq` section.

**Step 3 — Wrap in the layout.** It renders `layout/theme.liquid` (§4). In `<head>`,
`color-schemes` (§9.3) compiles every scheme into `--color-*` variables, then
`css-variables` (§9.2) swaps the H1 font to Baradig and sets brand tokens. The `<body>`
opens with the shared header, then reaches `{{ content_for_layout }}` (§4.2).

**Step 4 — Render section "main".** `sections/main-page.liquid` (§6) prints its wrapper
(empty colour scheme → inherits navy `:root`), applies the 40px/24px padding via
`spacing-style` (§9.5), then hits `{% content_for 'blocks' %}` and renders its blocks:

- The `heading` **text block** (§7) → `snippets/text.liquid` outputs
  `<div class="text-block h1">…<h1>Ajuda</h1></div>`. `base.css` (§7.3) sizes it as a big
  H1 in the brand font; the inline `--color: var(--color-foreground)` makes it off-white.
- The `page-content` block renders the page's body (empty here).

**Step 5 — Render section "faq".** `sections/faq.liquid` (§8) prints the light-grey band
(`skin-car-schema`), skips the header (heading/subheading are empty, §8.3), then loops the
five `faq_item` blocks, emitting a `<details>` per question (§8.1). `q1` carries
`open_by_default`, so its `<details>` gets the `open` attribute and starts expanded —
**instantly**, because `:not(:focus-within)` disables the transition on load (§8.5).

**Step 6 — Paint.** The browser receives plain HTML + the bundled CSS. It paints: navy
page, off-white "Ajuda", grey FAQ band, navy cards, with `q1` already open.

**Step 7 — Interaction (click q2).** The visitor clicks q2's `<summary>` bar:

1. The browser natively sets the `open` attribute on that `<details>` — **no JS runs**.
2. `.faq__item[open]` (§8.4) flips the card's background to brand blue `#0852a5`.
3. `.faq__item[open]::details-content` (§8.5) transitions `block-size` from `0` to `auto`
   (possible thanks to `interpolate-size: allow-keywords`) and `opacity` `0 → 1`, so the
   answer slides and fades in, pushing q3–q5 down smoothly.
4. `.faq__item[open] .faq__icon` rotates the chevron 180°.
5. Items below reflow; because the section margins live on
   `#shopify-section-<id>` (§8.2), nothing outside the FAQ is disturbed.

**Step 8 — Reduced motion.** If the visitor's OS requests reduced motion, the
`@media (prefers-reduced-motion: reduce)` rule (§8.5) drops all transitions — the card just
snaps open. Same HTML, accessible by default.

That's the whole page, soup to nuts.

---

## §12 Cookbook: how to change things

Practical recipes. Each says **which file and which section of this doc** governs it.

**Add or edit a FAQ question.**
Edit `templates/page.help.json` (§5.2): add a key under `faq.blocks` (e.g. `"q6"`) with
`"type": "faq_item"` and `question`/`answer`/`open_by_default` settings, then add `"q6"` to
`faq.block_order`. (Via the theme editor, just click "Add Question" — it writes the same
JSON.) The five default questions in `faq.liquid`'s `presets` (§8.6) only seed *new*
sections; they don't change this page.

**Reorder questions.** Reorder the `faq.block_order` array (§5.2).

**Change the FAQ band colour.** Edit `faq.settings.color_scheme` in the template (§5.2) to
another scheme id (e.g. `"scheme-2"`). To change the *card* colour instead, edit the
hard-coded `color-scheme-1` class in `sections/faq.liquid` §8.3 — or the scheme-1 values in
`config/settings_data.json` (§10), noting scheme-1 also colours the page background.

**Change the hover/open accent.** That's `--color-primary` of scheme-1. Change scheme-1's
`primary` in `config/settings_data.json` (or the corresponding colour in the theme editor).
Don't hard-code a hex in `faq.liquid` — keep using the variable (§8.4).

**Make the title smaller / a different font.** The title ignores the JSON `font`/`font_size`
because its preset is `h1` (§7.3). Two options: (a) in `templates/page.help.json` change the
heading block's `type_preset` to `"custom"` and then `font`/`font_size` take effect; or
(b) change the global `--font-h1--size` / `--font-h1--family` (the latter is overridden in
`snippets/css-variables.liquid`, §9.2).

**Show the FAQ's own heading/subheading.** They're hidden because both are `""` in the
template (§5.2, §8.3). Set `faq.settings.heading` (and `subheading`) to non-empty text and
the `.faq__header` block (§8.3) renders.

**Adjust spacing above/below the FAQ.** `faq.settings.margin_top` / `margin_bottom` in the
template (§5.2); applied in §8.2.

**Add a brand-new page (the general pattern).**
1. In the Shopify admin, create the page and (optionally) a matching template name.
2. Add `templates/page.<name>.json` modelled on §5 — list the sections you want in `order`.
3. Reuse existing sections, or write a new `sections/<thing>.liquid` (HTML + `{% stylesheet %}`
   + `{% schema %}`, following the `faq.liquid` pattern in §8) and reference it by `type`.
4. Document it as a sibling of this file under `docs/`.

---

## §13 File map & glossary

### Every file in the Help page flow

| File | Layer | One-line role | Doc |
|------|-------|---------------|-----|
| `layout/theme.liquid` | layout | The `<html>` shell; defines where the page injects | §4 |
| `templates/page.help.json` | template | **The page's JSON**: which sections, what order | §5 |
| `sections/main-page.liquid` | section | Generic block container; hosts the title | §6 |
| `blocks/text.liquid` | block | The title block's definition (schema) | §7.1 |
| `snippets/text.liquid` | snippet | Renders the title's HTML + ships its CSS | §7.2 |
| `sections/faq.liquid` | section | The custom FAQ accordion (HTML+CSS+schema) | §8 |
| `snippets/css-variables.liquid` | snippet | skin-car brand tokens + fonts | §9.2 |
| `snippets/color-schemes.liquid` | snippet | Compiles schemes → `--color-*` vars | §9.3 |
| `snippets/typography-style.liquid` | snippet | Font settings → inline type vars | §7.3, §9.4 |
| `snippets/spacing-style.liquid` | snippet | Section padding → vars (with scaling) | §9.5 |
| `snippets/spacing-padding.liquid` | snippet | Block padding → vars | §9.5 |
| `snippets/layout-panel-style.liquid` | snippet | Flex layout settings → vars | §9.6 |
| `assets/base.css` | asset | Global stylesheet (resets, `.h1`, layout utils) | §7.3, §9.1 |
| `config/settings_data.json` | config | The stored scheme/colour values | §10 |

### Glossary (Shopify terms in web-dev language)

- **Layout** — the outer `<html>` template every page shares. (`layout/theme.liquid`)
- **Template** — a per-URL JSON (or Liquid) file choosing which sections render.
- **Section** — a self-contained UI band: HTML + scoped CSS (`{% stylesheet %}`) + editor
  settings (`{% schema %}`). Roughly "a web component."
- **Block** — a child unit inside a section (e.g. one FAQ question, the title text).
- **Snippet** — a shared partial included with `{% render %}`; like an include/helper.
- **Schema** — the JSON at the bottom of a section/block declaring merchant-editable
  settings; values come back as `section.settings.*` / `block.settings.*`.
- **Color scheme** — a named palette; applied via a `color-<id>` class, it sets ~40
  `--color-*` variables on that subtree.
- **Liquid** — Shopify's server-side templating language. `{{ }}` outputs, `{% %}` runs
  logic, `|` applies filters. Fully resolved to plain HTML before reaching the browser.
- **`content_for_layout`** — the placeholder in the layout where the template renders.
- **`content_for 'blocks'`** — the placeholder in a section where its blocks render.
- **`{{ closest.page.title }}`** — Liquid for "the nearest page object's title," used to
  print the page header without hard-coding it (§7.2).

---

*Maintained as the canonical reference for the Help page. If you change any file in §13,
update the matching section here so this stays the source of truth.*
