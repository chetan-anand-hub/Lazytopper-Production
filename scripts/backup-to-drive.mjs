import { ReplitConnectors } from "@replit/connectors-sdk";
import { execSync } from "child_process";
import { readFileSync, unlinkSync, existsSync, statSync } from "fs";

const connectors = new ReplitConnectors();
const PROJECT_ROOT = "/home/runner/workspace";
const FOLDER_NAME = "LazyTopper-Backup";
const CHUNK_SIZE = 5 * 1024 * 1024;

async function findOrCreateFolder() {
  const searchResp = await connectors.proxy(
    "google-drive",
    `/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    { method: "GET" }
  );
  const searchData = await searchResp.json();

  if (searchData.files && searchData.files.length > 0) {
    console.log(`Found existing folder: ${FOLDER_NAME}`);
    return searchData.files[0].id;
  }

  const createResp = await connectors.proxy(
    "google-drive",
    "/drive/v3/files",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      }),
    }
  );
  const folder = await createResp.json();
  console.log(`Created new folder: ${FOLDER_NAME}`);
  return folder.id;
}

function createArchive() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const archiveName = `lazytopper-backup-${timestamp}.tar.gz`;
  const archivePath = `/tmp/${archiveName}`;

  console.log("Creating archive from git-tracked source files...");
  execSync(
    `git -C ${PROJECT_ROOT} archive --format=tar HEAD | gzip > ${archivePath}`,
    { stdio: "pipe", timeout: 120000 }
  );

  const size = statSync(archivePath).size;
  console.log(`Archive created: ${archiveName} (${(size / 1024 / 1024).toFixed(1)} MB)`);

  return { archiveName, archivePath, size };
}

async function uploadSmallFile(folderId, archiveName, archivePath) {
  const fileContent = readFileSync(archivePath);
  const boundary = "backup_boundary_" + Date.now();
  const metadata = JSON.stringify({ name: archiveName, parents: [folderId] });

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
    Buffer.from(metadata),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: application/gzip\r\n\r\n`),
    fileContent,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  console.log(`Uploading ${archiveName}...`);
  const resp = await connectors.proxy(
    "google-drive",
    "/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    }
  );
  return await resp.json();
}

async function uploadResumable(folderId, archiveName, archivePath, fileSize) {
  console.log(`Starting resumable upload of ${archiveName} (${(fileSize / 1024 / 1024).toFixed(1)} MB)...`);

  const initResp = await connectors.proxy(
    "google-drive",
    "/upload/drive/v3/files?uploadType=resumable",
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "application/gzip", "X-Upload-Content-Length": String(fileSize) },
      body: JSON.stringify({ name: archiveName, parents: [folderId] }),
    }
  );

  const locationHeader = initResp.headers?.get?.("location") || initResp.headers?.location;

  if (!locationHeader) {
    const text = await initResp.text();
    console.log("Resumable init response:", text.substring(0, 500));
    console.log("Headers:", JSON.stringify(Object.fromEntries?.(initResp.headers?.entries?.() || []) || {}));
    throw new Error("No upload location returned from resumable init. Falling back to chunked approach.");
  }

  const fileContent = readFileSync(archivePath);
  let offset = 0;
  let chunkNum = 0;
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

  while (offset < fileSize) {
    chunkNum++;
    const end = Math.min(offset + CHUNK_SIZE, fileSize);
    const chunk = fileContent.subarray(offset, end);
    const rangeHeader = `bytes ${offset}-${end - 1}/${fileSize}`;

    process.stdout.write(`  Chunk ${chunkNum}/${totalChunks} (${rangeHeader})... `);

    const chunkResp = await fetch(locationHeader, {
      method: "PUT",
      headers: { "Content-Range": rangeHeader, "Content-Type": "application/gzip" },
      body: chunk,
    });

    if (chunkResp.status === 200 || chunkResp.status === 201) {
      const result = await chunkResp.json();
      console.log("done!");
      return result;
    } else if (chunkResp.status === 308) {
      console.log("ok");
      offset = end;
    } else {
      const errText = await chunkResp.text();
      throw new Error(`Upload chunk failed (${chunkResp.status}): ${errText.substring(0, 300)}`);
    }
  }
}

async function uploadFile(folderId, archiveName, archivePath, fileSize) {
  if (fileSize < 10 * 1024 * 1024) {
    const result = await uploadSmallFile(folderId, archiveName, archivePath);
    if (result.id) {
      console.log(`Upload successful! File: ${result.name} (ID: ${result.id})`);
      return result;
    }
    console.log("Small upload failed, trying resumable...");
  }

  try {
    const result = await uploadResumable(folderId, archiveName, archivePath, fileSize);
    if (result?.id) {
      console.log(`Upload successful! File: ${result.name} (ID: ${result.id})`);
      return result;
    }
  } catch (err) {
    console.log(`Resumable upload error: ${err.message}`);
  }

  console.log("Falling back to direct upload of source-only archive...");
  const srcArchivePath = archivePath.replace(".tar.gz", "-src.tar.gz");
  const srcArchiveName = archiveName.replace(".tar.gz", "-src.tar.gz");
  execSync(
    `git -C ${PROJECT_ROOT} archive --format=tar HEAD -- lazytopper/src lazytopper/server lazytopper/public artifacts scripts package.json pnpm-workspace.yaml pnpm-lock.yaml replit.md .replit | gzip > ${srcArchivePath}`,
    { stdio: "pipe", timeout: 60000 }
  );
  const srcSize = statSync(srcArchivePath).size;
  console.log(`Source-only archive: ${(srcSize / 1024 / 1024).toFixed(1)} MB`);

  const result = await uploadSmallFile(folderId, srcArchiveName, srcArchivePath);
  if (existsSync(srcArchivePath)) unlinkSync(srcArchivePath);

  if (result.id) {
    console.log(`Upload successful! File: ${result.name} (ID: ${result.id})`);
  } else {
    console.error("Upload failed:", JSON.stringify(result));
  }
  return result;
}

async function cleanupOldBackups(folderId, keepCount = 5) {
  const listResp = await connectors.proxy(
    "google-drive",
    `/drive/v3/files?q='${folderId}' in parents and trashed=false&orderBy=createdTime desc&fields=files(id,name,createdTime)&pageSize=100`,
    { method: "GET" }
  );
  const listData = await listResp.json();
  const files = listData.files || [];

  if (files.length > keepCount) {
    const toDelete = files.slice(keepCount);
    console.log(`Cleaning up ${toDelete.length} old backup(s)...`);
    for (const file of toDelete) {
      await connectors.proxy("google-drive", `/drive/v3/files/${file.id}`, { method: "DELETE" });
      console.log(`  Deleted: ${file.name}`);
    }
  }
}

async function main() {
  console.log("=== LazyTopper Google Drive Backup ===\n");

  const folderId = await findOrCreateFolder();
  const { archiveName, archivePath, size } = createArchive();

  try {
    await uploadFile(folderId, archiveName, archivePath, size);
    await cleanupOldBackups(folderId);
  } finally {
    if (existsSync(archivePath)) {
      unlinkSync(archivePath);
      console.log("Cleaned up local archive.");
    }
  }

  console.log("\nBackup complete! Check your Google Drive > LazyTopper-Backup folder.");
}

main().catch((err) => {
  console.error("Backup failed:", err.message);
  process.exit(1);
});
