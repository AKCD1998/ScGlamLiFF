import { cp, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
const distDir = path.resolve(frontendRoot, "dist");
const defaultTargetDir = path.resolve(
  frontendRoot,
  "..",
  "..",
  "scGlamLiff-reception",
  "backend",
  "public",
  "liff"
);

const normalizePath = (value) => value.replace(/\\/g, "/").toLowerCase();

const resolveTargetDir = () => {
  const configuredTarget = String(process.env.SCGLAM_BACKEND_LIFF_DIR || "").trim();

  if (!configuredTarget) {
    return defaultTargetDir;
  }

  return path.isAbsolute(configuredTarget)
    ? configuredTarget
    : path.resolve(frontendRoot, configuredTarget);
};

const assertSafeTargetDir = (targetDir) => {
  const normalizedTarget = normalizePath(path.resolve(targetDir));

  if (!normalizedTarget.endsWith("/backend/public/liff")) {
    throw new Error(
      `Refusing to sync outside a backend LIFF target. Resolved target: ${targetDir}`
    );
  }

  if (normalizedTarget === normalizePath(distDir)) {
    throw new Error("Target directory must not be the same as dist/");
  }
};

const ensureExists = async (targetPath, label) => {
  try {
    await stat(targetPath);
  } catch {
    throw new Error(`${label} not found: ${targetPath}`);
  }
};

const collectAssetRefs = (html) =>
  [...html.matchAll(/\/liff\/assets\/([^"'()\s>]+)/g)].map((match) =>
    path.join("assets", match[1])
  );

const dedupe = (values) => [...new Set(values)];
const backendReadme = `Place the built LIFF frontend bundle here for same-origin hosting under \`/liff/\`.

This directory is refreshed by \`npm run sync:backend-liff\` or \`npm run build:backend-liff\`.

Expected contents:
- \`index.html\`
- \`assets/\`
`;

const main = async () => {
  const targetDir = resolveTargetDir();
  const distIndexPath = path.join(distDir, "index.html");
  const targetIndexPath = path.join(targetDir, "index.html");
  const targetReadmePath = path.join(targetDir, "README.md");

  assertSafeTargetDir(targetDir);
  await ensureExists(distDir, "Frontend dist directory");
  await ensureExists(distIndexPath, "Frontend dist index.html");

  const distIndexHtml = await readFile(distIndexPath, "utf8");
  const referencedAssets = dedupe(collectAssetRefs(distIndexHtml));

  if (referencedAssets.length === 0) {
    throw new Error(`No /liff/assets references found in ${distIndexPath}`);
  }

  await rm(targetDir, { recursive: true, force: true });
  await cp(distDir, targetDir, { recursive: true, force: true });

  const syncedIndexHtml = await readFile(targetIndexPath, "utf8");

  if (syncedIndexHtml !== distIndexHtml) {
    throw new Error("Synced backend index.html does not match frontend dist/index.html");
  }

  for (const assetRef of referencedAssets) {
    await ensureExists(path.join(targetDir, assetRef), `Synced asset ${assetRef}`);
  }

  await writeFile(targetReadmePath, backendReadme, "utf8");

  console.log(`Synced LIFF bundle to ${targetDir}`);
  console.log(`Verified index.html with assets: ${referencedAssets.join(", ")}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
