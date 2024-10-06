import dynamic from "next/dynamic";
const Chat = dynamic(() => import("../app/components/chat"), { ssr: false });

const Page = async () => {
  return (
    <>
      <Chat />
    </>
  );
};

export default Page;
