"use client";

import dynamic from "next/dynamic";

const Backup = dynamic(() => import("../components/backup"), { ssr: true });

const BackupClient = () => {
  return <Backup />;
};

export default BackupClient;
