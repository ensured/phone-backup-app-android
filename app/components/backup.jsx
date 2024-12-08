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
  FolderIcon,
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

let socket;

const SkippedFilesDialog = ({ skipped }) => {
  const files = skipped.filter((file) => file.includes("."));
  const folders = skipped.filter((file) => !file.includes("."));

  return (
    <Dialog className="select-none pointer-events-none z-100">
      <DialogTrigger asChild>
        <Button variant="outline">
          <div className="flex items-center gap-2 font-bold text-base text-primary/80">
            {skipped.length} skipped
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] pointer-events-none select-none">
        <DialogDescription></DialogDescription>
        <DialogHeader className="overflow-hidden h-[50vh]">
          <DialogTitle>
            <div className="flex flex-col gap-2 text-center w-full font-bold text-primary/80 p-4">
              Skipped
              <div className="flex flex-row gap-2 items-center justify-center">
                <div className="text-primary/80 flex flex-row gap-1 items-centerrounded-md p-1">
                  <FileIcon className="size-4" />
                  {files.length} File{files.length === 1 ? "" : "s"}
                </div>
                <div className="text-primary/80 flex flex-row gap-1 items-center">
                  <FolderIcon className="size-4" />
                  {folders.length} Folder{folders.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>
          </DialogTitle>
          <div className="flex flex-col max-h-[50vh] overflow-y-auto border border-border rounded-md">
            <div className="rounded-md p-2 mr-2 flex flex-col gap-1 bg-secondary/20">
              <div className="text-xl font-bold flex gap-2 items-center justify-center">
                <FileIcon className="size-4" />
                Files
              </div>
              <div className="grid grid-cols-2 gap-2">
                {files.map((file) => (
                  <div
                    key={file}
                    className="p-1 border rounded-md shadow-sm select-none line-clamp-1 overflow-auto"
                  >
                    {file}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md p-2 mr-2 flex flex-col gap-1 bg-secondary/20">
              <div className="text-lg font-bold flex gap-2 items-center justify-center">
                <FolderIcon className="size-4" />
                Folders
              </div>
              <div className="grid grid-cols-2 gap-2">
                {folders.map((folder) => (
                  <div
                    key={folder}
                    className="p-1 border rounded-md shadow-sm select-none line-clamp-1 overflow-auto"
                  >
                    {folder}
                  </div>
                ))}
              </div>
            </div>
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
    localStorage.setItem("backupOptions", JSON.stringify(backupOptions));

    const { completed, message, skipped, totalFiles } = await backup(
      backupOptions,
      backupOptions.destInputValue
    );

    if (completed) {
      setBackupEnded(true);
      const { dismiss } = toast({
        title: (
          <div
            className="grid grid-cols-1 col-span-1"
            onClick={(e) => e.stopPropagation()}
          >
            {message.split("<br />").map((line, index) => (
              <div key={index}>
                {index === 0 ? (
                  <div className="flex flex-row my-1.5 gap-2 text-lg">
                    <span className="text-green-500 font-bold">Success!</span>
                    <span className="text-primary/80">
                      {totalFiles} file
                      {totalFiles - skipped.length === 1 ? "" : "s"} backed up
                      in {line}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-row my-1.5">
                    <SkippedFilesDialog skipped={skipped} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ),
        duration: 86400,
        className: "cursor-pointer",
        onClick: () => dismiss(),
      });

      const handleGlobalClick = () => dismiss();
      document.addEventListener("click", handleGlobalClick);

      setBackupStarted(false);
      return () => document.removeEventListener("click", handleGlobalClick);
    } else {
      setBackupEnded(false);
      toast({
        title: message,
        variant: "destructive",
      });
      setBackupStarted(false);
    }
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
    <div className="flex flex-col items-center justify-center py-6 select-none">
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
                <div className="grid grid-cols-6 gap-x-1.5 gap-y-4">
                  <div className="col-span-2">
                    <Skeleton className="w-full h-[120.56px] rounded-md" />
                  </div>
                  <div className="col-span-4">
                    <Skeleton className="w-full h-[120.56px] rounded-md" />
                  </div>
                  <div className="col-span-6 space-y-1">
                    <Skeleton className="w-full h-9" />
                    <Skeleton className="w-full h-9" />
                  </div>
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
              {backupEnded && <ConfettiExplosion />}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
