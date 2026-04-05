import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { Client } from "basic-ftp";
import { ensureDir } from "../../src/lib/fs-utils.mjs";

const OUT_DIR = path.resolve("src/data/raw/bol");
const OUT_FILE = path.join(OUT_DIR, "bol_feed.xml");

async function main() {
  ensureDir(OUT_DIR);

  const client = new Client(30000);
  client.ftp.verbose = false;

  await client.access({
    host: process.env.BOL_FTP_HOST,
    port: Number(process.env.BOL_FTP_PORT || 21),
    user: process.env.BOL_FTP_USER,
    password: process.env.BOL_FTP_PASSWORD,
    secure: String(process.env.BOL_FTP_SECURE || "false") === "true"
  });

  const remoteDir = process.env.BOL_FTP_REMOTE_DIR || "/";
  const remoteFile = process.env.BOL_FTP_REMOTE_FILE || "productfeed.xml";

  await client.cd(remoteDir);
  await client.downloadTo(OUT_FILE, remoteFile);
  client.close();

  const stat = fs.statSync(OUT_FILE);
  console.log(`Downloaded feed to ${OUT_FILE} (${stat.size} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
