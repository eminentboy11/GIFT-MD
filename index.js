import fs from "fs";
import path from "path";
import axios from "axios";
import AdmZip from "adm-zip";
import { spawn } from "child_process";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const deepLayers = Array.from({ length: 50 }, (_, i) => `.x${i + 1}`);
const TEMP_DIR = path.join(__dirname, '.npm', 'xcache', ...deepLayers);

const DOWNLOAD_URL = "https://github.com/eminentboy11/GIFT-MD/archive/refs/heads/main.zip";
const EXTRACT_DIR = path.join(TEMP_DIR, "GIFT-MD-main");
const LOCAL_SETTINGS = path.join(__dirname, "settings.js");
const EXTRACTED_SETTINGS = path.join(EXTRACT_DIR, "settings.js");

const SESSION_BACKUP_DIR = path.join(__dirname, '.session_backup');
const SESSION_DIR = path.join(EXTRACT_DIR, 'data', 'session');
const SESSION_FILES = ['auth.db', 'auth.db-wal', 'auth.db-shm'];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function downloadAndExtract() {
  try {
    if (fs.existsSync(SESSION_DIR)) {
      console.log(chalk.blue("💾 Backing up session files..."));
      fs.mkdirSync(SESSION_BACKUP_DIR, { recursive: true });
      
      let backedUp = 0;
      for (const file of SESSION_FILES) {
        const sourcePath = path.join(SESSION_DIR, file);
        const backupPath = path.join(SESSION_BACKUP_DIR, file);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, backupPath);
          backedUp++;
        }
      }
      
      if (backedUp > 0) {
        console.log(chalk.green(`✅ Backed up ${backedUp} session file(s)!`));
      } else {
        console.log(chalk.yellow("⚠️ No session files found (first run)"));
      }
    } else {
      console.log(chalk.yellow("⚠️ No existing session directory (first run)"));
    }

    if (fs.existsSync(TEMP_DIR)) {
      console.log(chalk.yellow("🧹 Cleaning previous cache..."));
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    const zipPath = path.join(TEMP_DIR, "repo.zip");

    console.log(chalk.blue("⬇️ Connecting to GIFT MD..."));

    const response = await axios({
      url: DOWNLOAD_URL,
      method: "GET",
      responseType: "stream",
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(zipPath);
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log(chalk.green("📦 ZIP download complete."));

    try {
      new AdmZip(zipPath).extractAllTo(TEMP_DIR, true);
    } catch (e) {
      console.error(chalk.red("❌ Failed to extract ZIP:"), e);
      throw e;
    } finally {
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
    }

    if (fs.existsSync(SESSION_BACKUP_DIR)) {
      console.log(chalk.blue("♻️ Restoring session files..."));
      fs.mkdirSync(SESSION_DIR, { recursive: true });
      
      let restored = 0;
      for (const file of SESSION_FILES) {
        const backupPath = path.join(SESSION_BACKUP_DIR, file);
        const targetPath = path.join(SESSION_DIR, file);
        
        if (fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, targetPath);
          restored++;
        }
      }
      
      if (restored > 0) {
        console.log(chalk.green(`✅ Restored ${restored} session file(s)!`));
      }
      
      fs.rmSync(SESSION_BACKUP_DIR, { recursive: true, force: true });
    }

    const pluginFolder = path.join(EXTRACT_DIR, "");
    if (fs.existsSync(pluginFolder)) {
      console.log(chalk.green("✅ Plugins folder found."));
    } else {
      console.log(chalk.red("❌ Plugin folder not found."));
    }

  } catch (e) {
    console.error(chalk.red("❌ Download/Extract failed:"), e);
    throw e;
  }
}

async function applyLocalSettings() {
  if (!fs.existsSync(LOCAL_SETTINGS)) {
    console.log(chalk.yellow("⚠️ No local settings file found."));
    return;
  }

  try {
    fs.mkdirSync(EXTRACT_DIR, { recursive: true });
    fs.copyFileSync(LOCAL_SETTINGS, EXTRACTED_SETTINGS);
    console.log(chalk.green("🛠️ Local settings applied."));
  } catch (e) {
    console.error(chalk.red("❌ Failed to apply local settings:"), e);
  }

  await delay(500);
}

function startBot() {
  console.log(chalk.cyan("🚀 Launching bot instance..."));

  if (!fs.existsSync(EXTRACT_DIR)) {
    console.error(chalk.red("❌ Extracted directory not found. Cannot start bot."));
    return;
  }

  if (!fs.existsSync(path.join(EXTRACT_DIR, "index.js"))) {
    console.error(chalk.red("❌ index.js not found in extracted directory."));
    return;
  }

  const bot = spawn("node", ["index.js"], {
    cwd: EXTRACT_DIR,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });

  bot.on("close", (code) => {
    console.log(chalk.red(`💥 Bot terminated with exit code: ${code}`));
  });

  bot.on("error", (err) => {
    console.error(chalk.red("❌ Bot failed to start:"), err);
  });
}

(async () => {
  try {
    await downloadAndExtract();
    await applyLocalSettings();
    startBot();
  } catch (e) {
    console.error(chalk.red("❌ Fatal error in main execution:"), e);
    process.exit(1);
  }
})();
