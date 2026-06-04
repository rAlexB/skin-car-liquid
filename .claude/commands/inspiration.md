Search the car detailing reference theme at `~/.claude/reference/car-detailing/` for files related to: $ARGUMENTS

Steps:
1. Run `grep -ril "$ARGUMENTS" ~/.claude/reference/car-detailing/sections ~/.claude/reference/car-detailing/snippets ~/.claude/reference/car-detailing/blocks` to find matching files by content.
2. Also run `find ~/.claude/reference/car-detailing -name "*$ARGUMENTS*"` to find files whose name matches.
3. Pick the 1–3 most relevant files and read them.
4. Summarise the key patterns concisely:
   - HTML/Liquid structure and layout approach
   - CSS technique (how the element sizes, positions, or responds on mobile)
   - Schema settings exposed (what the merchant controls)
5. Note what must be adapted for skin-car: use `--color-*` CSS variables, `var(--page-width)` / `var(--page-margin)`, and skeleton theme conventions — never copy the reference theme's CSS variables or color scheme classes verbatim.

Return only what is useful for implementation. Do not paste full files unless asked.
