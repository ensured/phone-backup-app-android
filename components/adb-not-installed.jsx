"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function AdbNotInstalled() {
  const [isInstalling, setIsInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState(null);

  const handleInstallAdb = async () => {
    setIsInstalling(true);
    setInstallStatus(null);

    try {
      const response = await fetch('/api/installAdb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        setInstallStatus({ success: true, message: result.message });
        // Reload the page after successful installation to check device status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setInstallStatus({ success: false, message: result.message || 'Installation failed' });
      }
    } catch (error) {
      setInstallStatus({ success: false, message: 'Failed to install ADB: ' + error.message });
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <Card className="w-[26.25rem] h-[257px] md:h-auto border-border container">
        <CardContent className="flex flex-col items-center text-center p-6 space-y-4">
          <AlertTriangle className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-orange-500 dark:text-orange-400" />
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold">
            ADB Not Installed
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground">
            Android Debug Bridge (ADB) is required to connect your device.
            Click below to install it automatically.
          </p>

          {!installStatus ? (
            <Button
              onClick={handleInstallAdb}
              disabled={isInstalling}
              className="mt-2 flex items-center gap-2"
              size="lg"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Installing ADB...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Install ADB
                </>
              )}
            </Button>
          ) : (
            <div className={`mt-2 p-3 rounded-md text-sm ${installStatus.success
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
              {installStatus.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
