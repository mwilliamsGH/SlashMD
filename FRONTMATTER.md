# YAML Frontmatter (fork)

This fork adds **editable YAML frontmatter** to SlashMD. Stock SlashMD parses
plain CommonMark, so a leading `---\n…\n---` block is mangled into a thematic
break + setext heading and its YAML structure (nested maps, key order) is
destroyed on the first edit. Here, frontmatter round-trips losslessly and is
editable as a dedicated block.

## What it looks like

A document that starts with frontmatter renders a **Frontmatter** block pinned
at the top — a monospace, Prism-highlighted, editable raw-YAML field (keys
accented, scalar values in the default foreground). The body renders as normal
blocks below. Long lines soft-wrap; the block grows to fit its content.

The YAML is stored and round-tripped **verbatim** — nested maps, sequences,
comments and key ordering are preserved byte-for-byte.

## How it works

All changes live in `packages/webview-ui`; the extension host is untouched
(the round-trip stays lossless through the markdown pipeline, so the host's
prefix/suffix edit diff is stable).

| File | Change |
| --- | --- |
| `src/markdown/parse.ts` | `frontmatter(['yaml'])` + `frontmatterFromMarkdown(['yaml'])` → leading block parses to a `yaml` mdast node |
| `src/markdown/stringify.ts` | `frontmatterToMarkdown(['yaml'])` → `yaml` node serializes back to `---\n…\n---` |
| `src/app/editor/nodes/FrontmatterNode.tsx` | new `DecoratorNode`: transparent-textarea-over-Prism-highlight editor; stores raw YAML string |
| `src/app/mapper/mdastToLexical.ts` | `case 'yaml'` → `FrontmatterNode` |
| `src/app/mapper/lexicalToMdast.ts` | `FrontmatterNode` → `{ type: 'yaml', value }` |
| `src/app/editor/Editor.tsx`, `nodes/index.ts` | register the node |
| `src/styles.css` | `.frontmatter-*` styles |

Dependencies added: `micromark-extension-frontmatter`, `mdast-util-frontmatter`.

## Build, package, install

```bash
cd ~/Work/SlashMD
npm install                 # first time only
npm run build               # builds all workspaces
npm run package --workspace=packages/extension-host   # -> packages/extension-host/slashmd.vsix

# install into VS Code (this fork is the 'slashmd.slashmd' extension id)
"/Users/admin/Downloads/Visual Studio Code.app/Contents/Resources/app/bin/code" \
  --install-extension packages/extension-host/slashmd.vsix --force

scripts/slashmd-font.sh 15  # a reinstall wipes the font patch — re-apply it
# then Cmd+Q VS Code and reopen (a window close won't flush the cached webview)
```

## Pinning / staying ahead of the Marketplace

The host version is bumped to **0.3.0** so the Marketplace build (0.2.x) can't
silently replace this fork. If upstream ever publishes ≥0.3.0, either rebase
this fork onto the new tag and rebuild, or disable auto-update for the
extension.

`upstream` remote = `wolfdavo/SlashMD`; push the fork to your own remote.

## Known limitations (v1)

- Edits **existing** frontmatter only — a file must already start with `---`.
  There's no slash-command yet to insert a frontmatter block into a file that
  has none.
- Scalar values are not separately tokenized by Prism, so plain values use the
  default foreground colour (keys are accented). Quoted strings, numbers and
  booleans get their own colours.

## Font size

SlashMD's webview ignores `editor.fontSize`. `scripts/slashmd-font.sh [size]`
patches the bundled `webview.css`; re-run after every (re)install.
