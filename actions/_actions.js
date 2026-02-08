"use server";
import Adb from "@devicefarmer/adbkit";
import { execSync, spawn } from "child_process";
import fs from "fs";

// Replace execSync with spawn for adb commands
function executeAdbCommand(command, args) {
  return new Promise((resolve, reject) => {
    const adbProcess = spawn(command, args, { stdio: "pipe" });

    let output = "";
    adbProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    adbProcess.stderr.on("data", (data) => {
      reject(data.toString());
    });

    adbProcess.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(`Process exited with code: ${code}`);
      }
    });
  });
}

export async function deletePath(path) {
  // Add another backslash for Windows paths
  const formattedPath = path.replace(/\\/g, "\\\\");
  console.log("Formatted path:", formattedPath);

  try {
    // Recursively delete the directory and its contents
    fs.rmSync(formattedPath, { recursive: true, force: true });
    return { success: true };
  } catch (error) {
    console.error("Error deleting path:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteSources(backupOptions) {
  const message = [];
  const emptyStatus = {};

  if (backupOptions.Camera) {
    try {
      const directories = await executeAdbCommand("adb", [
        "shell",
        "ls",
        "/storage/emulated/0/",
      ]).then((output) => output.trim().split("\n"));
      const trimmedDirectories = directories.map((dir) => dir.trim());
      const folders = trimmedDirectories.filter((dir) => dir === "DCIM");

      if (folders.length === 0) {
        emptyStatus.Camera = "The Camera directory does not exist.";
      } else {
        await executeAdbCommand("adb", [
          "shell",
          "rm",
          "-rf",
          "/storage/emulated/0/DCIM/Camera/*",
        ]);
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
      const directories = await executeAdbCommand("adb", [
        "shell",
        "ls",
        "/storage/emulated/0/",
      ]).then((output) => output.trim().split("\n"));
      const trimmedDirectories = directories.map((dir) => dir.trim());
      const folders = trimmedDirectories.filter((dir) => dir === "Download");

      if (folders.length === 0) {
        // create the folder if it doesn't exist
        await executeAdbCommand("adb", [
          "shell",
          "mkdir",
          "/storage/emulated/0/Download",
        ]);
        emptyStatus.Download = "The Download directory was created.";
      } else {
        emptyStatus.Download = "The Download directory was not empty.";
      }

      await executeAdbCommand("adb", [
        "shell",
        "rm",
        "-rf",
        "/storage/emulated/0/Download/*",
      ]);
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
      const output = await executeAdbCommand("adb", [
        "shell",
        "find",
        "/storage/emulated/0/Pictures",
        "-type",
        "f",
      ]).then((output) => output.trim());
      const isEmpty = !output.includes("No such file or directory");

      if (isEmpty) {
        emptyStatus.Pictures = "The Pictures directory is already empty.";
      } else {
        emptyStatus.Pictures = "The Pictures directory was not empty.";
      }

      await executeAdbCommand("adb", [
        "shell",
        "rm",
        "-rf",
        "/storage/emulated/0/Pictures/*",
      ]);
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
  const drives = [];
  // Check drive letters A-Z
  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i);
    const drivePath = `${letter}:\\`;

    try {
      // Check if drive exists by trying to access it
      fs.accessSync(drivePath, fs.constants.F_OK);

      // Try to get volume label using simple approach
      let name = 'Local Disk';
      try {
        // Get the first file/directory to check if drive is accessible
        const files = fs.readdirSync(drivePath);
        name = files.length > 0 ? 'Local Disk' : 'Empty Drive';
      } catch {
        // Drive exists but might be empty or inaccessible
      }

      drives.push({ letter: letter + ':', name });
    } catch {
      // Drive doesn't exist, skip
    }
  }
  return drives;
}

export async function getDeviceStatus() {
  const client = Adb.createClient();
  try {
    const devices = await client.listDevices();
    return devices[0]?.id;
  } catch (err) {
    // Check if the error is due to ADB not being installed
    if (err.code === 'ENOENT' && err.message.includes('spawn adb')) {
      return { error: 'ADB_NOT_FOUND', message: 'ADB is not installed on this system' };
    }
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
