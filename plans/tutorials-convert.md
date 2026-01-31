# Plan: Create Tutorial MDX Files from Scraped Content

## Overview

Create 4 tutorial MDX files from scraped Wayback Machine content, update internal links across 7 existing files, and add tutorials to the navigation.

## Files to Create

| File | Source | Language Variants | Code Blocks |
|------|--------|-------------------|-------------|
| `content/tutorials/install.mdx` | `scraped/cdktf-install/` | 5 languages + 3 install tabs | 10 |
| `content/tutorials/build-aws.mdx` | `scraped/cdktf-build/` | 5 languages | 9 |
| `content/tutorials/lambda-functions.mdx` | `scraped/cdktf-assets-stacks-lambda/` | TS only | 10 |
| `content/tutorials/deploy-applications.mdx` | `scraped/cdktf-applications/` | TS only | 71 |

## Files to Modify

| File | Change |
|------|--------|
| `content/docs.json` | Add "Tutorials" group to navigation |
| `content/index.mdx:46` | Update tutorial link |
| `content/concepts/assets.mdx:18` | Update tutorial link |
| `content/concepts/constructs.mdx:349` | Update tutorial link |
| `content/concepts/stacks.mdx:12,177` | Update tutorial links (2) |
| `content/create-and-deploy/hcp-terraform.mdx:10` | Point HCP link to `https://docs.terrateam.io/quickstart/` |
| `content/create-and-deploy/project-setup.mdx:11` | Update tutorial links (2) |
| `content/examples-and-guides/examples.mdx:17-20` | Update tutorial links (4) |

## Data Sources Per Tutorial

For each tutorial, content comes from:
1. **`content.json`** → code blocks with variant diffs (primary for code)
2. **`sections[0].prose`** → full prose text with embedded structure (primary for text)
3. **`metadata.json`** → section headings, tab groups, images
4. **`snapshot-default.txt`** → raw a11y tree for code formatting recovery

## Step-by-Step Execution

### Step 1: Create directories and copy images

- Create `content/tutorials/`
- Create `content/images/tutorials/`
- Copy images from `scraped/images/` to `content/images/tutorials/`:
  - `terraform-as-platform.png` (install tutorial)
  - `terraform-docker-nginx.png` (install tutorial)
  - `aws-console.png` (build tutorial)

### Step 2: Create `install.mdx` (most complex — language + install tabs)

Source: `scraped/cdktf-install/`

Structure:
- Frontmatter (title, description)
- `<Note>` origin callout
- Introduction prose + Terraform-as-platform image
- **Prerequisites** section
- **Install CDKTF** → `<Tabs>` for npm-stable / npm-dev / homebrew (code block 0)
- **Verify the installation** → plain code blocks (blocks 1-2)
- **Quick start tutorial** with subsections:
  - Create and initialize the project → plain shell (blocks 3-4), `<CodeGroup>` for init output (block 5)
  - Edit the code → `<CodeGroup>` for source code (block 6) — needs formatting recovery
  - Deploy container → `<CodeGroup>` for deploy output (block 7), plain `docker ps` (block 8)
  - Destroy the container → plain destroy output (block 9)
  - NGINX screenshot image
- **Next steps** with internal links
- `<Tip>` for TERRAFORM_BINARY_NAME / OpenTofu

Code formatting: Block 6 (source code) is flattened in content.json. Will recover proper formatting from snapshot StaticText nodes.

### Step 3: Create `build-aws.mdx` (5 language variants)

Source: `scraped/cdktf-build/`

