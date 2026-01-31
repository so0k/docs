# Plan: Scrape CDKTF Tutorials from Wayback Machine

## Source
- Index: `https://web.archive.org/web/20251112223320/https://developer.hashicorp.com/terraform/tutorials/cdktf`
- 4 tutorials to scrape:
  1. `cdktf-install` — Install CDK for Terraform and run a quick start demo
  2. `cdktf-build` — Build AWS infrastructure with CDK for Terraform
  3. `cdktf-assets-stacks-lambda` — Deploy Lambda functions with TypeScript and CDK for Terraform
  4. `cdktf-applications` — Deploy an application with CDK for Terraform

## Output Structure

```
scraped/
├── index.json                    # metadata: tutorial list, URLs, scrape timestamps
├── images.json                   # image index: { id, src_url, alt_text, tutorial, section }
├── cdktf-install/
│   ├── snapshot-default.txt      # full page snapshot (default tab state)
│   ├── tabs/
│   │   ├── lang-typescript.txt   # snapshot diff after clicking TypeScript tab
│   │   ├── lang-python.txt       # snapshot diff after clicking Python tab
│   │   ├── lang-go.txt
│   │   ├── lang-csharp.txt
│   │   ├── lang-java.txt
│   │   ├── install-npm-stable.txt
│   │   ├── install-npm-dev.txt
│   │   └── install-homebrew.txt
│   └── metadata.json             # page title, URL, sections, tab IDs, image refs
├── cdktf-build/
│   ├── snapshot-default.txt
│   ├── tabs/
│   │   └── ...
│   └── metadata.json
├── cdktf-assets-stacks-lambda/
│   └── ...
└── cdktf-applications/
    └── ...
```

## Strategy: What Chrome DevTools Must Do vs. What We Can Script

### Chrome DevTools (interactive, one-at-a-time via sub-agent)
These require browser interaction and cannot be scripted:
1. **Navigate** to each tutorial URL
2. **Take snapshot** of default page state (captures active tab content)
3. **Identify tabs** — scan snapshot for `tab` elements (e.g., language selector, install method tabs)
4. **Click each tab** — switch to each variant and take a new snapshot
5. **Expand accordions** — find collapsed `button expandable` or `details` elements, click them, re-snapshot
6. **Extract image URLs** — collect `image` element `url` attributes from snapshots

### Scriptable (post-capture processing)
Once snapshots are on disk, a script can:
1. **Parse snapshots** — extract structured content (headings, prose, code blocks) from the a11y tree text format
2. **Extract code blocks** — identify `Copy` button descriptions which contain the full code block text (observed: the `button "Copy"` element has a `description` attribute with the full code content)
3. **Build image index** — grep all `url=` from `image` elements across snapshots
4. **Diff tab snapshots** — compare default snapshot with tab-specific snapshots to isolate only the changed code blocks
5. **Download images** — `curl`/`wget` each image URL from the index

## Key Observation: Copy Buttons Contain Full Code

From the install tutorial snapshot, each code block has a `Copy` button whose `description` attribute contains the **entire code block text**. Example:
```
uid=2_663 button "Copy" description="import { Construct } from "constructs"; import { App, TerraformStack } from "cdktf"; ..."
```
This is the most reliable way to extract code — no need to reassemble tokenized `StaticText` nodes.

## Execution Plan (per tutorial)

### Step 1: Navigate and capture default snapshot
- Navigate to tutorial URL
- `take_snapshot` → save to `scraped/<tutorial>/snapshot-default.txt`

### Step 2: Identify interactive elements
- Parse snapshot for:
  - `tab` elements (selectable) — note which is `selected`
  - `button expandable` elements — potential accordions
  - `image` elements — collect URLs and alt text

### Step 3: Click each tab, capture content
- For each tab group found:
  - Click the tab element by uid
  - `take_snapshot` → save to `scraped/<tutorial>/tabs/<tab-identifier>.txt`
  - Only need to capture the main content area diff (but saving full snapshot is simpler and we can diff later)

