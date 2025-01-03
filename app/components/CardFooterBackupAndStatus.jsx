import { CheckIcon, XIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
const CardFooterBackupAndStatus = ({
  deviceId,
  backupOptions,
  backupStarted,
  startBackup,
}) => {
  const { toast, dismissAll } = useToast();
  return (
    <div
      className={`${
        deviceId ? "text-[#20C20E] overflow-hidden" : "text-destructive"
      } font-semibold flex items-center border rounded-md`}
    >
      <Button
        disabled={backupStarted || !deviceId || !backupOptions.destInputValue}
        onClick={(e) => {
          const anyOptionSelected = Object.values(backupOptions)
            .filter((option) => option !== "destInputValue")
            .some((option) => option === true);

          if (!anyOptionSelected) {
            e.preventDefault();
            toast({
              title: "Please Select a backup source",
              description:
                "You haven't selected any folders to backup. Please enable at least one option.",
              variant: "destructive",
              className: "overflow-hidden",
            });
            return;
          }
          startBackup();
        }}
        className="relative rounded-e-none text-md px-7 w-36 select-none"
      >
        {backupStarted ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Backup"
        )}
      </Button>
      <div className="mx-2 flex justify-center select-none w-full">
        {backupStarted ? (
          <Skeleton className="h-6 w-full" />
        ) : deviceId ? (
          <div className="text-md flex gap-1 items-center">
            {deviceId} connected <CheckIcon />
          </div>
        ) : (
          <div className="text-md flex gap-1 items-center">
            No device plugged in <XIcon />
          </div>
        )}
      </div>
    </div>
  );
};

export default CardFooterBackupAndStatus;
