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
import cache from "memory-cache";
import {
  CheckIcon,
  Loader2,
  XIcon,
  Trash2Icon,
  ArrowBigLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardTitle,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Confetti from "react-confetti-boom";
import { Input } from "@/components/ui/input";
import io from "socket.io-client";
import Header from "./Header";

let socket;

export default function Backup() {
  const [deviceId, setDeviceId] = useState(null);
  const [backupStarted, setBackupStarted] = useState(false);
  const [backupEnded, setBackupEnded] = useState(false);
  const [drives, setDrives] = useState([]);
  const [checkedDrive, setCheckedDrive] = useState(null);
  const [selectPathsAvailable, setSelectPathsAvailable] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [backupOptions, setBackupOptions] = useState({
    Camera: true,
    Download: true,
    Pictures: true,
    destInputValue: "",
  });

  const selectRef = useRef(null); // Create a ref for the select element
  const inputRef = useRef(null);
  const videoRef = useRef(null);

  // Set the playback rate directly when rendering
  if (videoRef.current) {
    videoRef.current.playbackRate = 0.75; // Set the video to 75% speed
  }

  const { toast, dismissAll } = useToast();

  async function socketInitializer() {
    await fetch("/api/deviceStatus");
    socket = io();

    socket.on("device-status", (data) => {
      if (data.status === "connected") {
        setDeviceId(data.deviceId); // Set the connected deviceId
      } else if (data.status === "disconnected") {
        setDeviceId(""); // Clear the deviceId when disconnected
      }
    });
  }

  const handlePathsSelectClick = async (e) => {
    e.preventDefault();
    setLoadingFolders(true);

    const cacheKey = `folders_${backupOptions.destInputValue}`; // Create a unique cache key based on the input value
    const cachedResult = cache.get(cacheKey); // Try to get the result from the cache

    if (cachedResult) {
      setSelectPathsAvailable(cachedResult);
      selectRef.current.focus(); // Focus the select element
      setLoadingFolders(false);
      return;
    }
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
      setLoadingFolders(false);
      return;
    }

    cache.put(cacheKey, directories, 60000);
    setSelectPathsAvailable(directories);
    setLoadingFolders(false);
    selectRef.current.focus(); // Focus the select element
  };

  useEffect(() => {
    // Load localStorage checkbox options and destination path
    const storedOptions = JSON.parse(localStorage.getItem("backupOptions"));
    if (storedOptions) {
      setBackupOptions(storedOptions);
    }

    const fetchDrives = async () => {
      const drives = await getDrives();
      setDrives(drives);
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

  const handleCheckboxChange = (option) => {
    setBackupOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
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

    const { completed, message } = await backup(
      backupOptions,
      backupOptions.destInputValue
    );

    const formattedDate = new Date().toLocaleString("en-US", options);
    const endTime = new Date();
    const duration = endTime - startTime; // Calculate duration in milliseconds

    if (completed) {
      setBackupEnded(true);
      toast({
        title: message,
        description: `Backed up at: ${formattedDate} (Duration: ${formatDuration(
          duration
        )})`,
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

  // Helper function to format duration in a human-readable format
  function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const hoursStr = hours > 0 ? `${hours}h ` : "";
    const minutesStr = minutes > 0 ? `${minutes}m ` : "";
    const secondsStr = seconds % 60 ? `${seconds}s` : "";

    return `${hoursStr}${minutesStr}${secondsStr}`;
  }

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
    dismissAll();
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

  return (
    <div className="h-full w-full flex flex-col bg--background ">
      <Header />
      <div className="flex justify-center items-center mt-24">
        <Card className="w-[420px] dark:border-purple-700 border-[0.5px]">
          <CardHeader>
            <CardTitle>Phone Backup</CardTitle>
          </CardHeader>
          <CardContent>
            <form>
              {!backupStarted ? (
                <div className="grid grid-cols-2 select-none" id="options">
                  {/* Source */}
                  <div className="flex flex-col gap-y-1.5">
                    <CardDescription className="select-none">
                      Source
                    </CardDescription>
                    <div className="flex items-center  dark:hover:bg-[#673ab790] hover:bg-[#673ab799] rounded-r-[1.75rem]">
                      <Checkbox
                        id="Camera"
                        checked={backupOptions.Camera}
                        onCheckedChange={() => handleCheckboxChange("Camera")}
                        className="h-5 w-5 mr-2"
                      />
                      <label
                        htmlFor="Camera"
                        className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        /DCIM/Camera
                      </label>
                    </div>
                    <div className="flex items-center dark:hover:bg-[#673ab790] hover:bg-[#673ab799] rounded-r-[1.75rem]">
                      <Checkbox
                        id="Downloads"
                        checked={backupOptions.Download}
                        onCheckedChange={() => handleCheckboxChange("Download")}
                        className="h-5 w-5 mr-2"
                      />
                      <label
                        htmlFor="Downloads"
                        className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        /Download
                      </label>
                    </div>
                    <div className="flex items-center dark:hover:bg-[#673ab790] hover:bg-[#673ab799] rounded-r-[1.75rem]">
                      <Checkbox
                        id="Pictures"
                        checked={backupOptions.Pictures}
                        onCheckedChange={() => handleCheckboxChange("Pictures")}
                        className="h-5 w-5 mr-2"
                      />
                      <label
                        htmlFor="Pictures"
                        className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        /Pictures
                      </label>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="pb-20">
                    <CardDescription className="select-none">
                      Destination{" "}
                    </CardDescription>
                    <div className="grid grid-cols-3 gap-4 items-center select-none">
                      {drives.length > 0 ? (
                        drives.map((driveLetter) => (
                          <div
                            key={driveLetter}
                            className="flex items-center space-x-2"
                          >
                            <div className="relative flex items-center justify-center">
                              <Checkbox
                                id={driveLetter}
                                checked={checkedDrive === driveLetter}
                                onCheckedChange={() =>
                                  handleDriveCheckboxChange(driveLetter)
                                }
                                className="appearance-none w-6 h-6 border border-gray-300 rounded-sm focus:mb-[0.29rem] mb-[0.29rem]"
                              />
                            </div>
                            <label
                              htmlFor={driveLetter}
                              className="cursor-pointer text-sm"
                            >
                              {driveLetter}
                            </label>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center space-x-2.5 w-full">
                          <Loader2 className="m-[0.316rem] size-5 animate-spin justify-center w-full" />
                        </div>
                      )}
                    </div>

                    <div className="relative flex flex-col items-center space-x-2 select-none">
                      <div className="absolute flex flex-col max-w-[280px] right-0 left-0">
                        <div className="flex w-full justify-center items-center relative">
                          {/* Input Field */}
                          <Input
                            ref={inputRef}
                            autoComplete="true"
                            onChange={handleDestInputChange}
                            type="text"
                            value={backupOptions.destInputValue}
                            className="dark:border-[#895dd4f5] border rounded-b-none border-b-0 pr-8 focus-visible:border-[#20C20E] dark:focus-visible:border-[#20C20E] focus-visible:border-b"
                          />

                          {/* Trashcan Icon inside the Input */}
                          <Button
                            disabled={
                              backupOptions.destInputValue.length === 3
                                ? true
                                : false
                            }
                            variant="ghost"
                            onClick={handleClearInput}
                            className="hover:cursor-pointer absolute right-0 p-2  hover:bg-destructive hover:text-destructive-foreground text-destructive rounded-tr-md rounded-br-none rounded-l-none " //dark:hover:bg-red-800 hover:bg-[#ca2d2d]/90
                          >
                            <Trash2Icon size={"17"} />
                          </Button>
                          {loadingFolders && (
                            <Loader2 className="absolute right-[0.175rem] flex size-7 rounded-full dark:bg-zinc-950 animate-spin justify-center items-center" />
                          )}
                          <Button
                            variant="ghost"
                            disabled={backupOptions.destInputValue.length === 3}
                            onClick={handleNavBackAFolder}
                            className="hover:cursor-pointer absolute -right-8 p-2 mt-[0.1rem] mr-[0.1rem] hover:bg-destructive hover:text-destructive-foreground text-destructive rounded-tr-md" //dark:hover:bg-red-800 hover:bg-[#ca2d2d]/90
                          >
                            <ArrowBigLeft size={"17"} />
                          </Button>
                        </div>

                        <select
                          onClick={handlePathsSelectClick}
                          ref={selectRef}
                          className="bg-background w-[100%] text-sm font-semibold hover:cursor-pointer dark:text-[#838383a1] text-[#535353c5]/70 border dark:border-[#895dd4f5] flex focus-visible:border-[#20C20E] dark:focus-visible:border-[#20C20E] rounded-b-sm"
                          onChange={(e) => {
                            if (backupOptions.destInputValue.endsWith("\\")) {
                              backupOptions.destInputValue =
                                backupOptions.destInputValue + e.target.value;
                            } else {
                              backupOptions.destInputValue =
                                backupOptions.destInputValue +
                                "\\" +
                                e.target.value;
                            }
                          }}
                        >
                          <option value="">
                            {loadingFolders ? "loading" : "Select a folder"}
                          </option>
                          {selectPathsAvailable.map((path) => (
                            <option
                              key={path}
                              value={path}
                              className="text-lg w-full text-primary"
                            >
                              {path}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Skeletons when backup are in progress
                <div className="flex flex-col gap-4 mb-4">
                  <Skeleton className="w-[369px] h-[27px] rounded-full" />
                  <Skeleton className="w-[369px] h-[27px] rounded-full" />
                  <Skeleton className="w-[369px] h-[27px] rounded-full" />
                </div>
              )}

              {/* Backup Card Footer */}
              <div
                className={`${
                  deviceId ? "text-[#20C20E]" : "text-destructive"
                } font-semibold flex items-center border rounded-md`}
              >
                <Button
                  disabled={
                    backupStarted || !deviceId || !backupOptions.destInputValue
                  }
                  onClick={(e) => {
                    const anyOptionSelected = Object.values(backupOptions)
                      .filter((option) => option !== "destInputValue")
                      .some((option) => option === true);

                    if (!anyOptionSelected) {
                      e.preventDefault();
                      toast({
                        title: "Please Select a backup source",
                        description:
                          "You haven't selected any folders to backup. Please enable at least one option.",
                        variant: "destructive",
                        className: "overflow-hidden",
                      });
                      return;
                    }
                    startBackup();
                  }}
                  className="relative rounded-e-none text-md px-7 w-36 select-none"
                >
                  {backupStarted ? "Backing up..." : "Backup"}
                </Button>
                <div className="ml-3 flex justify-center select-none">
                  {deviceId ? (
                    <div className="text-md flex gap-1 items-center">
                      {deviceId} connected <CheckIcon />
                    </div>
                  ) : (
                    <div className="text-md flex gap-1 items-center">
                      No device plugged in <XIcon />
                    </div>
                  )}
                </div>
              </div>
              {backupEnded && (
                <Confetti
                  mode="boom"
                  width="50%"
                  height="50%"
                  particleCount={69}
                  colors={[
                    "#ff577f",
                    "#ff884b",
                    "#ff3967",
                    "#ff884b",
                    "#ffd384",
                    "#fff9b0",
                  ]}
                />
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
