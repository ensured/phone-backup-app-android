import { startAdbServer } from "@/actions/_actions";
import BackupClient from "./components/BackupClient";

const Page = async () => {
  const { success, output, error } = await startAdbServer();

  // Log success or error output for debugging purposes
  console.log("ADB Server Start:", success, output || error);

  // Only render Backup component if ADB server is successfully started
  return <BackupClient />;
};

export default Page;
