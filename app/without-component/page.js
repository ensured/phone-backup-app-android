"use client";
import { useEffect, useState } from "react";
import { getDrives } from "../../actions/_actions";
import { Button } from "@/components/ui/button";
import { CheckIcon, DatabaseBackup, Loader2, XIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Licorice } from "next/font/google";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Confetti from "react-confetti-boom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const licorice = Licorice({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
});

// Import io conditionally to avoid importing it on the server
let io;
if (typeof window !== "undefined") {
  io = require("socket.io-client");
}

let socket;

export default function CardComponent() {
  const [deviceId, setDeviceId] = useState(null);
  const [backupStarted, setBackupStarted] = useState(false);
  const [backupEnded, setBackupEnded] = useState(false);
  const [drives, setDrives] = useState([]);
  const [checkedDrive, setCheckedDrive] = useState(null);
  const [backupOptions, setBackupOptions] = useState({
    Camera: true,
    Download: true,
    Pictures: true,
    destInputValue: "",
  });

  const { toast } = useToast();

  async function socketInitializer() {
    if (typeof window !== "undefined") {
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
  }

  useEffect(() => {
    const fetchDrives = async () => {
      const drives = await getDrives();
      console.log(drives);
      setDrives(drives);
    };
    fetchDrives();

    if (io) {
      socketInitializer();

      return () => {
        if (socket) {
          socket.disconnect();
        }
      };
    }

    // Load localStorage checkbox options and destination path
    const storedOptions = JSON.parse(localStorage.getItem("backupOptions"));
    if (storedOptions) {
      setBackupOptions(storedOptions);
    }
  }, []);

  useEffect(() => {
    // Update checkedDrive based on destInputValue
    if (backupOptions.destInputValue) {
      const driveLetter = backupOptions.destInputValue.slice(0, 2); // Assuming drive letter is in format like 'C:'
      setCheckedDrive(driveLetter);
    }
  }, [backupOptions.destInputValue]);

  const handleCheckboxChange = (option) => {
    setBackupOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
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
    <div className="flex flex-col justify-center items-center h-[69vh] bg--background">
      <div
        className={cn(
          licorice.className,
          "text-7xl p-6 flex flex-row items-center select-none text-sky-300"
        )}
      >
        Backup Buddy <DatabaseBackup className="pl-4 size-9" />
      </div>
      <Card className="w-[372px]">
        <CardHeader>{/* <CardTitle>Phone Backup</CardTitle> */}</CardHeader>
        <CardContent>
          <form>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col ">
                <div className="pb-6 grid grid-cols-2 " id="options">
                  <div className="mr-4">
                    <CardDescription>Backup Source</CardDescription>
                    <div className="flex items-center space-x-2 mb-0.5 hover:bg-sky-300 rounded-r-[1.75rem]">
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
                    <div className="flex items-center space-x-2 mb-0.5 hover:bg-sky-300 rounded-r-[1.75rem]">
                      <Checkbox
                        id="Downloads"
                        checked={backupOptions.Download}
                        onCheckedChange={() => handleCheckboxChange("Download")}
                        className="h-5 w-5"
                      />
                      <label
                        htmlFor="Downloads"
                        className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        /Download
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 mb-0.5 hover:bg-sky-300 rounded-r-[1.75rem]">
                      <Checkbox
                        id="Pictures"
                        checked={backupOptions.Pictures}
                        onCheckedChange={() => handleCheckboxChange("Pictures")}
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
                    <CardDescription>Backup Destination</CardDescription>
                    <div className="flex items-center space-x-2">
                      {drives.length > 0 ? (
                        drives.map((driveLetter) => (
                          <div
                            key={driveLetter}
                            className="flex items-center space-x-2.5"
                          >
                            <div className="relative">
                              <Checkbox
                                id={driveLetter}
                                checked={checkedDrive === driveLetter}
                                onCheckedChange={() =>
                                  handleDriveCheckboxChange(driveLetter)
                                }
                                className="appearance-none w-6 h-6 border border-gray-300 rounded-sm checked:bg-sky-400 focus:ring-2 focus:ring-sky-400"
                              />
                            </div>
                            <label
                              htmlFor={driveLetter}
                              className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
                    <div className="flex items-center space-x-2">
                      <Input
                        autoComplete="true"
                        onChange={handleDestInputChange}
                        type="text"
                        value={backupOptions.destInputValue}
                      />
                    </div>
                  </div>
                </div>

                <div
                  className={`${
                    deviceId ? "text-green-500 " : "text-red-500"
                  } font-medium  flex items-center bg-zinc-900 rounded-md`}
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
                    className="relative rounded-e-none text-md px-7"
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
                  <div className="px-4 border-l flex gap-1 items-center justify-center h-[36px]">
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
  );
}
