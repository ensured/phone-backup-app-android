"use client";
import { useEffect, useState } from "react";
import { backup, getDrives } from "../../actions/_actions";
import { Button } from "@/components/ui/button";
import { CheckIcon, DatabaseBackup, Loader2, XIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Licorice } from "next/font/google";
import { ModeToggle } from "./theme-toggle";
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
import io from "socket.io-client";

const licorice = Licorice({
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
  const [backupOptions, setBackupOptions] = useState({
    Camera: true,
    Download: true,
    Pictures: true,
    destInputValue: "",
  });

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

  useEffect(() => {
    // Load localStorage checkbox options and destination path
    const storedOptions = JSON.parse(localStorage.getItem("backupOptions"));
    if (storedOptions) {
      setBackupOptions(storedOptions);
    }

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
    <div className="flex flex-col justify-center items-center h-[69vh] bg--background">
      {" "}
      <ModeToggle />
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
