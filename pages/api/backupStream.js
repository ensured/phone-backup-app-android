import generateDate from "@/util/date";
import Adb from "@devicefarmer/adbkit";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { HardDrive } from "lucide-react";

const generateTimeAgo = (timeDifferenceInSeconds) => {
  if (timeDifferenceInSeconds < 60) {
    return `${timeDifferenceInSeconds}s`;
  } else if (timeDifferenceInSeconds < 3600) {
    const minutes = Math.floor(timeDifferenceInSeconds / 60);
    return `${minutes}min`;
  } else if (timeDifferenceInSeconds < 86400) {
    const hours = Math.floor(timeDifferenceInSeconds / 3600);
    return `${hours}h`;
  } else if (timeDifferenceInSeconds < 604800) {
    const days = Math.floor(timeDifferenceInSeconds / 86400);
    return `${days}d`;
  } else if (timeDifferenceInSeconds < 2592000) {
    const weeks = Math.floor(timeDifferenceInSeconds / 604800);
    return `${weeks}w`;
  } else if (timeDifferenceInSeconds < 31536000) {
    const months = Math.floor(timeDifferenceInSeconds / 2592000);
    return `${months}m`;
  } else {
    const years = Math.floor(timeDifferenceInSeconds / 31536000);
    return `${years}y`;
  }
};

const backupSrcs = [
  { src: "/storage/emulated/0/DCIM/Camera", dest: "Camera", key: "Camera" },
  { src: "/storage/emulated/0/Download", dest: "Download", key: "Download" },
  { src: "/storage/emulated/0/Pictures", dest: "Pictures", key: "Pictures" },
];

// Function to escape backslashes for adb shell commands
function escapeBackslashes(path) {
  return path.replace(/\\/g, "\\\\");
}

// New function for handling Windows output paths
function normalizeOutputPath(path) {
  // Convert Windows path to forward slashes and remove any trailing slash
  return path.replace(/\\/g, "/").replace(/\/$/, "");
}

// Function to check if a file already exists in any "Backup_" directory
async function fileExistsInBackup(fileName, backupDir) {
  const files = fs.readdirSync(backupDir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(backupDir, file.name);

    if (file.isDirectory() && file.name.startsWith("Backup_")) {
      // Recursively check in subdirectories that start with "Backup_"
      const exists = await fileExistsInBackup(fileName, filePath);
      if (exists) return true;
    } else if (file.name === fileName) {
      return true; // File exists
    }
  }

  return false; // File does not exist
}

// Function to pull files recursively
async function pullFilesRecursively(sendSSE, directory, outputDir) {
  let skipped = [];
  let totalFiles = 0;
  let completedFiles = 0;

  try {
    sendSSE({
      status: "log",
      message: `📁 Creating directory: ${outputDir}`,
    });

    const absoluteOutputDir = path.resolve(outputDir);
    fs.mkdirSync(absoluteOutputDir, { recursive: true });

    const escapedDirectory = escapeBackslashes(directory);
    const normalizedOutputDir = normalizeOutputPath(absoluteOutputDir);

    sendSSE({
      status: "log",
      message: `🔍 Scanning files in: ${directory}`,
    });

    const items = execSync(`adb shell ls -1 "${escapedDirectory}"`)
      .toString()
      .trim()
      .split("\n");

    // Count total files (excluding directories)
    const fileCount = items.filter((item) => !item.trim().endsWith("/")).length;

    sendSSE({
      status: "progress",
      total: fileCount,
      completed: 0,
      percentage: 0,
    });

    for (const item of items) {
      const itemName = item.trim();
      const isDirectory = itemName.endsWith("/");

      if (!isDirectory) {
        try {
          const exists = await fileExistsInBackup(itemName, outputDir);
          if (exists) {
            skipped.push(itemName);
            completedFiles++;
            sendSSE({
              status: "progress",
              total: fileCount,
              completed: completedFiles,
              percentage: Math.round((completedFiles / fileCount) * 100),
            });
            continue;
          }
          totalFiles++;

          // Use spawn instead of execSync to get real-time output
          const child = spawn("adb", [
            "pull",
            `${escapedDirectory}/${itemName}`,
            normalizedOutputDir,
          ]);

          child.stdout.on("data", (data) => {
            sendSSE({
              status: "log",
              message: `✅ ${data.toString().trim()}`,
            });
          });

          child.stderr.on("data", (data) => {
            sendSSE({
              status: "log",
              message: `✅ ${data.toString().trim()}`,
            });
          });

          // Wait for the process to complete
          await new Promise((resolve, reject) => {
            child.on("close", (code) => {
              if (code === 0) resolve();
              else reject(new Error(`Process exited with code ${code}`));
            });
          });

          // After successful pull
          completedFiles++;
          sendSSE({
            status: "progress",
            total: fileCount,
            completed: completedFiles,
            percentage: Math.round((completedFiles / fileCount) * 100),
          });
        } catch (error) {
          sendSSE({
            status: "log",
            message: `❌ Error pulling ${itemName}: ${error.message}`,
          });
        }
      }
    }

    return {
      completed: true,
      message: "File pull successful",
      skipped,
      totalFiles,
    };
  } catch (e) {
    sendSSE({
      status: "log",
      message: `❌ Error: ${e.message}`,
    });

    if (e.message.includes("device unauthorized")) {
      return {
        completed: false,
        message:
          "Device is unauthorized. Please check for a confirmation dialog on your device.",
      };
    }
    return {
      completed: false,
      message: e.message,
    };
  }
}

