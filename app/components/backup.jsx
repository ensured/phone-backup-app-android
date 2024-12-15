"use client";
import { useEffect, useRef, useState } from "react";
import {
  getDrives,
  getDeviceStatus,
  getFoldersInDirectory,
  deletePath,
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
import { useToast } from "@/hooks/use-toast";
import { Card, CardTitle, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import io from "socket.io-client";
import { DeviceNotConnected } from "@/components/device-not-connected";
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

    const fetchDrives = async () => {
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
    };

    fetchDrives();

    const fetchDeviceStatus = async () => {
      const deviceId = await getDeviceStatus();
      if (deviceId) {
        setDeviceId(deviceId); // Set the connected deviceId
      }
    };
    fetchDeviceStatus();

    if (io) {
      socketInitializer();

      return () => {
        if (socket) {
          socket.disconnect();
        }
      };
    }
  }, []);

  useEffect(() => {
    // Update checkedDrive based on destInputValue
    if (backupOptions.destInputValue) {
      const driveLetter = backupOptions.destInputValue.slice(0, 2); // Assuming drive letter is in format like 'C:'
      setCheckedDrive(driveLetter);
      localStorage.setItem("backupOptions", JSON.stringify(backupOptions));
    }
  }, [backupOptions]); // Listen to destInputValue only

  const handleBackupOptionsChange = (updatedOptions) => {
    setBackupOptions(updatedOptions);
  };

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
                      className={`pb-2 flex items-center gap-2 text-muted-foreground ${
                        subIndex === 0 ? "text-lg border-b" : "text-lg"
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
    selectRef.current.focus(); // Focus the select element
    localStorage.setItem("backupOptions", JSON.stringify(backupOptions));
    setLoadingSelectPaths(false);
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
      className={`flex flex-col items-center justify-center py-6 select-none ${
        isToastVisible ? "blur-effect" : ""
      }`}
    >
      {!deviceId ? (
        <DeviceNotConnected />
      ) : (
        <Card className="w-full max-w-md shadow-lg rounded-lg border border-gray-300">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-center select-none">
              Phone Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              {!backupStarted ? (
                <div className="grid grid-cols-6 gap-x-1.5 gap-y-4">
                  <div className="col-span-2 bg-secondary/30 rounded-md p-1.5">
                    <BackupOption
                      options={backupOptions}
                      onChange={handleBackupOptionsChange}
                    />
                  </div>
                  <div className="col-span-4 bg-secondary/30 rounded-md p-1.5 max-h-[120.56px] overflow-y-auto">
                    <div className="flex items-center justify-between gap-2 text-md text-muted-foreground">
                      Destination
                      <div
                        className="flex items-center justify-center gap-1 hover:cursor-pointer duration-200 hover:text-primary "
                        onClick={(e) => {
                          e.preventDefault();
                          handleRefreshDrives();
                        }}
                      >
                        <span className="text-xs">Refresh</span>
                        <RefreshCcw
                          className={`size-3.5 hover:cursor-pointer hover:text-primary `}
                          variant={"ghost"}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 mt-1.5 gap-1.5">
                      {loadingPaths ? (
                        <div className="flex items-center justify-center w-full col-span-2">
                          <Loader2 className="size-6 animate-spin" />
                        </div>
                      ) : (
                        drives.length > 0 &&
                        drives.map((drive) => (
                          <div
                            key={drive.letter}
                            className="flex items-center space-x-2 bg-secondary/50 rounded-md p-1.5 hover:bg-secondary"
                          >
                            <Checkbox
                              id={drive.letter}
                              checked={checkedDrive === drive.letter}
                              onCheckedChange={() =>
                                handleDriveCheckboxChange(drive.letter)
                              }
                              className="size-5 border border-gray-300 rounded-sm"
                            />
                            <label
                              htmlFor={drive.letter}
                              className="text-md font-medium cursor-pointer flex items-center justify-between"
                            >
                              <span className="font-bold">
                                {drive.letter.replace(":", "")}
                              </span>
                              {drive.name && (
                                <span className="text-muted-foreground ml-1 text-xs">
                                  ({drive.name})
                                </span>
                              )}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="w-full col-span-6 space-y-1">
                    {loadingSelectPaths ? (
                      <Skeleton className="relative w-full h-9 border border-primary">
                        <Loader2 className="absolute w-full h-full animate-spin flex items-center justify-center" />
                      </Skeleton>
                    ) : (
                      <div className="flex flex-row items-center gap-1">
                        <Input
                          ref={inputRef}
                          autoComplete="true"
                          onChange={handleDestInputChange}
                          type="text"
                          disabled={!checkedDrive}
                          value={backupOptions.destInputValue}
                          className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    )}

                    <div className="flex flex-row items-center gap-1">
                      <select
                        disabled={
                          !checkedDrive || !backupOptions.destInputValue
                        }
                        onClick={handlePathsSelectClick}
                        ref={selectRef}
                        className="border w-full border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 text-sm focus:ring-primary hover:cursor-pointer"
                        onChange={(e) => {
                          if (backupOptions.destInputValue.endsWith("\\")) {
                            backupOptions.destInputValue += e.target.value;
                          } else {
                            backupOptions.destInputValue +=
                              "\\" + e.target.value;
                          }
                        }}
                      >
                        <option value="">Select a folder</option>
                        {selectPathsAvailable.map((path) => (
                          <option
                            key={path}
                            value={path}
                            className="text-lg w-full"
                          >
                            {path}
                          </option>
                        ))}
                      </select>

                      <div
                        className={`flex items-center gap-1 ${
                          backupOptions.destInputValue.length === 3 ||
                          backupOptions.destInputValue === ""
                            ? "cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <Dialog open={open} onOpenChange={setOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={
                                backupOptions.destInputValue.length === 3 ||
                                backupOptions.destInputValue === "" ||
                                isRootDrive
                              }
                              className="p-2 text-red-500 rounded-md hover:bg-destructive hover:cursor"
                            >
                              <Trash2Icon className="size-5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogTitle></DialogTitle>
                            <DialogHeader>
                              <DialogDescription>
                                <div className="flex flex-col justify-center items-center gap-6 pb-3">
                                  <Button
                                    variant="destructive"
                                    onClick={(e) => {
                                      handleClearInput();
                                      setOpen(false);
                                    }}
                                  >
                                    Clear input
                                  </Button>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="destructive">
                                        Delete path and all contents
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Confirm Deletion
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this
                                          path and all its contents? This action
                                          cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogCancel
                                        onClick={() => setOpen(false)}
                                      >
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          handleDeletePath();
                                          setOpen(false);
                                        }}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="outline"
                          disabled={
                            backupOptions.destInputValue.length === 3 ||
                            backupOptions.destInputValue === ""
                          }
                          onClick={handleNavBackAFolder}
                          className="p-2 text-gray-500 rounded-md"
                        >
                          <ArrowBigLeft className="size-6" />
                        </Button>
                      </div>
                    </div>
                  </div>
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
              <CardFooterBackupAndStatus
                deviceId={deviceId}
                backupOptions={backupOptions}
                backupStarted={backupStarted}
                startBackup={startBackup}
              />
              {backupEnded && <ConfettiExplosion />}
            </form>
          </CardContent>
        </Card>
      )}

      {/* output streamed content */}
      {output.trim().length > 0 && (
        <div className="mt-2 sm:w-[92%] w-[90%] lg:max-w-[64rem] mx-auto bg-secondary/30 rounded-md relative border border-border">
          {backupStarted && (
            <div className="relative top-0 left-0 w-full px-6 py-2 shadow-md ">
              <div className="w-full flex items-center justify-between text-muted-foreground">
                <div className="flex-grow text-center">
                  <span className="text-lg font-semibold">
                    {progress.completed} / {progress.total} files{" "}
                    <b className="text-primary">{progress.percentage}%</b>
                  </span>
                </div>
                <span className="px-3 py-1 bg-secondary/50 text-xs flex items-center gap-0.5">
                  {currentFolder.replace("/storage/emulated/0", "")}
                  <Loader2 className="size-3 animate-spin" />{" "}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 mt-2">
                <div
                  className="bg-primary/90 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
              {/* Display current folder name */}
            </div>
          )}

          {output.trim().length > 0 && (
            <>
              <div
                ref={outputRef}
                onScroll={handleScroll}
                className={`${
                  backupStarted ? "mt-[9px]" : ""
                } h-[18rem] max-w-[64rem] w-full overflow-auto relative`}
              >
                {output
                  .trim()
                  .split("\n")
                  .map((line, index) => (
                    <div
                      key={index}
                      className={`log-message ${
                        index % 2 === 0 ? "even" : "odd"
                      } relative select-text hover:bg-secondary/50`}
                      onMouseEnter={(e) => {
                        setHoveredLine(line);
                        setMousePosition({
                          x: e.clientX,
                          y: e.clientY - 25, // Position slightly above cursor
                        });
                      }}
                      onMouseMove={(e) => {
                        setMousePosition({
                          x: e.clientX,
                          y: e.clientY - 25,
                        });
                      }}
                      onMouseLeave={() => {
                        setHoveredLine(null);
                      }}
                      onClick={async () => {
                        const success = await copyToClipboard(line);
                        if (success) {
                          toast({
                            variant: "success",
                            title: (
                              <div className="flex items-center gap-2">
                                Copied to clipboard
                                <Check className="h-4 w-4 text-green-500" />
                              </div>
                            ),
                            duration: 2000,
                          });
                        }
                      }}
                    >
                      <span className="flex flex-wrap break-all p-0.5">
                        {line}
                      </span>
                      {hoveredLine === line && (
                        <div
                          className="fixed z-50 bg-popover text-popover-foreground px-2 py-1 text-xs shadow-md pointer-events-none"
                          style={{
                            left: `${mousePosition.x}px`,
                            top: `${mousePosition.y}px`,
                            transform: "translate(-50%, -100%)",
                          }}
                        >
                          Click to copy
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              <div className="sticky bottom-0 w-full flex justify-end gap-1 p-2 bg-background/80 backdrop-blur-sm rounded-md">
                <div className="relative">
                  <Button
                    variant="secondary"
                    size="icon"
                    className={`absolute right-0 transition-opacity duration-200 ${
                      scrollPercentage > 50
                        ? "opacity-100"
                        : "opacity-0 pointer-events-none"
                    }`}
                    onClick={() => {
                      outputRef.current?.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });
                    }}
                  >
                    <ArrowBigUp className="size-8" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className={`absolute right-0 transition-opacity duration-200 ${
                      scrollPercentage <= 50 &&
                      outputRef.current?.scrollHeight >
                        outputRef.current?.clientHeight
                        ? "opacity-100"
                        : "opacity-0 pointer-events-none"
                    }`}
                    onClick={() => {
                      outputRef.current?.scrollTo({
                        top: outputRef.current.scrollHeight,
                        behavior: "smooth",
                      });
                    }}
                  >
                    <ArrowBigDown className="size-8" />
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  className="flex items-center gap-2"
                  onClick={copyAllLogs}
                >
                  <Copy className="size-5" />
                  Copy Logs
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
