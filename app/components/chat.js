"use client";
import { useEffect, useRef, useState } from "react";
import {
  backup,
  getDrives,
  getDeviceStatus,
  getFoldersInDirectory,
} from "../../actions/_actions";
import { Button } from "../../components/ui/button";
import {
  CheckIcon,
  Sun,
  Moon,
  DatabaseBackup,
  Loader2,
  XIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ADLaM_Display } from "next/font/google";
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
import { cn } from "@/lib/utils";
import io from "socket.io-client";
import { useTheme } from "next-themes";

const adlam = ADLaM_Display({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
});

let socket;

export default function CardComponent() {
  const [deviceId, setDeviceId] = useState(null);
  const [backupStarted, setBackupStarted] = useState(false);
  const [backupEnded, setBackupEnded] = useState(false);
  const [drives, setDrives] = useState([]);
  const [checkedDrive, setCheckedDrive] = useState(null);
  const [selectPathsAvailable, setSelectPathsAvailable] = useState([]);
  const [backupOptions, setBackupOptions] = useState({
    Camera: true,
    Download: true,
    Pictures: true,
    destInputValue: "",
  });

  const { theme, setTheme } = useTheme();

  const { toast } = useToast();

  async function socketInitializer() {
    await fetch("/api/chat");
    socket = io();

    socket.on("device-status", (data) => {
      if (data.status === "connected") {
        setDeviceId(data.deviceId); // Set the connected deviceId
      } else if (data.status === "disconnected") {
        setDeviceId(""); // Clear the deviceId when disconnected
      }
    });
  }

  const selectOptionsRef = useRef(null);
  const handlePathsSelectClick = async (e) => {
    e.preventDefault();
    const directories = await getFoldersInDirectory(
      backupOptions.destInputValue
    );
    setSelectPathsAvailable(directories);
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
  }, [backupOptions]);

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

    const { completed, message } = await backup(
      backupOptions,
      backupOptions.destInputValue
    );
    const options = {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };
    const formattedDate = new Date().toLocaleString("en-US", options);

    if (completed) {
      setBackupEnded(true);
      toast({
        title: message,
        description: "Backed up at: " + formattedDate,
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
    // Extract the current path part after the drive letter
    const currentPath = backupOptions.destInputValue.slice(2);
    // Update the path with the new drive letter
    setBackupOptions((prev) => ({
      ...prev,
      destInputValue: driveLetter + currentPath,
    }));
    setCheckedDrive(driveLetter);
  };

  return (
    <div className="h-screen flex flex-col bg--background">
      <header
        className={`flex items-center justify-between p-4 text-foreground bg--background ${
          theme === "dark" ? "rainbow-shadow" : "shadow-md"
        }`}
      >
        <h1
          className={cn(
            adlam.className,
            "text-2xl flex flex-row items-center select-none text--primary"
          )}
        >
          <DatabaseBackup className="mr-3 size-6" /> Backup Buddy
        </h1>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-[1.2rem] w-[1.2rem]" />
          ) : (
            <Moon className="h-[1.2rem] w-[1.2rem]" />
          )}
        </Button>
      </header>
      <div className="flex justify-center items-center h-[calc(100vh-228px)]">
        {" "}
        {/* Subtract header height */}
        <Card className="w-[372px]  border-purple-700 border-[0.5px] scale-110">
          <CardHeader>
            <CardTitle>Phone Backup</CardTitle>
          </CardHeader>
          <CardContent>
            <form>
              <div className="grid w-full gap-4">
                <div className="flex flex-col ">
                  <div
                    className="pb-6 grid grid-cols-2 select-none"
                    id="options"
                  >
                    <div className="mr-4">
                      <CardDescription className="select-none">
                        Source
                      </CardDescription>
                      <div className="flex items-center space-x-2 mb-0.5 dark:hover:bg-[#673ab790] hover:bg-[#673ab799] rounded-r-[1.75rem]">
                        <Checkbox
                          id="Camera"
                          checked={backupOptions.Camera}
                          onCheckedChange={() => handleCheckboxChange("Camera")}
                          className="h-5 w-5"
                        />
                        <label
                          htmlFor="Camera"
                          className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          /DCIM/Camera
                        </label>
                      </div>
                      <div className="flex items-center space-x-2 mb-0.5 dark:hover:bg-[#673ab790] hover:bg-[#673ab799] rounded-r-[1.75rem]">
                        <Checkbox
                          id="Downloads"
                          checked={backupOptions.Download}
                          onCheckedChange={() =>
                            handleCheckboxChange("Download")
                          }
                          className="h-5 w-5"
                        />
                        <label
                          htmlFor="Downloads"
                          className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          /Download
                        </label>
                      </div>
                      <div className="flex items-center space-x-2 mb-0.5 dark:hover:bg-[#673ab790] hover:bg-[#673ab799] rounded-r-[1.75rem]">
                        <Checkbox
                          id="Pictures"
                          checked={backupOptions.Pictures}
                          onCheckedChange={() =>
                            handleCheckboxChange("Pictures")
                          }
                          className="h-5 w-5 "
                        />
                        <label
                          htmlFor="Pictures"
                          className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          /Pictures
                        </label>
                      </div>
                    </div>

                    <div>
                      <CardDescription className="select-none">
                        Destination
                      </CardDescription>
                      <div className="flex items-center space-x-2 select-none">
                        {drives.length > 0 ? (
                          drives.map((driveLetter) => (
                            <div
                              key={driveLetter}
                              className="flex items-center space-x-2"
                            >
                              <div className="relative flex items-center justify-center ">
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
                                className="cursor-pointer text-sm "
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
                        <div className="absolute flex flex-col mb-4">
                          <Input
                            autoComplete="true"
                            onChange={handleDestInputChange}
                            type="text"
                            value={backupOptions.destInputValue}
                            className=" "
                          />
                          <div>
                            <select
                              onClick={handlePathsSelectClick}
                              onChange={(e) => {
                                if (
                                  backupOptions.destInputValue.endsWith("\\")
                                ) {
                                  backupOptions.destInputValue =
                                    backupOptions.destInputValue +
                                    e.target.value;
                                } else {
                                  backupOptions.destInputValue =
                                    backupOptions.destInputValue +
                                    "\\" +
                                    e.target.value;
                                }
                              }}
                            >
                              <option ref={selectOptionsRef} value="">
                                Select a folder
                              </option>
                              {selectPathsAvailable.map((path) => (
                                <option key={path} value={path}>
                                  {path}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`${
                      deviceId ? "text-green-500 " : "text-red-500"
                    } font-semibold flex items-center border rounded-md`}
                  >
                    <Button
                      disabled={
                        backupStarted ||
                        !deviceId ||
                        !backupOptions.destInputValue
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
                          });
                          return;
                        }
                        startBackup();
                      }}
                      className="relative rounded-e-none text-md px-7 select-none"
                    >
                      {backupStarted ? (
                        <div className="flex justify-center items-center ">
                          <Loader2 className="h-[1.09rem] w-[1.09rem] animate-spin absolute right-2 " />
                          Backup
                        </div>
                      ) : (
                        "Backup"
                      )}
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
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