### Step 4: Expand accordions, capture content
- For each expandable element in the main content area:
  - Click to expand
  - `take_snapshot` → save to `scraped/<tutorial>/accordions/<accordion-id>.txt`

### Step 5: Build metadata.json
- Save: title, URL, sections (from "On this page" nav), list of tabs found, list of images

### Step 6: Post-processing script
After all 4 tutorials are captured, run a script that:
1. Parses each snapshot file
2. Extracts code blocks from Copy button descriptions
3. Extracts prose from StaticText nodes between headings
4. Builds `images.json` index from all image elements
5. Optionally downloads images via curl

## Decisions
- **Tab capture**: Full page snapshots per tab state (simpler, diff with script later)
- **Script language**: TypeScript (matches project stack)

## Detailed Execution Sequence

### Phase A: Chrome DevTools Scraping (sub-agent, one tutorial at a time)

For each of the 4 tutorials:

1. Create directory `scraped/<tutorial-slug>/` and `scraped/<tutorial-slug>/tabs/`
2. Navigate to the Wayback Machine URL
3. Take default snapshot → write to `scraped/<tutorial-slug>/snapshot-default.txt`
4. Scan snapshot output for:
   - All `tab` elements (note `selected` state and parent grouping)
   - All `button expandable` elements in the main content area
   - All `image` elements (collect url + alt text)
5. For each non-selected tab:
   - Click the tab by uid
   - Wait briefly for content update
   - Take snapshot → write to `scraped/<tutorial-slug>/tabs/<tab-label>.txt`
6. For each expandable accordion in main content:
   - Click to expand
   - Take snapshot → write to `scraped/<tutorial-slug>/accordions/<id>.txt`
7. Write `scraped/<tutorial-slug>/metadata.json` with:
   ```json
   {
     "title": "...",
     "url": "...",
     "waybackUrl": "...",
     "sections": ["Prerequisites", "Install CDKTF", ...],
     "tabs": [
       { "group": "language", "options": ["typescript", "python", ...], "default": "typescript" },
       { "group": "install-method", "options": ["npm-stable", "npm-dev", "homebrew"], "default": "npm-stable" }
     ],
     "images": [
       { "id": "img-1", "alt": "Terraform as Platform", "src": "https://..." }
     ]
   }
   ```

### Phase B: TypeScript Post-Processing Script (`scraped/parse.ts`)

A standalone TypeScript script that:

1. **Reads each tutorial's snapshot files** from `scraped/*/`
2. **Extracts code blocks** by finding `button "Copy" description="..."` patterns — the description contains the full code text
3. **Extracts prose** by walking StaticText nodes between heading boundaries
4. **Diffs tab snapshots** against default to identify which code blocks change per language/variant
5. **Builds `scraped/images.json`** — consolidated image index across all tutorials
6. **Outputs structured content** per tutorial as `scraped/<tutorial>/content.json`:
   ```json
   {
     "title": "...",
     "sections": [
       {
         "heading": "Prerequisites",
         "level": 2,
         "content": [
           { "type": "prose", "text": "In order to use CDKTF, you need:..." },
           { "type": "code", "language": "shell", "code": "npm install --global cdktf-cli@latest", "variants": {
             "typescript": "...", "python": "...", "go": "..."
           }},
           { "type": "image", "ref": "img-1" }
         ]
       }
     ]
   }
   ```

### Phase C: Image Download Script (`scraped/download-images.ts`)

Reads `scraped/images.json` and downloads each image URL to `scraped/images/<tutorial>/<filename>`.

## Tutorial URLs (Wayback Machine)

| Tutorial | URL |
|----------|-----|
| cdktf-install | `https://web.archive.org/web/20251112223320/https://developer.hashicorp.com/terraform/tutorials/cdktf/cdktf-install` |
| cdktf-build | `https://web.archive.org/web/20251112223320/https://developer.hashicorp.com/terraform/tutorials/cdktf/cdktf-build` |
| cdktf-assets-stacks-lambda | `https://web.archive.org/web/20251112223320/https://developer.hashicorp.com/terraform/tutorials/cdktf/cdktf-assets-stacks-lambda` |
| cdktf-applications | `https://web.archive.org/web/20251112223320/https://developer.hashicorp.com/terraform/tutorials/cdktf/cdktf-applications` |

