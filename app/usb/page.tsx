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
      if (device.opened) {
        console.log("Device configuration:", device.configuration);
        console.log("Device interfaces:", device.configuration.interfaces);

        const interfaceIndex = 0; // Change this if necessary based on your device
        try {
          const currentInterface =
            device.configuration.interfaces[interfaceIndex];
          console.log("Current interface:", currentInterface);

          // Check if the interface is already claimed
          if (!currentInterface.claimed) {
            console.log(`Claiming interface ${interfaceIndex}...`);
            await device.claimInterface(interfaceIndex);
            console.log(`Interface ${interfaceIndex} claimed successfully.`);
          } else {
            console.error(`Interface ${interfaceIndex} is already claimed.`);
          }

          // Now that the interface is claimed, select the alternate interface if available
          if (currentInterface.alternates.length > 0) {
            console.log(
              `Selecting alternate interface for index ${interfaceIndex}...`
            );
            await device.selectAlternateInterface(
              interfaceIndex,
              currentInterface.alternates[0].alternateSetting
            );
            console.log(
              `Alternate interface for index ${interfaceIndex} selected successfully.`
            );
          } else {
            console.error(
              `No alternate interface available for index ${interfaceIndex}.`
            );
          }

          // Access the endpoints for the claimed interface
          const endpoints = currentInterface.alternates[0].endpoints; // Access the first alternate interface
          console.log("Endpoints for the current interface:", endpoints);

          // Choose an endpoint for transferIn
          const endpointNumber = 1; // Use endpoint 1 (bulk) or 2 (interrupt) based on your needs
          const length = 512; // Use the packet size for bulk or adjust for interrupt

          console.log(
            `Using endpoint number: ${endpointNumber} with length: ${length}`
          );

          // Perform the transferIn operation
          const response = await device.transferIn(endpointNumber, length);
          console.log("Transfer response:", response);

          // Process the response data
          const data = new Uint8Array(response.data.buffer);
          console.log("Received data:", data);
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
          } else {
            console.error("An unexpected error occurred:", error);
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
