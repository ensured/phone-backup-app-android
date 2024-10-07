import dynamic from "next/dynamic";
const Backup = dynamic(() => import("./components/backup"), { ssr: false });

const Page = async () => {
  return (
    <>
      <Backup />
    </>
  );
};

export default Page;
