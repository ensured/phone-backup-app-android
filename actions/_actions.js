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

  console.log(`Directory verified/created: ${destPathWindows}`);

  try {
    async function pullFilesRecursively(directory, outputDir) {
      try {
        // Ensure paths are quoted to handle spaces
        const escapedDirectory = escapeBackslashes(directory);
        const escapedOutputDir = escapeBackslashes(outputDir);
        console.log(
          `Pulling files from "${escapedDirectory}" to "${escapedOutputDir}"`
        );
        execSync(`adb pull "${escapedDirectory}" "${escapedOutputDir}"`);
      } catch (err) {
        console.error("Error pulling files:", err.message);
        return;
      }
    }

    const selectedLocations = backupSrcs.filter(
      (location) => backupOptions[location.key]
    );

    for (const location of selectedLocations) {
      const { src, dest } = location;
      const outputDir = `${destPathWindows}${generateDate()}\\`;

      fs.mkdirSync(outputDir, { recursive: true });

      await pullFilesRecursively(src, outputDir);
      console.log(`Backup of ${dest} completed\n`);
    }
    return {
      completed: true,
      message: "Backup completed successfully",
    };
  } catch (error) {
    console.error("An error occurred during backup:", error.message);
    return {
      completed: false,
      message: "An error occurred during backup",
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
    // Start the adb server
    execSync("adb -P 5037 start-server");

    // Check if adb is running
    try {
      const output = execSync("adb get-state").toString().trim();
      const isRunning = output === "device";

      return { isRunning };
    } catch (error) {
      return { isRunning: false };
    }
  } catch (error) {
    console.error("Failed to start or check adb server:", error);
    return { isRunning: false };
  }
}
