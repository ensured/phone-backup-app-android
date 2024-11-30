"use client";
import { useEffect, useRef, useState } from "react";
import {
  backup,
  getDrives,
  getDeviceStatus,
  getFoldersInDirectory,
} from "../../actions/_actions";
import { Button } from "../../components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Trash2Icon,
  ArrowBigLeft,
  RefreshCcw,
  FileIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardTitle, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import io from "socket.io-client";
import { DeviceNotConnected } from "@/components/device-not-connected";
import BackupOption from "./backupOption";
import Confetti from "./Confetti";
import CardFooterBackupAndStatus from "./CardFooterBackupAndStatus";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";

let socket;

const SkippedFilesDialog = ({ skipped }) => {
  return (
    <Dialog className="select-none pointer-events-none z-100">
      <DialogTrigger asChild>
        <Button variant="outline">
          <div className="flex items-center gap-1">
            <FileIcon className="size-4" />
            View skipped file{skipped.length === 1 ? "" : "s"}
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] pointer-events-none select-none">
        <DialogHeader>
          <DialogTitle>
            <div>
              <div>
                {skipped.length} Skipped File
                {skipped.length === 1 ? "" : "s"}
              </div>
              <div>
                {skipped.length > 100 && (
                  <span className="text-xs text-muted-foreground">
                    Consider deleting some files to avoid skipping every time
                    you backup.
                  </span>
                )}
              </div>
            </div>
          </DialogTitle>
          <div className="flex flex-col gap-2 max-h-[52vh] overflow-y-auto ">
            {skipped &&
              skipped.map((file) => (
                <div
                  key={file}
                  className="p-2 border rounded-md shadow-sm select-none"
                >
                  {file}
                </div>
              ))}
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
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

  const selectRef = useRef(null); // Create a ref for the select element
  const inputRef = useRef(null);

  const { toast } = useToast();

  const handleRefreshDrives = async () => {
    setLoadingPaths(true);
    const drives = await getDrives();
    console.log(drives);
    setDrives(drives);
    setLoadingPaths(false);
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

    // Save updated backup options to localStorage
    localStorage.setItem("backupOptions", JSON.stringify(backupOptions));

    // Get datetime
    const options = {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };

    const startTime = new Date();

    const { completed, message, skipped } = await backup(
      backupOptions,
      backupOptions.destInputValue
    );

    const formattedDate = new Date().toLocaleString("en-US", options);

    if (completed) {
      setBackupEnded(true);
      toast({
        title: (
          <div className="grid grid-cols-1 gap-1">
            {message.split("<br />").map((line, index) => (
              <div key={index} className="text-sm text-muted-foreground">
                - {line}
              </div>
            ))}
            <SkippedFilesDialog skipped={skipped} />
          </div>
        ),
        duration: 86400,
        variant: "success",
      });
    } else {
      setBackupEnded(false);
      toast({
        title: message,
        description: formattedDate,
        variant: "destructive",
      });
    }
    setBackupStarted(false);
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
    e.preventDefault();

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

  return (
    <div className="flex flex-col items-center justify-center p-6 select-none">
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
                      <Input
                        ref={inputRef}
                        autoComplete="true"
                        onChange={handleDestInputChange}
                        type="text"
                        disabled={!checkedDrive}
                        value={backupOptions.destInputValue}
                        className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    )}

                    <div className="flex flex-row items-center gap-1">
                      <select
                        disabled={
                          !checkedDrive || !backupOptions.destInputValue
                        }
                        onClick={handlePathsSelectClick}
                        ref={selectRef}
                        className="border w-full border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary hover:cursor-pointer"
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
                        <Button
                          disabled={
                            backupOptions.destInputValue.length === 3 ||
                            backupOptions.destInputValue === ""
                          }
                          variant="outline"
                          onClick={handleClearInput}
                          className="p-2 text-red-500 rounded-md hover:bg-destructive hover:cursor"
                        >
                          <Trash2Icon
                            className={`size-5 hover:cursor-pointer duration-200 ${
                              backupOptions.destInputValue.length === 3 ||
                              backupOptions.destInputValue === ""
                                ? "text-gray-500 cursor-not-allowed"
                                : "text-red-500"
                            }`}
                          />
                        </Button>

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
                // Skeletons when backup are in progress
                <div className="flex flex-col gap-4 mb-4">
                  <Skeleton className="w-full h-8 rounded-md" />
                  <Skeleton className="w-full h-8 rounded-md" />
                  <Skeleton className="w-full h-8 rounded-md" />
                </div>
              )}

              {/* Backup Card Footer */}
              <div className="mt-4">
                <CardFooterBackupAndStatus
                  deviceId={deviceId}
                  backupOptions={backupOptions}
                  backupStarted={backupStarted}
                  startBackup={startBackup}
                />
              </div>
              {backupEnded && <Confetti />}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