## Verification
- Check each `scraped/<tutorial>/` directory has snapshot + all tab variant files
- Run parse script, verify code blocks extracted match the number of Copy buttons in each snapshot
- Verify image index has entries for all image elements found
- Spot-check one tutorial's content.json against the live Wayback Machine page in Chrome

Status: **Scraping complete.** All 4 tutorials captured with all language/tab variants. See conversion guide below.

---

# Guide: Converting Scraped Tutorials to Mintlify MDX

## What Was Captured

| Tutorial | Snapshot | Language Variants | Install Tabs | Code Blocks | Images |
|----------|---------|-------------------|-------------|-------------|--------|
| cdktf-install | 67KB | TS, Python, Go, C#, Java | npm-stable, npm-dev, homebrew | 10 | 2 |
| cdktf-build | 61KB | TS, Python, Go, C#, Java | — | 9 | 1 |
| cdktf-assets-stacks-lambda | 75KB | TS only | — | 10 | 0 |
| cdktf-applications | 244KB | TS only | — | 71 | 0 |

## Scraped Data Structure (Actual)

```
scraped/
├── index.json                          # Tutorial list, URLs, scrape timestamps
├── images.json                         # Consolidated image index with download filenames
├── parse.mjs                           # Snapshot parser → content.json
├── download-images.mjs                 # Image downloader
├── images/                             # Downloaded tutorial images
│   ├── cdktf-install/
│   │   ├── terraform-as-platform.png
│   │   └── terraform-docker-nginx.png
│   └── cdktf-build/
│       └── aws-console.png
├── cdktf-install/
│   ├── snapshot-default.txt            # A11y tree (TypeScript + npm-stable state)
│   ├── tabs/
│   │   ├── install-npm-dev.txt         # Tab: npm development release
│   │   ├── install-homebrew.txt        # Tab: Homebrew install
│   │   ├── lang-python.txt             # Full page: Python variant
│   │   ├── lang-go.txt                 # Full page: Go variant
│   │   ├── lang-csharp.txt             # Full page: C# variant
│   │   └── lang-java.txt              # Full page: Java variant
│   ├── metadata.json                   # Structure, tabs, images
│   └── content.json                    # Parsed code blocks with diffs
├── cdktf-build/                        # 5 language variants, 1 image
│   ├── snapshot-default.txt
│   ├── tabs/lang-{python,go,csharp,java}.txt
│   ├── metadata.json
│   └── content.json
├── cdktf-assets-stacks-lambda/         # TypeScript only
│   ├── snapshot-default.txt
│   ├── metadata.json
│   └── content.json
└── cdktf-applications/                 # TypeScript only
    ├── snapshot-default.txt
    ├── metadata.json
    └── content.json
```

## Key Files Per Tutorial

| File | Purpose | When to use |
|------|---------|-------------|
| **`content.json`** | Structured code blocks with language variant diffs | Primary source for code sections |
| `metadata.json` | Sections, tab groups, image references | Page structure and frontmatter |
| `snapshot-default.txt` | Raw a11y tree with full prose | Recovering prose between code blocks |
| `tabs/lang-*.txt` | Raw a11y tree per language | Cross-referencing prose differences |

---

## Understanding content.json

Each tutorial's `content.json` contains:

```json
{
  "title": "Install CDK for Terraform and run a quick start demo",
  "url": "https://developer.hashicorp.com/terraform/tutorials/cdktf/cdktf-install",
  "codeBlocks": [
    {
      "index": 0,
      "code": "$ npm install --global cdktf-cli@latest",
      "variants": {
        "install-homebrew": "$ brew install cdktf",
        "install-npm-dev": "$ npm install --global cdktf-cli@next"
      }
    },
    {
      "index": 6,
      "code": "import { Construct } from \"constructs\"; ...",
      "variants": {
        "lang-python": "#!/usr/bin/env python\nfrom constructs import Construct ...",
        "lang-go": "package main\nimport ( ...",
        "lang-csharp": "using System;\nusing Constructs; ...",
        "lang-java": "package com.mycompany.app; ..."
      }
    }
  ],
  "sections": [...],
  "images": [...]
}
```

