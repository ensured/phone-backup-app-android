import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Helper function to download file using curl with streaming (best practice)
async function downloadFileCurl(url, filePath) {
  try {
    console.log(`Downloading ${url} to ${filePath}`);

    // Use curl with streaming to avoid loading large files into memory
    const curlCommand = `curl -L --progress-bar -o "${filePath}" "${url}"`;
    execSync(curlCommand, { stdio: 'inherit' }); // Use inherit to show progress

    // Verify the file was downloaded
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`Download completed: ${stats.size} bytes`);
      return;
    } else {
      throw new Error('File not found after download');
    }
  } catch (error) {
    console.error('Curl download failed:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adbDir = 'C:\\adb';
    const appDir = process.cwd(); // Get current app directory
    const zipPath = path.join(appDir, 'public', 'platform-tools.zip');

    // Create C:\adb directory if it doesn't exist
    if (!fs.existsSync(adbDir)) {
      fs.mkdirSync(adbDir, { recursive: true });
      console.log('Created C:\\adb directory');
    }

    // Create public directory if it doesn't exist
    const publicDir = path.join(appDir, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
      console.log('Created public directory');
    }

    // Download platform-tools using curl to public folder
    console.log('Downloading Android SDK Platform Tools...');
    console.log('Installing to:', adbDir);
    console.log('ZIP path:', zipPath);

    try {
      await downloadFileCurl('https://dl.google.com/android/repository/platform-tools-latest-windows.zip', zipPath);
      console.log('Download completed successfully');
    } catch (downloadError) {
      console.error('Download failed:', downloadError);
      throw new Error('Failed to download platform-tools: ' + downloadError.message);
    }

    // Check if ZIP file was downloaded successfully
    if (!fs.existsSync(zipPath)) {
      throw new Error('Failed to download platform-tools ZIP file');
    }

    const zipStats = fs.statSync(zipPath);
    console.log(`ZIP file downloaded successfully. Size: ${zipStats.size} bytes`);

    // Extract the ZIP file using Windows tar command
    console.log('Extracting platform-tools to C:\\adb...');
    console.log('ZIP file exists:', fs.existsSync(zipPath));

    // Check ZIP file size before extraction
    console.log(`ZIP file size: ${zipStats.size} bytes`);

    try {
      // Use Windows built-in tar command to extract
      execSync(`tar -xf "${zipPath}" -C "${adbDir}"`, { stdio: 'pipe' });
      console.log('Tar extraction completed');

      // Handle the platform-tools subdirectory
      const platformToolsSubDir = path.join(adbDir, 'platform-tools');
      if (fs.existsSync(platformToolsSubDir)) {
        console.log('Moving files from platform-tools subdirectory...');

        // Move all files from platform-tools subdirectory to C:\adb
        const files = fs.readdirSync(platformToolsSubDir);
        for (const file of files) {
          const srcPath = path.join(platformToolsSubDir, file);
          const destPath = path.join(adbDir, file);
          fs.renameSync(srcPath, destPath);
        }

        // Remove the empty platform-tools directory
        fs.rmdirSync(platformToolsSubDir);
        console.log('File reorganization completed');
      }

      // Debug: Check what was created after extraction
      console.log('C:\\adb directory contents:', fs.readdirSync(adbDir));
    } catch (extractError) {
      console.error('Extraction failed:', extractError);
      throw new Error('Failed to extract platform-tools ZIP file');
    }

    // Clean up the ZIP file if it exists
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    // Add C:\adb to PATH using PowerShell (for current session and future sessions)
    console.log('Adding C:\\adb to PATH...');
    const pathCommand = `
      $currentPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
      $newPath = $currentPath + ';${adbDir}'
      [Environment]::SetEnvironmentVariable('PATH', $newPath, 'User')
      $env:PATH = $newPath
    `;

    execSync(`powershell -Command "${pathCommand}"`, { stdio: 'pipe' });

    // Test if ADB is working
    const adbPath = path.join(adbDir, 'adb.exe');

    console.log('Checking for ADB at:', adbPath);
    console.log('C:\\adb directory exists:', fs.existsSync(adbDir));

    if (fs.existsSync(adbDir)) {
      console.log('C:\\adb directory contents:', fs.readdirSync(adbDir));
    }

    if (fs.existsSync(adbPath)) {
      console.log('ADB installed successfully!');

      // Update current process PATH with C:\adb
      process.env.PATH += `;${adbDir}`;

      res.status(200).json({
        success: true,
        message: 'ADB installed successfully!',
        path: adbDir
      });
    } else {
      // Debug: list what's actually in the C:\adb directory
      console.log('Looking for ADB in:', adbPath);
      if (fs.existsSync(adbDir)) {
        console.log('C:\\adb directory contents:', fs.readdirSync(adbDir));
      } else {
        console.log('C:\\adb directory does not exist!');
      }
      throw new Error('ADB executable not found after installation');
    }

  } catch (error) {
    console.error('Error installing ADB:', error);
    res.status(500).json({
      error: 'Failed to install ADB',
      message: error.message
    });
  }
}