Structure:
- Frontmatter, `<Note>` origin, intro prose
- **Prerequisites**
- **Initialize** → plain shell (blocks 0-1), `<CodeGroup>` for init output (block 2)
- **Define your application** → `<CodeGroup>` for main source (block 3), `<CodeGroup>` for backend config (block 4)
- **Provision infrastructure** → deploy output (block 5 for TS/Python or block 7 for Go/C#/Java)
- **Change infrastructure** → `<CodeGroup>` for tag update (block 6), deploy output (block 7)
- **Clean up** → destroy output (block 8)
- **Next steps**
- AWS Console image

Code formatting: Block 3 (main source) needs formatting recovery for all 5 languages.

### Step 4: Create `lambda-functions.mdx` (TS only — straightforward)

Source: `scraped/cdktf-assets-stacks-lambda/`

Structure:
- Frontmatter, `<Note>` origin, intro
- **Prerequisites** with `<Warning>` about AWS charges
- **Explore CDKTF application** → git clone, cd, code walkthrough with inline code
- **View application stacks** → npm install, cdktf provider add, cdktf list
- **Deploy Hello World function** → cdktf deploy + curl
- **Deploy Hello Name function** → cdktf deploy + curl
- **Inspect synthesized stacks** → directory tree
- **Clean up resources** → two cdktf destroy commands
- **Next steps**

All code blocks are shell commands or terminal output — no formatting issues.

### Step 5: Create `deploy-applications.mdx` (TS only — largest, 71 blocks)

Source: `scraped/cdktf-applications/`

Structure follows detailed progressive tutorial: clone → kind cluster → CDKTF init → create deployment → refactor with constructs → add service → test → deploy custom image → add backend → multiple stacks → clean up.

This is the largest tutorial with 71 code blocks. All TypeScript-only. Mix of:
- Shell commands (most blocks) — no formatting issues
- TypeScript source code (blocks 20, 22, 25, 26, 28, 29, 30, 32, 37, 38, 39, 41, 42, 56, 61, 63) — need formatting recovery
- Terminal output — no formatting issues

### Step 6: Update `content/docs.json` navigation

Add Tutorials group:
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

Place after "Getting Started" group.

### Step 7: Update internal links across 7 files

Link mapping:
| Old path | New path |
|----------|----------|
| `/terraform/tutorials/cdktn/cdktn-install` | `/tutorials/install` |
| `/terraform/tutorials/cdktn/cdktn-build` | `/tutorials/build-aws` |
| `/terraform/tutorials/cdktn/cdktf-build` | `/tutorials/build-aws` |
| `/terraform/tutorials/cdktn/cdktn-assets-stacks-lambda` | `/tutorials/lambda-functions` |
| `/terraform/tutorials/cdktn/cdktf-assets-stacks-lambda` | `/tutorials/lambda-functions` |
| `/terraform/tutorials/cdktn/cdktn-applications` | `/tutorials/deploy-applications` |
| `/terraform/tutorials/cdktn/cdktf-applications` | `/tutorials/deploy-applications` |
| `/terraform/tutorials/cdktn` | `/tutorials/install` (index → first tutorial) |
| `/terraform/tutorials/cloud-get-started` | `https://docs.terrateam.io/quickstart/` |

Strip any `?utm_source=...` query parameters.

## Conventions Applied

Per `tutorials-recover.md` and `CLAUDE.md`:

1. **Frontmatter**: `title` + `description` (required)
2. **No duplicate H1**: Title from frontmatter only
3. **Code fence titles**: Always include — `` ```ts TypeScript ``, `` ```shell Shell ``
4. **`<CodeGroup>`**: For language-variant code blocks (auto-syncs selection)
5. **`<Tabs>`/`<Tab>`**: For install-method variants
6. **`<Note>` origin callout**: At top of each tutorial
7. **`<Tip>` TERRAFORM_BINARY_NAME**: Near CLI command sections
8. **"(or OpenTofu)"**: On first mention of Terraform provisioning per page
9. **Image paths**: Copy to `content/images/tutorials/`, reference with relative paths
10. **Clean Wayback URLs**: Strip `https://web.archive.org/web/TIMESTAMP/` prefixes
11. **Shell commands**: Strip `$` prefix, use `shell` language tag

## Code Formatting Recovery

Source code blocks (TypeScript, Python, Go, C#, Java) in `content.json` are flattened to single lines. Recovery approach:

1. Read `snapshot-default.txt` (and `tabs/lang-*.txt` for variants)
2. Find the corresponding code section between headings
3. Use StaticText nodes (which preserve line-by-line formatting) to reconstruct proper indentation
4. For well-known patterns (import blocks, class definitions), apply standard formatting

## Verification

After creating all files:
1. Run `npx mintlify dev` to verify all pages render
2. Check each tutorial page loads without errors
3. Verify `<CodeGroup>` language tabs work
4. Verify `<Tabs>` install method tabs work
5. Verify all internal links resolve (no broken links)
6. Verify images display correctly
