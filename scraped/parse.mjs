#!/usr/bin/env node
/**
 * Parse CDKTF tutorial snapshots into structured content.json files.
 *
 * Reads a11y tree snapshots from scraped/<tutorial>/ directories and extracts:
 * - Code blocks from Copy button descriptions
 * - Prose from StaticText nodes between headings
 * - Sections from heading elements
 * - Tab variants by diffing against default snapshot
 *
 * Usage: node scraped/parse.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Extract code blocks from Copy button descriptions in a snapshot.
 * Pattern: button "Copy" description="<full code text>"
 */
function extractCodeBlocks(snapshotText) {
  const blocks = [];
  // Match: button "Copy" description="..."
  // The description can contain quotes escaped as smart quotes or regular quotes
  const regex = /button "Copy" description="([^"]*(?:"[^"]*)*?)"\s*$/gm;

  // Simpler approach: find lines with 'button "Copy" description='
  for (const line of snapshotText.split("\n")) {
    const match = line.match(
      /button "Copy" description=(?:\u201c|\u201d|")(.*?)(?:\u201c|\u201d|")?\s*$/
    );
    if (match) {
      // The description might be truncated in the snapshot. Extract what we have.
      blocks.push(match[1]);
      continue;
    }
    // Also try: description="..." where content has smart quotes
    const descIdx = line.indexOf('description="');
    if (descIdx !== -1 && line.includes('button "Copy"')) {
      const start = descIdx + 'description="'.length;
      // Find the closing quote — it's the last quote on the line
      let end = line.length - 1;
      while (end > start && line[end] !== '"') end--;
      if (end > start) {
        blocks.push(line.substring(start, end));
      }
    }
  }
  return blocks;
}

/**
 * Extract headings and their levels from a snapshot.
 */
function extractHeadings(snapshotText) {
  const headings = [];
  const regex = /heading "([^"]*)" level="(\d+)"/g;
  let match;
  while ((match = regex.exec(snapshotText)) !== null) {
    headings.push({ text: match[1], level: parseInt(match[2]) });
  }

  // Also extract headings from StaticText after heading elements
  const lines = snapshotText.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const hMatch = lines[i].match(/heading.*level="(\d+)"/);
    if (hMatch && !lines[i].includes('"')) {
      // Heading text is on the next StaticText line
      if (i + 1 < lines.length) {
        const textMatch = lines[i + 1].match(/StaticText "([^"]+)"/);
        if (textMatch) {
          headings.push({ text: textMatch[1], level: parseInt(hMatch[1]) });
        }
      }
    }
  }

  return headings;
}

/**
 * Extract prose sections between headings.
 * Walks StaticText nodes and groups them by the preceding heading.
 */
function extractSections(snapshotText) {
  const lines = snapshotText.split("\n");
  const sections = [];
  let currentSection = null;
  let currentProse = [];
  let inMain = false;

  for (const line of lines) {
    // Track when we enter the main content area
    if (line.includes(" main")) {
      inMain = true;
      continue;
    }
    if (line.includes(" contentinfo")) {
      inMain = false;
      continue;
    }
    if (!inMain) continue;

    // Detect headings
    const headingMatch = line.match(/heading.*level="(\d+)"/);
    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.prose = currentProse.join(" ").trim();
        sections.push(currentSection);
      }
      currentSection = { level: parseInt(headingMatch[1]), heading: "", prose: "" };
      currentProse = [];
      continue;
    }

    // Get heading text from StaticText after heading
    if (
      currentSection &&
      !currentSection.heading &&
      line.includes("StaticText")
    ) {
      const textMatch = line.match(/StaticText "([^"]+)"/);
      if (textMatch) {
        currentSection.heading = textMatch[1];
        continue;
      }
    }

    // Collect prose StaticText (skip code blocks, navigation, etc.)
    if (currentSection && line.includes("StaticText")) {
      const textMatch = line.match(/StaticText "([^"]+)"/);
      if (textMatch) {
        const text = textMatch[1].trim();
        // Skip single-char or formatting artifacts
        if (text.length > 1 && text !== "/" && text !== "|") {
          currentProse.push(text);
        }
      }
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.prose = currentProse.join(" ").trim();
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Extract image elements from a snapshot.
 */
