"use server";
import Adb from "@devicefarmer/adbkit";
import { execSync } from "child_process";
import generateDate from "../util/date";
import fs from "fs";

// Backup source definitions
const backupSrcs = [
  { src: "/storage/emulated/0/DCIM/Camera", dest: "Camera", key: "Camera" },
  { src: "/storage/emulated/0/Download", dest: "Download", key: "Download" },
  { src: "/storage/emulated/0/Pictures", dest: "Pictures", key: "Pictures" },
];

// Function to escape backslashes
function escapeBackslashes(path) {
  return path.replace(/\\/g, "\\\\");
}

// Function to validate Windows path
function isValidPath(path) {
  // Updated regex to validate Windows path
  const regex = /^[a-zA-Z]:\\(?:[^<>:"|?*\\\r\n]+\\)*[^<>:"|?*\\\r\n]*$/;
  return regex.test(path);
}

export async function backup(backupOptions, destinationPath) {
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

  // Validate destination path
  if (!isValidPath(destPathWindows)) {
    return {
      completed: false,
      message: `Invalid backup destination: ${destPathWindows}. Please ensure it is a valid directory.`,
    };
  }

  // Create directories if they don't exist
  try {
    if (!fs.existsSync(destPathWindows)) {
      console.log(`Creating directory: ${destPathWindows}`);
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
    async function pullFilesRecursively(directory, outputDir) {
      try {
        const escapedDirectory = escapeBackslashes(directory);
        const escapedOutputDir = escapeBackslashes(outputDir);
        const output = execSync(
          `adb pull "${escapedDirectory}" "${escapedOutputDir}"`
        );
        const outputString = output.toString();

        if (outputString.includes("device unauthorized")) {
          return {
            completed: false,
            message:
              "Device is unauthorized. Please make sure you have enabled USB debugging on the device and that your device is connected to your computer via USB.",
          };
        }

        return { completed: true }; // File pull successful
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

    const selectedLocations = backupSrcs.filter(
      (location) => backupOptions[location.key]
    );

    for (const location of selectedLocations) {
      const { src, dest } = location;
      const outputDir = `${destPathWindows}${generateDate()}\\`;

      fs.mkdirSync(outputDir, { recursive: true });

      const pullResult = await pullFilesRecursively(src, outputDir);

      // Check for any errors from pulling files
      if (!pullResult.completed) {
        return pullResult; // Exit early if an error occurred
      }
    }

    return {
      completed: true,
      message: "Backup completed successfully",
    };
  } catch (error) {
    return {
      completed: false,
      message: "An error occurred during backup",
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
      "wmic logicaldisk get caption /format:List"
    ).toString();
    const drives = output
      .split("\n")
      .filter((line) => line.includes("Caption"))
      .map((line) => {
        const driveLetters = line.split("=")[1].trim();
        return driveLetters;
      });

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
export async function startAdbServer() {
  try {
    // Start the adb server and suppress the output
    execSync("adb -P 5037 start-server", { stdio: "ignore" });

    // Poll for the adb state, waiting for the server to be ready
    const maxRetries = 4; // Set max retries to avoid infinite loop
    const delay = 1000; // Delay between retries in milliseconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Log each attempt to check the adb state
        console.log(`Checking adb state, attempt: ${attempt}`);

        const output = execSync("adb get-state", { stdio: "pipe" })
          .toString()
          .trim();

        console.log("ADB get-state output:", output); // Log the adb get-state output

        if (output === "device") {
          // If the device state is 'device', it's online and ready
          return { success: true, output };
        } else if (output === "offline") {
          // If the device is offline, keep retrying
          console.log("Device is offline, retrying...");
        } else {
          // Handle other adb states (if needed)
          console.log("Unexpected adb state:", output);
        }
      } catch (error) {
        if (error.message.includes("device offline")) {
          console.log("Device offline, waiting...");
        } else if (attempt === maxRetries) {
          // If max retries reached, return failure
          return {
            success: false,
            error: "ADB server failed to start or device remained offline.",
          };
        } else {
          console.log(`Attempt ${attempt} failed: ${error.message}`);
        }
      }
      // Wait for a while before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
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
