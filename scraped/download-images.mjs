#!/usr/bin/env node
/**
 * Download images referenced in images.json.
 *
 * Reads scraped/images.json and downloads each image to scraped/images/<tutorial>/<filename>.
 *
 * Usage: node scraped/download-images.mjs
 */

import { readFileSync, mkdirSync, createWriteStream, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const file = createWriteStream(destPath);

    protocol
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (response) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          file.close();
          return download(response.headers.location, destPath).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(destPath);
        });
      })
      .on("error", (err) => {
        file.close();
        reject(err);
      });
  });
}

async function main() {
  const imagesJsonPath = join(__dirname, "images.json");
  if (!existsSync(imagesJsonPath)) {
    console.error("images.json not found at", imagesJsonPath);
    process.exit(1);
  }

  const { images } = JSON.parse(readFileSync(imagesJsonPath, "utf-8"));
  console.log(`Found ${images.length} images to download.\n`);

  for (const img of images) {
    const tutorialDir = join(__dirname, "images", img.tutorial);
    mkdirSync(tutorialDir, { recursive: true });

    const destPath = join(tutorialDir, img.filename);
    if (existsSync(destPath)) {
      console.log(`  Skip (exists): ${destPath}`);
      continue;
    }

    console.log(`  Downloading: ${img.alt}`);
    console.log(`    URL: ${img.src}`);
    console.log(`    To:  ${destPath}`);

    try {
      await download(img.src, destPath);
      console.log(`    OK`);
    } catch (err) {
      console.error(`    FAILED: ${err.message}`);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("\nDone.");
}

main();
