"use client";

export default function StorageInfo({ deviceStorage }) {
  if (!deviceStorage) return null;

  return (
    <div className="mt-2 text-center">
      {deviceStorage.success ? (
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-md">
          <span className="font-medium text-foreground">
            {deviceStorage.used}
          </span>
          <span className="text-muted-foreground">/</span>
          <span>{deviceStorage.total}</span>
          <span className="text-xs text-muted-foreground ml-1">
            ({deviceStorage.usedPercent} used)
          </span>
        </div>
      ) : deviceStorage.error ? (
        <span className="text-xs text-red-500">
          Storage error: {deviceStorage.error}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Loading storage...</span>
      )}
    </div>
  );
}