### Three Types of Code Blocks

| `variants` keys | Meaning | Mintlify component |
|-----------------|---------|-------------------|
| `{}` (empty) | Same across all languages | Plain fenced code block |
| `lang-python`, `lang-go`, etc. | Different code per language | **`<CodeGroup>`** |
| `install-npm-dev`, `install-homebrew` | Alternative install methods | **`<Tabs>`** |

The **`code` field** is always the default (TypeScript for language, npm-stable for install). Variants only appear when they **differ** from default.

### Variant Key Reference

| Key | Meaning |
|-----|---------|
| `lang-python` | Python language variant |
| `lang-go` | Go language variant |
| `lang-csharp` | C# language variant |
| `lang-java` | Java language variant |
| `install-npm-dev` | npm pre-release install tab |
| `install-homebrew` | Homebrew install tab |

---

## Conversion to Mintlify MDX

### Component Mapping (from `docs-update-plan.md`)

These tutorials use the **same component patterns** as the existing narrative docs:

| Source pattern | Mintlify component | Reference |
|---------------|-------------------|-----------|
| Multi-language code | `<CodeGroup>` | `docs-update-plan.md` Phase 2, Step 5 |
| Install method tabs | `<Tabs>` / `<Tab>` | `docs-update-plan.md` Phase 2, Step 5c |
| Notes/warnings | `<Note>`, `<Warning>`, `<Tip>` | `docs-update-plan.md` Callout Syntax table |
| Step-by-step sections | `<Steps>` / `<Step>` | Available but optional |

### Language-Variant Blocks → `<CodeGroup>`

When a code block has `lang-*` variants, produce a `<CodeGroup>`:

```mdx
<CodeGroup>

```typescript TypeScript
import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
// ... from content.json "code" field
```

```python Python
#!/usr/bin/env python
from constructs import Construct
from cdktf import App, TerraformStack
# ... from content.json variants["lang-python"]
```

```go Go
package main
import (
    "github.com/aws/constructs-go/constructs/v10"
    // ... from variants["lang-go"]
)
```

```csharp C#
using System;
using Constructs;
// ... from variants["lang-csharp"]
```

```java Java
package com.mycompany.app;
// ... from variants["lang-java"]
```

</CodeGroup>
```

`<CodeGroup>` auto-syncs language selection across all groups on the page — same behavior as HashiCorp's `<CodeTabs>`.

### Install-Variant Blocks → `<Tabs>`

When a code block has `install-*` variants (cdktf-install only):

```mdx
<Tabs>
  <Tab title="npm (Stable)">
    ```shell
    npm install --global cdktf-cli@latest
    ```
  </Tab>
  <Tab title="npm (Pre-release)">
    ```shell
    npm install --global cdktf-cli@next
    ```
  </Tab>
  <Tab title="Homebrew">
    ```shell
    brew install cdktf
    ```
  </Tab>
</Tabs>
```

### No-Variant Blocks → Plain Code Fence

```mdx
```shell
mkdir learn-cdktf-docker
```
```

---

## Recovering Prose from Snapshots

The `content.json` reliably captures code blocks but prose extraction is basic. To get accurate prose, read `snapshot-default.txt` and walk the `StaticText` nodes between headings.

### A11y Tree Pattern

```
uid=X_Y heading "Section Title" level="2"       ← heading boundary
uid=X_Z StaticText "First paragraph text..."     ← prose
uid=X_A StaticText "More text..."                ← continues same paragraph
uid=X_B link "some link" url="..."               ← inline link in prose
uid=X_C StaticText " rest of sentence."          ← continues after link
uid=X_D button "Copy" description="..."          ← code block (use content.json)
uid=X_E StaticText "Text after code block..."    ← next paragraph
uid=X_F heading "Next Section" level="2"         ← next section
```

