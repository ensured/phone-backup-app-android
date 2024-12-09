"use server";
import Adb from "@devicefarmer/adbkit";
import { execSync } from "child_process";
import generateDate from "../util/date";
import fs from "fs";
import path from "path";

// Backup source definitions
const backupSrcs = [
  { src: "/storage/emulated/0/DCIM/Camera", dest: "Camera", key: "Camera" },
  { src: "/storage/emulated/0/Download", dest: "Download", key: "Download" },
  { src: "/storage/emulated/0/Pictures", dest: "Pictures", key: "Pictures" },
];

// const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm"];
// const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"];
// const audioExts = [".mp3", ".wav", ".aac", ".flac", ".m4a", ".ogg", ".wma"];
// const documentExts = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];
// const otherExts = [".txt", ".csv", ".json", ".xml", ".html", ".css", ".js"];

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
async function pullFilesRecursively(directory, outputDir) {
  let skipped = [];
  let totalFiles = 0;
  try {
    // Create directory with absolute path
    const absoluteOutputDir = path.resolve(outputDir);
    fs.mkdirSync(absoluteOutputDir, { recursive: true });

    const escapedDirectory = escapeBackslashes(directory);
    const normalizedOutputDir = normalizeOutputPath(absoluteOutputDir);

    // Get the list of files and directories in the source directory
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
            continue;
          }
          totalFiles++;
          // Use double quotes around paths and ensure proper path format
          const command = `adb pull "${escapedDirectory}/${itemName}" "${normalizedOutputDir}"`;
          execSync(command);
        } catch (error) {
          console.error(`Error pulling file ${itemName}:`, error.message);
        }
      }
    }

    // Log the summary of skipped and total files
    console.log(`Total files processed: ${totalFiles}`);
    console.log(`Total files skipped: ${skipped.length}`);

    return {
      completed: true,
      message: "File pull successful",
      skipped,
      totalFiles,
    }; // File pull successful
  } catch (e) {
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

export async function deleteSources(backupOptions) {
  const message = [];
  const emptyStatus = {};

  if (backupOptions.Camera) {
    try {
      const directories = execSync(`adb shell ls /storage/emulated/0/`)
        .toString()
        .trim()
        .split("\n");
      const trimmedDirectories = directories.map((dir) => dir.trim());
      const folders = trimmedDirectories.filter((dir) => dir === "DCIM");

      if (folders.length === 0) {
        emptyStatus.Camera = "The Camera directory does not exist.";
      } else {
        execSync(`adb shell rm -rf /storage/emulated/0/DCIM/Camera/*`);
        message.push("Deleted everything inside Camera directory. ");
      }
    } catch (error) {
      console.error("Failed to delete Camera directory:", error.message);
      return {
        completed: false,
        message: "Failed to delete Camera directory. It may not be empty.",
        emptyStatus,
      };
    }
  }

  if (backupOptions.Download) {
    try {
      // Check if the Download directory exists
      const directories = execSync(`adb shell ls /storage/emulated/0/`)
        .toString()
        .trim()
        .split("\n");
      const trimmedDirectories = directories.map((dir) => dir.trim());
      const folders = trimmedDirectories.filter((dir) => dir === "Download");

      if (folders.length === 0) {
        // create the folder if it doesn't exist
        execSync(`adb shell mkdir /storage/emulated/0/Download`);
        emptyStatus.Download = "The Download directory was created.";
      } else {
        emptyStatus.Download = "The Download directory was not empty.";
      }

      execSync(`adb shell rm -rf /storage/emulated/0/Download/*`);
      message.push("Deleted everything inside Download directory.");
    } catch (error) {
      console.error("Failed to delete Download directory:", error.message);
      return {
        completed: false,
        message: "Failed to delete Download directory. It may not be empty.",
        emptyStatus,
      };
    }
  }

  if (backupOptions.Pictures) {
    try {
      // Check if the Pictures directory is empty (including all subdirectories)
      const output = execSync(
        `adb shell find /storage/emulated/0/Pictures -type f`
      )
        .toString()
        .trim();
      const isEmpty = !output.includes("No such file or directory");

      if (isEmpty) {
        emptyStatus.Pictures = "The Pictures directory is already empty.";
      } else {
        emptyStatus.Pictures = "The Pictures directory was not empty.";
      }

      execSync(`adb shell rm -rf /storage/emulated/0/Pictures/*`);
      message.push("Deleted everything inside Pictures directory.");
    } catch (error) {
      console.error("Failed to delete Pictures directory:", error.message);
      return {
        completed: false,
        message: "Failed to delete Pictures directory. It may not be empty.",
        emptyStatus,
      };
    }
  }

  return {
    completed: true,
    message,
    isEmpty: emptyStatus,
  };
}

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

export async function backup(backupOptions, destinationPath) {
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

      const result = await pullFilesRecursively(src, outputDir);
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

export async function getFoldersInDirectory(directory) {
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

export async function getDrives() {
  try {
    const output = execSync(
      "wmic logicaldisk get caption, volumename /format:List"
    ).toString();
    const drives = output
      .split("\n")
      .filter((line) => line.includes("Caption") || line.includes("VolumeName"))
      .reduce(
        (acc, line) => {
          const [key, value] = line.split("=");
          if (key.trim() === "Caption") {
            acc.currentDrive = { letter: value.trim() }; // Store current drive letter
          } else if (key.trim() === "VolumeName" && acc.currentDrive) {
            acc.currentDrive.name = value.trim(); // Store corresponding drive name
            acc.drives.push(acc.currentDrive); // Add to drives array
            acc.currentDrive = null; // Reset for next drive
          }
          return acc;
        },
        { drives: [], currentDrive: null }
      ).drives;

    return drives;
  } catch (error) {
    console.error("Error getting drives:", error);
    return [];
  }
}

export async function getDeviceStatus() {
  const client = Adb.createClient();
  try {
    const devices = await client.listDevices();
    return devices[0]?.id;
  } catch (err) {
    return null;
  }
}

async function getDevice() {
  const client = Adb.createClient();
  const devices = await client.listDevices();
  return devices[0]?.id;
}

export async function startAdbServer() {
  try {
    // Start the adb server and suppress the output
    execSync("adb -P 5037 start-server", { stdio: "ignore" });

    // Removed retry logic
    try {
      // Log attempt to check the adb state

      const output = execSync("adb get-state", { stdio: "pipe" })
        .toString()
        .trim();

      if (output === "device") {
        // If the device state is 'device', it's online and ready
        const deviceID = await getDevice();
        return { success: true, output, deviceID };
      } else {
        // Handle other adb states (if needed)
        console.log("Device is offline or unexpected state:", output);
        return {
          success: false,
          error:
            "ADB server started but device is offline or in an unexpected state.",
        };
      }
    } catch (error) {
      console.log(`Error checking adb state: ${error.message}`);
      return {
        success: false,
        error: "Failed to check ADB state.",
      };
    }
  } catch (error) {
    // Handle errors from starting the adb server
    console.log("Error starting ADB server:", error.message);
    return {
      success: false,
      error: `Failed to start ADB server: ${error.message}`,
    };
  }
}