// Modify the backup function to remove adb-kit usage
async function backup(sendSSE, backupOptions, destinationPath) {
  const startTime = new Date();
  let totalStats = {
    files: 0,
    skipped: [],
    results: [],
  };

  let destPathWindows = destinationPath.trim();

  // Ensure the destination path ends with a single backslash
  if (!destPathWindows.endsWith("\\")) {
    destPathWindows += "\\";
  }

  // Create directories if they don't exist
  try {
    if (!fs.existsSync(destPathWindows)) {
      fs.mkdirSync(destPathWindows, { recursive: true });
    }
  } catch (error) {
    console.error(
      `Error creating directory ${destPathWindows}:`,
      error.message
    );
    return {
      completed: false,
      message: `Error creating directory ${destPathWindows}.`,
    };
  }

  try {
    for (const location of backupSrcs.filter(
      (location) => backupOptions[location.key]
    )) {
      const { src, dest } = location;
      // check year folder exists
      const yearFolder = `${destPathWindows}${generateDate()}\\`;
      if (!fs.existsSync(yearFolder)) {
        fs.mkdirSync(yearFolder, { recursive: true });
      }

      const outputDir = `${yearFolder}${dest}\\`;

      fs.mkdirSync(outputDir, { recursive: true });

      const result = await pullFilesRecursively(sendSSE, src, outputDir);
      if (!result.completed) {
        return result;
      }

      totalStats.files += result.totalFiles;
      totalStats.skipped.push(...result.skipped);
      totalStats.results.push({
        location: dest,
        files: result.totalFiles,
        skipped: result.skipped.length,
      });
    }

    const endTime = new Date();
    const timeDifferenceInSeconds = Math.ceil((endTime - startTime) / 1000);
    const timeAgo = generateTimeAgo(timeDifferenceInSeconds);

    const summaryMessage = `✅ Backup Complete|||⏱️ Time taken: ${timeAgo}|||📁 Total files: ${
      totalStats.files
    }|||⏭️ Total skipped: ${
      totalStats.skipped.length
    }|||📂 By Location:${totalStats.results
      .map(
        (r) => `\n   • ${r.location}: ${r.files} files (${r.skipped} skipped)`
      )
      .join("")}`;

    return {
      completed: true,
      message: summaryMessage,
      skipped: totalStats.skipped,
      totalFiles: totalStats.files,
    };
  } catch (error) {
    return {
      completed: false,
      message: error.message,
      skipped: totalStats.skipped,
      totalFiles: totalStats.files,
    };
  }
}

export default async function handler(req, res) {
  // Set headers for SSE with no caching
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering if using nginx

  // Helper function to flush data
  const flush = () => {
    if (typeof res.flush === "function") {
      res.flush();
    }
  };

  // Helper function to send SSE data
  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    flush();
  };

  const options = JSON.parse(req.query.options);

  try {
    // Pass the sendSSE function to backup
    const result = await backup(sendSSE, options, options.destInputValue);

    // Send final result
    sendSSE({ status: "complete", ...result });
  } catch (error) {
    sendSSE({
      status: "error",
      message: error.message,
    });
  } finally {
    res.end();
  }
}
