import dynamic from "next/dynamic";
import { startAdbServer } from "@/actions/_actions";

const Backup = dynamic(() => import("./components/backup"), { ssr: false });

const Page = async () => {
  const { output } = await startAdbServer();

  return <Backup />;
};

export default Page;
