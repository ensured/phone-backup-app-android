
![7x7B1Of](https://github.com/user-attachments/assets/ef65fa64-2152-4002-8a8e-208867fb469a)
## ADB Platform-Tools Setup Instructions

Make sure you download the [ADB platform-tools zip](https://dl.google.com/android/repository/platform-tools-latest-windows.zip) and follow these steps:

1. **Unzip the downloaded file** to any directory of your choice.
2. **Add the directory path** to your environment variables:
   - Search for "Environment Variables" in the Windows search bar.
   - Click on "Edit the system environment variables."
   - In the System Properties window, click on the "Environment Variables" button.
   - Under "System variables," find the `Path` variable, select it, and click "Edit."
   - Click "New" and paste the path to the unzipped platform-tools directory.

   ![rundll32_HQkqvOwubs](https://github.com/user-attachments/assets/8d33987b-8c51-469a-8cbd-32b1799c2f0f)


* **Note**: This setup has been tested on Windows with Android devices only.
* Socket.IO is used in Next.js 13-14 for real-time device changes.
* The library `@devicefarmer/adbkit` is utilized for ADB actions.
