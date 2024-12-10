import generateDate from "@/util/date";
import Adb from "@devicefarmer/adbkit";
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

// Function to pull files recursively
async function pullFilesRecursively(sendSSE, directory, outputDir) {
  let skipped = [];
  let totalFiles = 0;
  try {
    sendSSE({ 
      status: "log", 
      message: `Creating directory: ${outputDir}`
    });

    const absoluteOutputDir = path.resolve(outputDir);
    fs.mkdirSync(absoluteOutputDir, { recursive: true });

    const escapedDirectory = escapeBackslashes(directory);
    const normalizedOutputDir = normalizeOutputPath(absoluteOutputDir);

    // Send log to frontend
    sendSSE({ 
      status: "log", 
      message: `Scanning files in: ${directory}`
    });

    const items = execSync(`adb shell ls -1 "${escapedDirectory}"`)
      .toString()
      .trim()
      .split("\n");

    for (const item of items) {
      const itemName = item.trim();
      const isDirectory = itemName.endsWith("/");

      if (!isDirectory) {
        try {
          const exists = await fileExistsInBackup(itemName, outputDir);
          if (exists) {
            skipped.push(itemName);
            sendSSE({ 
              status: "log", 
              message: `Skipped existing file: ${itemName}`
            });
            continue;
          }
          totalFiles++;

          const command = `adb pull "${escapedDirectory}/${itemName}" "${normalizedOutputDir}"`;
          // Use spawn instead of execSync to get real-time output
          const child = spawn('adb', [
            'pull',
            `${escapedDirectory}/${itemName}`,
            normalizedOutputDir
          ]);

          child.stdout.on('data', (data) => {
            sendSSE({ 
              status: "log", 
              message: data.toString().trim()
            });
          });

          child.stderr.on('data', (data) => {
            sendSSE({ 
              status: "log", 
              message: `${data.toString().trim()}`
            });
          });

          // Wait for the process to complete
          await new Promise((resolve, reject) => {
            child.on('close', (code) => {
              if (code === 0) resolve();
              else reject(new Error(`Process exited with code ${code}`));
            });
          });
          
        } catch (error) {
          sendSSE({ 
            status: "log", 
            message: `Error pulling file ${itemName}: ${error.message}`
          });
        }
      }
    }

    // Send summary log to frontend
    sendSSE({
      status: "log",
      message: `Directory complete: ${directory}\nTotal files: ${totalFiles}\nSkipped: ${skipped.length}`,
    });

    return {
      completed: true,
      message: "File pull successful",
      skipped,
      totalFiles,
    };
  } catch (e) {
    // Send error log to frontend
    sendSSE({
      status: "log",
      message: `Error: ${e.message}`,
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
  const startTime = new Date(); // Capture the start time
  let totalFiles = 0;
  const skipped = [];
  const client = Adb.createClient();
  const devices = await client.listDevices();
  if (devices.length === 0) {
    return { completed: false, message: "No device connected" };
  }

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
      totalFiles += result.totalFiles;
      if (result.skipped) {
        skipped.push(...result.skipped);
      }
      // Check for any errors from pulling files
      if (!result.completed) {
        return {
          completed: result.completed,
          message: result.message,
          skipped,
          totalFiles,
        }; // Exit early if an error occurred
      }
    }

    const endTime = new Date(); // Capture the end time

    // Calculate the time difference in milliseconds
    const timeDifference = endTime - startTime;

    // Convert milliseconds to seconds
    const timeDifferenceInSeconds = Math.ceil(timeDifference / 1000);
    const timeAgo = generateTimeAgo(timeDifferenceInSeconds);

    return {
      completed: true,
      message: `${timeAgo}<br /> Skipped ${skipped.length} files`,
      skipped,
      totalFiles,
    };
  } catch (error) {
    return {
      completed: false,
      message: error.message,
      skipped,
      totalFiles,
    };
  }
}

async function getFoldersInDirectory(directory) {
  try {
    const blacklistedFolders = new Set([
      "system volume information",
      "$recycle.bin",
      "$sysreset",
      "perflogs",
      "recovery",
    ]);

    const isBlacklisted = (folder) =>
      blacklistedFolders.has(folder.toLowerCase());

    // Extract the folder name from the directory path
    const folderName = directory.split("\\").pop();
    if (isBlacklisted(folderName)) {
      return {
        status: "error",
        message: `Directory ${directory} is blacklisted`,
      };
    }

    const directories = fs
      .readdirSync(directory, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory() && !isBlacklisted(dirent.name))
      .map((dirent) => dirent.name);

    return { status: "success", directories };
  } catch (error) {
    return {
      status: "error",
      message: `Error getting folders in directory: ${directory}`,
    };
  }
}

export default async function handler(req, res) {
  // Set headers for SSE with no caching
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if using nginx
  
  // Helper function to flush data
  const flush = () => {
    if (typeof res.flush === 'function') {
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