**Recommended workflow:**
1. Use `metadata.json` sections as the heading outline
2. Walk `snapshot-default.txt` sequentially for prose
3. Pull code blocks from `content.json` (cleaner than reassembling `StaticText` nodes)
4. Match code blocks to their position between headings

### Handling Links in Prose

Links appear as interleaved elements:
```
uid=X_1 StaticText "The "
uid=X_2 link "Terraform CLI" url="https://..."
uid=X_3 StaticText " (1.2+)."
```

Reconstruct as: `The [Terraform CLI](https://...) (1.2+).`

Strip Wayback Machine prefixes from URLs:
- `https://web.archive.org/web/20251115095039/https://developer.hashicorp.com/...`
- → `https://developer.hashicorp.com/...`

For internal doc links, convert to relative Mintlify paths.

---

## Code Block Formatting Issues

### Flattened whitespace

The Copy button `description` attribute contains code as a **single line** with spaces where newlines should be. To restore formatting:

1. **Use StaticText nodes as reference** — Each line of code appears as a separate `StaticText` node in the snapshot, with proper indentation preserved
2. **Pattern-match line breaks** — Statement terminators (`;`, `{`, `}`) and keywords (`import`, `const`, `class`) indicate line boundaries
3. **Compare with known patterns** — CDKTF code follows standard patterns per language

### Shell command blocks

Code starting with `$` is a shell command block. Format as:
```mdx
```shell
npm install --global cdktf-cli@latest
```
```
Strip the `$` prefix and any leading space.

### Wayback Machine URL artifacts

Some code blocks contain Wayback URLs that leaked into the content. Clean these:
- `https://web.archive.org/web/TIMESTAMP/https://www.terraform.io/...`
- → `https://www.terraform.io/...`

### Truncated code blocks

Some Copy descriptions are truncated in the a11y tree. Signs:
- Code ends mid-statement
- Missing closing braces/parens

**Recovery:** Read the individual `StaticText` nodes between the heading and the `button "Copy"` element in the raw snapshot. These contain the full line-by-line code.

---

## Applying Project Conventions

### From `docs-update-plan.md`

1. **Frontmatter**: Every MDX file needs `title` + `description`
2. **No duplicate H1**: Title comes from frontmatter, don't repeat as `# Heading`
3. **Code fence titles**: Always include title after language — `` ```ts TypeScript `` not `` ```ts ``
4. **Image paths**: Relative paths to project `images/` directory

### From `docs-rename-plan.md`

1. **OpenTofu mentions**: Add "(or OpenTofu)" on first mention of "Terraform applies/provisions" per tutorial page
2. **TERRAFORM_BINARY_NAME tip**: Add a `<Tip>` callout near CLI command sections:
   ```mdx
   <Tip>
   CDKTN works with both Terraform and OpenTofu. To use OpenTofu, set
   `TERRAFORM_BINARY_NAME=tofu`. See [Environment Variables](/create-and-deploy/environment-variables).
   </Tip>
   ```
3. **Registry links**: Where tutorials reference the Terraform Registry, add OpenTofu Registry link alongside

### Tutorial-specific note

Add an origin callout at the top of each tutorial:
```mdx
<Note>
This tutorial was originally published by HashiCorp for CDKTF. It has been
adapted for CDK Terrain (CDKTN) documentation.
</Note>
```

---

## Tutorial-Specific Conversion Notes

### cdktf-install — Most complex

Has **both** language variants AND install-method tabs.

**Structure:**
```
## Prerequisites (static prose)
## Install CDKTF → <Tabs> for npm-stable / npm-dev / homebrew
## Verify installation (static)
## Quick start tutorial
  ### Create and initialize the project
    - Static shell commands (mkdir, cd)
    - cdktf init → <CodeGroup> (changes --template= per language)
  ### Edit the code → <CodeGroup> (completely different per language)
  ### Deploy container → <CodeGroup> (output shifts per language)
  ### Destroy the container (static)
## Next steps (static)
```

