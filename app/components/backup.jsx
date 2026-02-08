"use client";
import { useEffect, useRef, useState } from "react";
import {
  getDrives,
  getDeviceStatus,
  getFoldersInDirectory,
  deletePath,
  estimateBackupSize,
  getDeviceStorage,
} from "../../actions/_actions";
import { Button } from "../../components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Trash2Icon,
  ArrowBigLeft,
  RefreshCcw,
  ArrowBigUp,
  ArrowBigDown,
  Check,
  Copy,
} from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useToast } from "@/hooks/use-toast";
import { Card, CardTitle, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import io from "socket.io-client";
import { DeviceNotConnected } from "@/components/device-not-connected";
import { AdbNotInstalled } from "@/components/adb-not-installed";
import BackupOption from "./backupOption";
import ConfettiExplosion from "./Confetti";
import CardFooterBackupAndStatus from "./CardFooterBackupAndStatus";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "../../components/ui/alert-dialog";
import StorageInfo from "./backup/StorageInfo";
import BackupOptionsPanel from "./backup/BackupOptionsPanel";
import DestinationPanel from "./backup/DestinationPanel";
import OutputLog from "./backup/OutputLog";

let socket;

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    return false;
  }
};

export default function Backup({ success, deviceID }) {
  const [deviceId, setDeviceId] = useState(success ? deviceID : null);
  const [backupStarted, setBackupStarted] = useState(false);
  const [lastDestInputValue, setLastDestInputValue] = useState("");
  const [loadingSelectPaths, setLoadingSelectPaths] = useState(false);
  const [backupEnded, setBackupEnded] = useState(false);
  const [drives, setDrives] = useState([]);
  const [checkedDrive, setCheckedDrive] = useState(null);
  const [selectPathsAvailable, setSelectPathsAvailable] = useState([]);
  const [loadingPaths, setLoadingPaths] = useState(true);
  const [backupOptions, setBackupOptions] = useState({
    Camera: true,
    Download: true,
    Pictures: true,
    destInputValue: "",
  });
  const [sizeEstimate, setSizeEstimate] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [deviceStorage, setDeviceStorage] = useState(null);
  const [isToastVisible, setIsToastVisible] = useState(false);

  const [output, setOutput] = useState("");
  const outputRef = useRef(null);

  const selectRef = useRef(null); // Create a ref for the select element
  const inputRef = useRef(null);

  const { toast } = useToast();

  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    percentage: 0,
    skipped: [],
  });

  const [currentFolder, setCurrentFolder] = useState(""); // New state for current folder
  const [scrollPercentage, setScrollPercentage] = useState(0);

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredLine, setHoveredLine] = useState(null);

  const [open, setOpen] = useState(false);

  const isRootDrive = /^[A-Z]:\\$/i.test(backupOptions.destInputValue);

  const [initialLoad, setInitialLoad] = useState(true);
  const [deviceStatusChecked, setDeviceStatusChecked] = useState(false); // New state to track device status check
  const [adbError, setAdbError] = useState(null); // New state to track ADB installation error

  const handleDeletePath = async () => {
    const result = await deletePath(backupOptions.destInputValue);
    if (result.success) {
      toast({
        title: `${backupOptions.destInputValue} deleted.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Failed to delete path",
        variant: "destructive",
      });
    }
  };

  const handleRefreshDrives = async () => {
    setLoadingPaths(true);
    const drives = await getDrives();
    setDrives(drives);
    setLoadingPaths(false);
  };

  const handleRefreshFolders = async () => {
    const { status, directories } = await getFoldersInDirectory(
      backupOptions.destInputValue
    );
    if (status === "success") {
      setSelectPathsAvailable(directories);
    }
  };

  async function socketInitializer() {
    await fetch("/api/deviceStatus");
    socket = io();

    socket.on("device-status", (data) => {
      if (data.status === "connected") {
        setDeviceId(data.deviceId); // Set the connected deviceId
      }
      if (data.status === "disconnected") {
        setDeviceId(""); // Clear the deviceId when disconnected
      }
    });
  }

  useEffect(() => {
    // Load localStorage checkbox options and destination path
    const storedOptions = JSON.parse(localStorage.getItem("backupOptions"));
    if (storedOptions) {
      setBackupOptions(storedOptions);
    }

    const initializeApp = async () => {
      // First check device status, then fetch drives based on the result
      const deviceStatus = await getDeviceStatus();
      if (typeof deviceStatus === 'object' && deviceStatus?.error === 'ADB_NOT_FOUND') {
        setAdbError(deviceStatus);
        // If ADB is not installed, set empty drives and finish loading
        setDrives([]);
        setLoadingPaths(false);
        setInitialLoad(false);
      } else if (deviceStatus) {
        setDeviceId(deviceStatus); // Set the connected deviceId
        setAdbError(null); // Clear ADB error if device is now connected
        // Only fetch drives if ADB is available
        const drives = await getDrives();
        setDrives(drives);

        // Only set default drive if no destination is set in backupOptions
        if (!storedOptions?.destInputValue) {
          const defaultDrive = "C:" + "\\"; // Default drive path
          setCheckedDrive("C"); // Set the first available drive as default

          const newBackupOptions = {
            ...backupOptions,
            destInputValue: defaultDrive, // Set default drive here
          };

          setBackupOptions((prev) => ({
            ...prev,
            ...newBackupOptions,
          }));

          // Save to localStorage to persist the default drive
          localStorage.setItem("backupOptions", JSON.stringify(newBackupOptions));
        } else {
          // Use the saved destination drive if available
          const driveLetter = storedOptions.destInputValue.slice(0, 2); // Assuming drive letter is 'C:'
          setCheckedDrive(driveLetter); // Set the checked drive based on saved destination
        }
        setLoadingPaths(false);
        setInitialLoad(false); // Set initialLoad to false after fetching drives
      }
      setDeviceStatusChecked(true); // Mark device status as checked
    };

    initializeApp();

    // Re-check device status every 5 seconds if ADB error was present
    const intervalId = setInterval(() => {
      if (adbError) {
        const checkDeviceStatus = async () => {
          const deviceStatus = await getDeviceStatus();
          if (typeof deviceStatus === 'object' && deviceStatus?.error === 'ADB_NOT_FOUND') {
            setAdbError(deviceStatus);
          } else if (deviceStatus) {
            setDeviceId(deviceStatus); // Set the connected deviceId
            setAdbError(null); // Clear ADB error if device is now connected
          }
        };
        checkDeviceStatus();
      }
    }, 5000);

    if (io) {
      socketInitializer();

      return () => {
        clearInterval(intervalId);
        if (socket) {
          socket.disconnect();
        }
      };
    }

    return () => clearInterval(intervalId);
  }, []); // Remove adbError dependency to prevent infinite loop

  useEffect(() => {
    // Update checkedDrive based on destInputValue
    if (backupOptions.destInputValue) {
      const driveLetter = backupOptions.destInputValue.slice(0, 2); // Assuming drive letter is in format like 'C:'
      setCheckedDrive(driveLetter);
      localStorage.setItem("backupOptions", JSON.stringify(backupOptions));
    }
  }, [backupOptions]); // Listen to destInputValue only

  // Separate effect to handle ADB error changes and fetch drives when ADB becomes available
  useEffect(() => {
    if (adbError === null && deviceStatusChecked) {
      // ADB was just installed or became available, fetch drives
      const fetchDrivesAfterAdbInstall = async () => {
        const drives = await getDrives();
        setDrives(drives);
        setLoadingPaths(false);
      };
      fetchDrivesAfterAdbInstall();
    }
  }, [adbError, deviceStatusChecked]);

  const handleBackupOptionsChange = (updatedOptions) => {
    setBackupOptions(updatedOptions);
  };

  // Function to update size estimate
  const updateSizeEstimate = async () => {
    if (!deviceId) return;

    setIsEstimating(true);
    try {
      const result = await estimateBackupSize(backupOptions);
      if (result.success) {
        setSizeEstimate(result);
      }
    } catch (error) {
      console.error("Error estimating size:", error);
    } finally {
      setIsEstimating(false);
    }
  };

  // Update size estimate when backup options change
  useEffect(() => {
    if (deviceId && !backupStarted) {
      const timeoutId = setTimeout(() => {
        updateSizeEstimate();
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [backupOptions.Camera, backupOptions.Download, backupOptions.Pictures, deviceId]);

  // Initial size estimate when device connects
  useEffect(() => {
    if (deviceId && !backupStarted && !sizeEstimate) {
      updateSizeEstimate();
    }
  }, [deviceId]);

  // Function to fetch device storage
  const fetchDeviceStorage = async () => {
    if (!deviceId) return;

    try {
      const result = await getDeviceStorage();
      if (result.success) {
        setDeviceStorage(result);
      }
    } catch (error) {
      console.error("Error fetching device storage:", error);
    }
  };

  // Fetch device storage when device connects
  useEffect(() => {
    if (deviceId) {
      fetchDeviceStorage();
    }
  }, [deviceId]);

  const startBackup = async () => {
    setBackupStarted(true);
    setOutput("");
    setProgress({ total: 0, completed: 0, percentage: 0, skipped: [] });

    const eventSource = new EventSource(
      `/api/backupStream?options=${encodeURIComponent(
        JSON.stringify(backupOptions)
      )}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.status === "log") {
        setOutput((prev) => prev + data.message + "\n");
      } else if (data.status === "progress") {
        setProgress({
          total: data.total,
          completed: data.completed,
          percentage: data.percentage,
        });
        setCurrentFolder(data.currentFolder); // Update current folder state
      } else if (data.status === "complete") {
        setBackupEnded(true);
        const messages = data.message.split("•");
        setProgress((prev) => ({
          ...prev,
          skipped: data.skipped || [],
        }));
        showToast(
          <div className="grid grid-cols-1 gap-1 place-items-center ">
            {messages.map((message, index) => {
              if (message.includes("|||")) {
                // Split and format the completion summary
                return message.split("|||").map((msg, subIndex) => {
                  // For time taken and total files, create a side-by-side layout
                  if (subIndex === 1 || subIndex === 2) {
                    return subIndex % 2 === 1 ? (
                      <div
                        key={`${index}-${subIndex}`}
                        className="grid grid-cols-2 gap-4 py-1 text-muted-foreground"
                      >
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span className="text-lg">{msg.slice(0, 2)}</span>
                          <span className="text-lg">{msg.slice(2)}</span>
                        </div>
                        {/* Render the next item inline */}
                        <div className="flex items-center gap-2 text-lg text-muted-foreground">
                          <span>
                            {messages[index]
                              .split("|||")
                            [subIndex + 1].slice(0, 2)}
                          </span>
                          <span>
                            {messages[index]
                              .split("|||")
                            [subIndex + 1].slice(2)}
                          </span>
                        </div>
                      </div>
                    ) : null;
                  }

                  // Main completion message and skipped count
                  return subIndex === 0 || subIndex === 3 ? (
                    <div
                      key={`${index}-${subIndex}`}
                      className={`pb-2 flex items-center gap-2 text-muted-foreground ${subIndex === 0 ? "text-lg border-b" : "text-lg"
                        }`}
                    >
                      <span className="text-lg">{msg.slice(0, 2)}</span>
                      <span className="text-lg">{msg.slice(2)}</span>
                    </div>
                  ) : null;
                });
              }

              // Handle location summaries (lines starting with •)
              if (message.startsWith("•")) {
                const locationInfo = message.slice(2).split(":");
                return (
                  <div key={index} className="flex items-center gap-2 ">
                    <div className="flex items-center gap-2">
                      <span>•</span>
                      <span className="font-medium text-lg">
                        {locationInfo[0]}
                      </span>
                      <span className="text-muted-foreground text-lg">
                        {locationInfo[1]}
                      </span>
                    </div>
                  </div>
                );
              }

              // Default message format
              return (
                <div
                  key={index}
                  className="font-medium text-lg text-muted-foreground"
                >
                  {index === 1 ? (
                    <span className="border-t pt-2 ">{message}</span>
                  ) : (
                    <span>{message}</span>
                  )}
                </div>
              );
            })}
          </div>
        );
        handleRefreshFolders();
        eventSource.close();
        setBackupStarted(false);
      } else if (data.status === "error") {
        toast({
          title: data.message,
          variant: "destructive",
        });
        eventSource.close();
        setBackupStarted(false);
        toast({
          title: "Backup failed",
          variant: "destructive",
        });
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource error:", error);
      eventSource.close();
      setBackupStarted(false);
      toast({
        title: "Backup failed",
        variant: "destructive",
      });
    };
  };

  const handleDestInputChange = (event) => {
    setBackupOptions((prev) => ({
      ...prev,
      destInputValue: event.target.value,
    }));
  };

  const handleDriveCheckboxChange = (driveLetter) => {
    const currentPath = backupOptions.destInputValue.slice(2);
    if (currentPath.endsWith("\\")) {
      setBackupOptions((prev) => ({
        ...prev,
        destInputValue: driveLetter + currentPath,
      }));
      setCheckedDrive(driveLetter);
      inputRef.current.focus();
      return;
    }
    setBackupOptions((prev) => ({
      ...prev,
      destInputValue: driveLetter + currentPath + "\\",
    }));
    inputRef.current.focus();
    setCheckedDrive(driveLetter);
  };

  const handleClearInput = (e) => {
    setBackupOptions((prev) => ({
      ...prev,
      destInputValue: backupOptions.destInputValue.slice(0, 3),
    }));

    inputRef.current.focus();
  };

  const handleNavBackAFolder = (e) => {
    e.preventDefault();

    // Get the current path
    let currentPath = backupOptions.destInputValue;

    // Remove trailing backslash if it exists
    if (currentPath.endsWith("\\")) {
      currentPath = currentPath.slice(0, -1);
    }

    // Check if current path is just the drive letter (e.g., "C:")
    if (currentPath.length <= 2) {
      // Drive letter plus backslash
      return; // Don't navigate back if we're at the root level
    }

    // Split the path into parts and remove the last folder
    const pathParts = currentPath.split("\\");

    // Remove the last part (folder)
    pathParts.pop();

    // Join the remaining parts back together
    const newPath = pathParts.join("\\");

    // Update the state with the new path and add a backslash at the end
    setBackupOptions((prev) => ({
      ...prev,
      destInputValue: newPath + (newPath ? "\\" : ""), // Add backslash if there's any part left
    }));
  };

  const handlePathsSelectClick = async (e) => {
    e.preventDefault();

    if (backupOptions.destInputValue === lastDestInputValue) {
      return;
    }
    setLastDestInputValue(backupOptions.destInputValue);
    setLoadingSelectPaths(true);

    const { status, directories } = await getFoldersInDirectory(
      backupOptions.destInputValue
    );

    if (status === "error") {
      toast({
        status: "error",
        description: (
          <div className="flex flex-col">
            <div>
              <span className="text-red-600 font-bold text-lg">
                Folder Not Found!
              </span>
              <Button
                className="ml-2"
                onClick={handleClearInput}
                variant={"destructive"}
                size={"lg"}
              >
                Clear input
              </Button>
            </div>
          </div>
        ),
      });
      setLoadingSelectPaths(false);
      return;
    }

    setSelectPathsAvailable(directories);
    selectRef.current?.focus();
    localStorage.setItem("backupOptions", JSON.stringify(backupOptions));
    setLoadingSelectPaths(false);
  };

  const handleSelectChange = (e) => {
    if (backupOptions.destInputValue.endsWith("\\")) {
      backupOptions.destInputValue += e.target.value;
    } else {
      backupOptions.destInputValue += "\\" + e.target.value;
    }
  };

  const showToast = (content) => {
    if (!isToastVisible) {
      setIsToastVisible(true);
      toast({
        title: content,
        onClose: () => {
          setIsToastVisible(false);
        },
        className: "w-full grid grid-cols-1 col-span-1",
        duration: 69000,
        onClick: () => {
          setIsToastVisible(false);
        },
      });
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Check if the click is outside the toast
      const toastElements = document.querySelectorAll('[role="status"]');
      let clickedInsideToast = false;

      toastElements.forEach((toast) => {
        if (toast.contains(event.target)) {
          clickedInsideToast = true;
        }
      });

      if (!clickedInsideToast && isToastVisible) {
        setIsToastVisible(false);
        // Find and dismiss all toasts
        const closeButtons = document.querySelectorAll("[toast-close]");
        closeButtons.forEach((button) => button.click());
      }
    };

    if (isToastVisible) {
      document.addEventListener("click", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [isToastVisible]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const copyAllLogs = async () => {
    // Store current scroll position
    const currentScrollPosition = outputRef.current?.scrollTop;

    const allLogs = document.querySelectorAll(".log-message");
    const allLogsText = Array.from(allLogs)
      .map((log) => log.innerText)
      .join("\n");

    await copyToClipboard(allLogsText);

    // Restore scroll position
    if (outputRef.current) {
      outputRef.current.scrollTop = currentScrollPosition;
    }

    toast({
      title: `Copied ${allLogs.length} lines to clipboard`,
      variant: "success",
    });
  };

  const handleScroll = (e) => {
    const element = e.currentTarget;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    // Calculate scroll percentage (0 to 100)
    const percentage = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setScrollPercentage(percentage);
  };

  return (
    <div
      className={`flex flex-col items-center justify-center py-6 select-none ${isToastVisible ? "blur-effect" : ""
        }`}
    >
      {adbError ? (
        <AdbNotInstalled />
      ) : !deviceId && !initialLoad && deviceStatusChecked ? (
        <DeviceNotConnected />
      ) : (
        <Card className="w-full max-w-md shadow-lg rounded-lg border border-gray-300">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-center select-none">
              Phone Backup
            </CardTitle>
            {deviceId && <StorageInfo deviceStorage={deviceStorage} />}
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              {!backupStarted ? (
                <div className="grid grid-cols-6 gap-x-1.5 gap-y-4">
                  <BackupOptionsPanel
                    deviceId={deviceId}
                    backupOptions={backupOptions}
                    onOptionsChange={handleBackupOptionsChange}
                    sizeEstimate={sizeEstimate}
                    isEstimating={isEstimating}
                  />
                  <DestinationPanel
                    loadingPaths={loadingPaths}
                    drives={drives}
                    checkedDrive={checkedDrive}
                    onDriveChange={handleDriveCheckboxChange}
                    onRefreshDrives={handleRefreshDrives}
                    loadingSelectPaths={loadingSelectPaths}
                    backupOptions={backupOptions}
                    onDestInputChange={handleDestInputChange}
                    onPathsSelectClick={handlePathsSelectClick}
                    selectPathsAvailable={selectPathsAvailable}
                    onSelectChange={handleSelectChange}
                    isRootDrive={isRootDrive}
                    onClearInput={handleClearInput}
                    onNavBack={handleNavBackAFolder}
                    onDeletePath={handleDeletePath}
                    open={open}
                    setOpen={setOpen}
                    inputRef={inputRef}
                    selectRef={selectRef}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-6 gap-x-1.5 gap-y-4">
                    <Skeleton className="col-span-2 h-[120.56px] rounded-md" />
                    <Skeleton className="col-span-4 h-[120.56px] rounded-md" />
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <Skeleton className="w-full h-9 rounded-md" />
                    <Skeleton className="w-full h-9 rounded-md" />
                  </div>
                </div>
              )}

              {/* Backup Card Footer */}
              {deviceId ? (
                <CardFooterBackupAndStatus
                  deviceId={deviceId}
                  backupOptions={backupOptions}
                  backupStarted={backupStarted}
                  startBackup={startBackup}
                />
              ) : (
                <Skeleton className="w-full h-9 rounded-md" />
              )}
              {backupEnded && <ConfettiExplosion />}
            </form>
          </CardContent>
        </Card>
      )}

      {output.trim().length > 0 && backupStarted && (
        <OutputLog
          output={output}
          progress={progress}
          currentFolder={currentFolder}
          backupStarted={backupStarted}
          scrollPercentage={scrollPercentage}
          onScroll={handleScroll}
          hoveredLine={hoveredLine}
          setHoveredLine={setHoveredLine}
          mousePosition={mousePosition}
          setMousePosition={setMousePosition}
          onCopyLine={async (line) => {
            const success = await copyToClipboard(line);
            if (success) {
              toast({
                variant: "success",
                title: <div className="flex items-center gap-2">Copied to clipboard</div>,
                duration: 2000,
              });
            }
          }}
          onCopyAllLogs={copyAllLogs}
          outputRef={outputRef}
        />
      )}
    </div>
  );
}
