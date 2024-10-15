import dynamic from "next/dynamic";
import { startAdbServer } from "@/actions/_actions";

const Backup = dynamic(() => import("./components/backup"), { ssr: false });

const Page = () => {
  startAdbServer();
  return (
    <>
      <Backup />
    </>
  );
};

export default Page;
