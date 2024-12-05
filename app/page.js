import { startAdbServer } from "@/actions/_actions";
import Backup from "./components/backup";

export const metadata = {
  title: "BackupBuddy",
  description:
    "BackupBuddy is a tool to backup your Android device to a local drive.",
};

const Page = async () => {
  const { success, output, deviceID } = await startAdbServer();
  // Only render Backup component if ADB server is successfully started
  return <Backup success={success} deviceID={deviceID} />;
};

export default Page;
