"use client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const Page = () => {
  const [device, setDevice] = useState(null);
  const [status, setStatus] = useState("Disconnected");

  const connectDevice = async () => {
    try {
      const selectedDevice = await navigator.usb.requestDevice({ filters: [] });
      await selectedDevice.open().then((e) => {
        console.log("Device opened");
        console.log(e);
      });
      // await selectedDevice.selectConfiguration(1);
      // await selectedDevice.claimInterface(2);
      setDevice(selectedDevice);
      setStatus("Connected");
      console.log("Device connected:", selectedDevice);
    } catch (error) {
      console.error("Error connecting to device:", error);
      setStatus("Disconnected");
    }
  };

  const requestFileTransferPermission = async () => {
    if (device) {
      // Ensure the device is opened before accessing its configuration
      if (device.opened) {
        console.log("Device object:", device);
        console.log("Device configuration:", device.configuration);
        console.log("Device interfaces:", device.configuration?.interfaces);

        const interfaceIndex = 0; // Change this if necessary based on your device
        try {
          // Check if the interface is available
          const interfaces = device.configuration?.interfaces;
          if (interfaces && interfaces.length > interfaceIndex) {
            const currentInterface = interfaces[interfaceIndex];
            console.log("Current interface:", currentInterface);

            if (!currentInterface.claimed) {
              console.log(`Claiming interface ${interfaceIndex}...`);
              await device.claimInterface(interfaceIndex);
              console.log(`Interface ${interfaceIndex} claimed successfully.`);
            } else {
              console.error(`Interface ${interfaceIndex} is already claimed.`);
            }

            // Now that the interface is claimed, select the alternate interface if available
            const alternateInterface = currentInterface.alternate;
            if (alternateInterface) {
              console.log(
                `Selecting alternate interface for index ${interfaceIndex}:`,
                alternateInterface
              );
              await device.selectAlternateInterface(
                interfaceIndex,
                alternateInterface.alternateSetting
              );
              console.log(
                `Alternate interface for index ${interfaceIndex} selected successfully.`
              );
            } else {
              console.error(
                `No alternate interface available for index ${interfaceIndex}.`
              );
            }
          } else {
            console.error(
              `Interface index ${interfaceIndex} is out of bounds or interfaces are not available.`
            );
          }
        } catch (error) {
          console.error("Error during interface operations:", error);
          if (error.name === "InvalidStateError") {
            console.error(
              "The device may not be in a state that allows claiming the interface."
            );
          } else if (error.name === "NotFoundError") {
            console.error("The specified interface was not found.");
          } else if (error.name === "NotAllowedError") {
            console.error("Permission to access the device was denied.");
          }
        }
      } else {
        console.error("Device is not opened.");
      }
    } else {
      console.error("No device connected.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Card className="shadow-md rounded-lg p-6 max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-center ">
            Status: {status} {status === "Connected" ? "🟢" : "🔴"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === "Connected" ? (
            ""
          ) : (
            <Button asChild onClick={connectDevice} className="w-full">
              <button>Connect USB Device</button>
            </Button>
          )}

          <div className="flex flex-col gap-4">
            {device && (
              <div className="flex flex-col gap-2">
                <p className="text-sm">Name: {device.productName}</p>
                <p className="text-sm">
                  Manufacturer: {device.manufacturerName}
                </p>
                <p className="text-sm">Vendor ID: {device.vendorId}</p>
                <p className="text-sm">Serial Number: {device.serialNumber}</p>
              </div>
            )}
          </div>

          {device && (
            <Button
              onClick={requestFileTransferPermission}
              className="w-full mt-4"
            >
              Request File Transfer Permission
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Page;
