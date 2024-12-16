import generateDate from "@/util/date";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

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

// Helper function to format log messages
function formatLogMessage(data) {
  const logMessage = data.toString().trim();
  return logMessage.replace(/(\d+) bytes/, (match, p1) => {
    const bytes = parseInt(p1, 10);
    let size;
    if (bytes < 1024) {
      size = `${bytes} bytes`;
    } else if (bytes < 1024 * 1024) {
      const kilobytes = (bytes / 1024).toFixed(2);
      size = `${kilobytes} KB`;
    } else {
      const megabytes = (bytes / (1024 * 1024)).toFixed(1);
      size = `${megabytes} MB`;
    }
    return size;
  });
}

// Helper function to log messages
function logMessage(sendSSE, message) {
  sendSSE({
    status: "log",
    message,
  });
}

// Function to pull files recursively
async function pullFilesRecursively(sendSSE, directory, outputDir) {
  let skipped = [];
  let totalFiles = 0;
  let completedFiles = 0;

  try {
    const absoluteOutputDir = path.resolve(outputDir);

    if (!fs.existsSync(absoluteOutputDir)) {
      logMessage(sendSSE, `📁 Creating directory: ${outputDir}`);
      fs.mkdirSync(absoluteOutputDir, { recursive: true });
    }

    const escapedDirectory = escapeBackslashes(directory);
    const normalizedOutputDir = normalizeOutputPath(absoluteOutputDir);

    logMessage(
      sendSSE,
      `🔍 Scanning files in ${directory.replace("/storage/emulated/0", "")}`
    );

    const items = execSync(`adb shell ls -1 "${escapedDirectory}"`)
      .toString()
      .trim()
      .split("\n");

    logMessage(
      sendSSE,
      `🔍 Scanning files in ${directory.replace("/storage/emulated/0", "")}`
    );

    await Promise.all(
      items.map(async (item) => {
        const itemName = item.trim();
        const isDirectory = itemName.endsWith("/");

        if (!isDirectory) {
          try {
            const exists = await fileExistsInBackup(itemName, outputDir);
            if (exists) {
              skipped.push(itemName);
              completedFiles++;
              logMessage(sendSSE, `File already exists: ${itemName}`);
              return; // Skip to the next item
            }
            totalFiles++;

            // Use spawn instead of execSync to get real-time output
            const child = spawn("adb", [
              "pull",
              `${escapedDirectory}/${itemName}`,
              normalizedOutputDir,
            ]);

            child.stdout.on("data", (data) => {
              const updatedLogMessage = formatLogMessage(data);
              logMessage(sendSSE, `✅ ${updatedLogMessage}`);
            });

            child.stderr.on("data", (data) => {
              const updatedLogMessage = formatLogMessage(data);
              logMessage(sendSSE, `❌ ${updatedLogMessage}`);
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
            logMessage(sendSSE, `Pulled file: ${itemName}`);
          } catch (error) {
            logMessage(
              sendSSE,
              `❌ Error pulling ${itemName}: ${error.message}`
            );
          }
        }
      })
    );

    return {
      completed: true,
      message: "File pull successful",
      skipped,
      totalFiles,
    };
  } catch (e) {
    logMessage(sendSSE, `❌ Error: ${e.message}`);

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

// Helper function to create a directory and send log message
async function createDirectory(dirPath, sendSSE) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logMessage(sendSSE, `📁 Creating directory: ${dirPath}`);
  }
}

// Update the backup function
async function backup(sendSSE, backupOptions, destinationPath) {
  const startTime = new Date();
  let totalStats = {
    files: 0,
    skipped: [],
    results: [],
  };

  let destPathWindows = destinationPath.trim();
  await createDirectory(destPathWindows, sendSSE); // Create destination directory

  try {
    for (const location of backupSrcs.filter(
      (location) => backupOptions[location.key]
    )) {
      const { src, dest } = location;

      const yearFolder = `${destPathWindows}${generateDate()}\\`;
      await createDirectory(yearFolder, sendSSE); // Create year folder

      const outputDir = `${yearFolder}${dest}\\`;
      await createDirectory(outputDir, sendSSE); // Create output directory

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

    const summaryMessage = `✅ Backup Complete|||⏱️ Time: ${timeAgo}|||📁 Files: ${
      totalStats.files
    }|||⏭️ Skipped: ${
      totalStats.skipped.length
    }|||📂 By Location:${totalStats.results
      .map((r) => `\n• ${r.location}: ${r.files} files (${r.skipped} skipped)`)
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
      message: `Error: ${error.message}`,
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