function extractImages(snapshotText) {
  const images = [];
  const regex = /image "([^"]*)" url="([^"]+)"/g;
  let match;
  while ((match = regex.exec(snapshotText)) !== null) {
    const url = match[2];
    // Skip wayback toolbar images
    if (url.includes("web-static.archive.org")) continue;
    // Strip wayback prefix
    const cleanUrl = url.replace(
      /https:\/\/web\.archive\.org\/web\/\d+im_\//,
      ""
    );
    images.push({ alt: match[1], src: cleanUrl });
  }
  return images;
}

/**
 * Compare two snapshots' code blocks to find differences (for tab variants).
 */
function diffCodeBlocks(defaultBlocks, variantBlocks) {
  const diffs = {};
  for (let i = 0; i < Math.max(defaultBlocks.length, variantBlocks.length); i++) {
    if (defaultBlocks[i] !== variantBlocks[i]) {
      diffs[`block-${i}`] = {
        default: defaultBlocks[i] || null,
        variant: variantBlocks[i] || null,
      };
    }
  }
  return diffs;
}

/**
 * Process a single tutorial directory.
 */
function processTutorial(tutorialDir) {
  const slug = tutorialDir.split("/").pop();
  console.log(`\nProcessing: ${slug}`);

  const metadataPath = join(tutorialDir, "metadata.json");
  if (!existsSync(metadataPath)) {
    console.log(`  Skipping - no metadata.json`);
    return null;
  }

  const metadata = JSON.parse(readFileSync(metadataPath, "utf-8"));
  const defaultSnapshotPath = join(tutorialDir, "snapshot-default.txt");

  if (!existsSync(defaultSnapshotPath)) {
    console.log(`  Skipping - no snapshot-default.txt`);
    return null;
  }

  const defaultSnapshot = readFileSync(defaultSnapshotPath, "utf-8");

  // Extract from default snapshot
  const codeBlocks = extractCodeBlocks(defaultSnapshot);
  const sections = extractSections(defaultSnapshot);
  const images = extractImages(defaultSnapshot);

  console.log(`  Code blocks: ${codeBlocks.length}`);
  console.log(`  Sections: ${sections.length}`);
  console.log(`  Images: ${images.length}`);

  // Process tab variants
  const tabsDir = join(tutorialDir, "tabs");
  const variants = {};

  if (existsSync(tabsDir)) {
    const tabFiles = readdirSync(tabsDir).filter((f) => f.endsWith(".txt"));
    for (const tabFile of tabFiles) {
      const variantName = tabFile.replace(".txt", "");
      const variantPath = join(tabsDir, tabFile);
      const variantSnapshot = readFileSync(variantPath, "utf-8");
      const variantCodeBlocks = extractCodeBlocks(variantSnapshot);

      const diffs = diffCodeBlocks(codeBlocks, variantCodeBlocks);
      const diffCount = Object.keys(diffs).length;

      variants[variantName] = {
        codeBlocks: variantCodeBlocks.length,
        diffs: diffCount,
        changedBlocks: diffs,
      };

      console.log(
        `  Variant ${variantName}: ${variantCodeBlocks.length} code blocks, ${diffCount} diffs`
      );
    }
  }

  // Build content.json structure
  const content = {
    title: metadata.title,
    url: metadata.url,
    codeBlocks: codeBlocks.map((block, i) => ({
      index: i,
      code: block,
      variants: {},
    })),
    sections: sections.map((s) => ({
      heading: s.heading,
      level: s.level,
      prose: s.prose,
    })),
    images,
    tabVariants: variants,
  };

  // Merge variant diffs into code blocks
  for (const [variantName, variantData] of Object.entries(variants)) {
    for (const [blockKey, diff] of Object.entries(variantData.changedBlocks)) {
      const blockIndex = parseInt(blockKey.replace("block-", ""));
      if (content.codeBlocks[blockIndex]) {
        content.codeBlocks[blockIndex].variants[variantName] =
          diff.variant || "(removed)";
      }
    }
  }

  return content;
}

// Main
const scrapedDir = __dirname;
const tutorials = ["cdktf-install", "cdktf-build", "cdktf-assets-stacks-lambda", "cdktf-applications"];

console.log("=== CDKTF Tutorial Snapshot Parser ===\n");

for (const slug of tutorials) {
  const tutorialDir = join(scrapedDir, slug);
  if (!existsSync(tutorialDir)) {
    console.log(`Directory not found: ${tutorialDir}`);
    continue;
  }

  const content = processTutorial(tutorialDir);
  if (content) {
    const outputPath = join(tutorialDir, "content.json");
    writeFileSync(outputPath, JSON.stringify(content, null, 2));
    console.log(`  Written: ${outputPath}`);
  }
}

console.log("\nDone.");
