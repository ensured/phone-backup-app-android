"use client";
import { Loader2 } from "lucide-react";
import BackupOption from "../backupOption";

export default function BackupOptionsPanel({
  deviceId,
  backupOptions,
  onOptionsChange,
  sizeEstimate,
  isEstimating,
}) {
  return (
    <div className="col-span-2 bg-secondary/30 rounded-md p-1.5">
      <BackupOption options={backupOptions} onChange={onOptionsChange} />
      {/* Size Estimate Display */}
      {deviceId && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Size:</span>
            {isEstimating ? (
              <Loader2 className="size-3 animate-spin" />
            ) : sizeEstimate ? (
              <span className="font-medium text-primary">
                ~{sizeEstimate.formattedSize}
              </span>
            ) : (
              <span className="text-muted-foreground">--</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
