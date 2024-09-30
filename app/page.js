import { startAdbServer } from "@/actions/_actions";
import dynamic from "next/dynamic";

const Chat = dynamic(() => import("../app/components/chat"), { ssr: false });

const Page = async () => {
  const serverStatus = await startAdbServer();
  return (
    <>
      <Chat />
    </>
  );
};

export default Page;
