import { startAdbServer } from "@/actions/_actions";
import Backup from "./components/backup";

const Page = async () => {
  const { success, output, deviceID } = await startAdbServer();
  // Only render Backup component if ADB server is successfully started
  return <Backup success={success} deviceID={deviceID} />;
};

export default Page;