Key code block mapping:
- Block 0: Install command → `<Tabs>` (3 install methods)
- Block 5: `cdktf init` → `<CodeGroup>` (template flag changes per language)
- Block 6: Main source code → `<CodeGroup>` (completely different per language)
- Blocks 7-9: Deploy/destroy output → shifts across variants

### cdktf-build — Standard multi-language

5 language variants, no install tabs.

**Watch for:** The "Examine the code" section has inline code snippets (not full Copy blocks) — these must be recovered from snapshot prose, not from `content.json`.

### cdktf-assets-stacks-lambda — TypeScript only

No language variants. Straightforward prose + code fence conversion.

### cdktf-applications — Largest, TypeScript only

71 code blocks. Covers Kubernetes deployment with iterative code refinement. Many small incremental code changes — consider whether some can be collapsed into fewer, more complete examples.

---

## Variant Diff Logic

```javascript
for (const block of content.codeBlocks) {
  const variantKeys = Object.keys(block.variants);

  if (variantKeys.length === 0) {
    // Identical across all variants → plain code fence
    emit(fencedCode(block.code));

  } else if (variantKeys.some(k => k.startsWith("lang-"))) {
    // Language variants → <CodeGroup>
    emit("<CodeGroup>");
    emit(fencedCode(block.code, "typescript", "TypeScript"));  // default
    for (const lang of ["python", "go", "csharp", "java"]) {
      const key = `lang-${lang}`;
      if (block.variants[key]) {
        emit(fencedCode(block.variants[key], langId(lang), langTitle(lang)));
      }
    }
    emit("</CodeGroup>");

  } else if (variantKeys.some(k => k.startsWith("install-"))) {
    // Install variants → <Tabs>
    emit("<Tabs>");
    emit(tab("npm (Stable)", block.code));
    if (block.variants["install-npm-dev"])
      emit(tab("npm (Pre-release)", block.variants["install-npm-dev"]));
    if (block.variants["install-homebrew"])
      emit(tab("Homebrew", block.variants["install-homebrew"]));
    emit("</Tabs>");
  }
}
```

### Handling missing variants

Not all language variants produce every code block. When a variant has fewer blocks:
- `content.json` may show `"variant": null` — block doesn't exist in that variant
- Or a completely different block at that index — page structure shifted

**Solution:** Cross-reference the raw snapshot headings (stable across variants) to verify which code block belongs to which section.

### Handling mixed install + language variants

In cdktf-install, some blocks have **both** install and language variants. Block 5 (`cdktf init`) changes `--template=` per language AND the output differs. The install-method variants for this block are just Wayback URL artifacts — the actual difference is the language template flag.

---

## Conversion Checklist

Per tutorial:

- [ ] Read `metadata.json` for structure
- [ ] Read `content.json` for code blocks + variants
- [ ] Walk `snapshot-default.txt` for prose between code blocks
- [ ] Create MDX file with frontmatter (`title` + `description`)
- [ ] Add origin note `<Note>` callout
- [ ] For each section from metadata:
  - [ ] Copy prose from snapshot (reconstruct links)
  - [ ] Insert code blocks from content.json
  - [ ] Wrap language-variant blocks in `<CodeGroup>`
  - [ ] Wrap install-variant blocks in `<Tabs>`
  - [ ] Add language + title to each code fence
- [ ] Clean Wayback URLs from code and links
- [ ] Re-format flattened code (restore line breaks)
- [ ] Add images with relative paths + alt text
- [ ] Add "(or OpenTofu)" first-mention
- [ ] Add `TERRAFORM_BINARY_NAME` `<Tip>` near CLI sections
- [ ] Add to `docs.json` navigation
- [ ] Verify with `mint dev`

---

## Navigation Integration

Add to `docs.json`:

```json
{
  "group": "Tutorials",
  "pages": [
    "tutorials/install",
    "tutorials/build-aws",
    "tutorials/lambda-functions",
    "tutorials/deploy-applications"
  ]
}
```

---

## Running the Tools

```shell
# Re-parse snapshots (if updated)
node scraped/parse.mjs

# Download images
node scraped/download-images.mjs
```
