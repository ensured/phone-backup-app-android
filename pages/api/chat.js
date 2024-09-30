import { Server } from "socket.io";
import Adb from "@devicefarmer/adbkit";

let connectedDevices = []; // Track currently connected devices

export default async function SocketHandler(req, res) {
  if (res.socket.server.io) {
    res.end();
    return;
  }

  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  const client = Adb.createClient();
  try {
    const tracker = await client.trackDevices();

    tracker.on("add", (device) => {
      connectedDevices.push(device); // Add connected device to the list

      io.emit("device-status", { status: "connected", deviceId: device.id });
    });

    tracker.on("remove", (device) => {
      connectedDevices = connectedDevices.filter((d) => d.id !== device.id); // Remove disconnected device
      io.emit("device-status", { status: "disconnected", deviceId: device.id });
    });

    tracker.on("end", () => {
      console.log("Device tracking stopped");
    });
  } catch (err) {
    console.error("Error tracking devices:", err);
  }

  io.on("connection", (socket) => {
    console.log("Client connected to socket");

    // Send current connected devices to the client on connection
    if (connectedDevices.length > 0) {
      socket.emit("device-status", {
        status: "connected",
        deviceId: connectedDevices[0].id,
      });
    } else {
      socket.emit("device-status", { status: "disconnected" });
    }

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  console.log("Socket set up and ADB tracking started");
  res.end();
}
