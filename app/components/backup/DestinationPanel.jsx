"use client";
import { Loader2, Trash2Icon, ArrowBigLeft, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export default function DestinationPanel({
  loadingPaths,
  drives,
  checkedDrive,
  onDriveChange,
  onRefreshDrives,
  loadingSelectPaths,
  backupOptions,
  onDestInputChange,
  onPathsSelectClick,
  selectPathsAvailable,
  onSelectChange,
  isRootDrive,
  onClearInput,
  onNavBack,
  onDeletePath,
  open,
  setOpen,
  inputRef,
  selectRef,
}) {
  return (
    <>
      <div className="col-span-4 bg-secondary/30 rounded-md p-1.5 max-h-[120.56px] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 text-md text-muted-foreground">
          Destination
          <div
            className="flex items-center justify-center gap-1 hover:cursor-pointer duration-200 hover:text-primary"
            onClick={(e) => {
              e.preventDefault();
              onRefreshDrives();
            }}
          >
            <span className="text-xs">Refresh</span>
            <RefreshCcw className="size-3.5 hover:cursor-pointer hover:text-primary" />
          </div>
        </div>

        <div className="grid grid-cols-2 mt-1.5 gap-1.5">
          {loadingPaths ? (
            <div className="flex items-center justify-center w-full col-span-2">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : (
            drives.length > 0 &&
            drives.map((drive) => (
              <div
                key={drive.letter}
                className="flex items-center space-x-2 bg-secondary/50 rounded-md p-1.5 hover:bg-secondary"
              >
                <Checkbox
                  id={drive.letter}
                  checked={checkedDrive === drive.letter}
                  onCheckedChange={() => onDriveChange(drive.letter)}
                  className="size-5 border border-gray-300 rounded-sm"
                />
                <label
                  htmlFor={drive.letter}
                  className="text-md font-medium cursor-pointer flex items-center justify-between"
                >
                  <span className="font-bold">{drive.letter.replace(":", "")}</span>
                  {drive.name && (
                    <span className="text-muted-foreground ml-1 text-xs">({drive.name})</span>
                  )}
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="w-full col-span-6 space-y-1">
        {loadingSelectPaths ? (
          <Skeleton className="relative w-full h-9 border border-primary">
            <Loader2 className="absolute w-full h-full animate-spin flex items-center justify-center" />
          </Skeleton>
        ) : (
          <div className="flex flex-row items-center gap-1">
            <Input
              ref={inputRef}
              autoComplete="true"
              onChange={onDestInputChange}
              type="text"
              disabled={!checkedDrive}
              value={backupOptions.destInputValue}
              className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        <div className="flex flex-row items-center gap-1">
          <select
            disabled={!checkedDrive || !backupOptions.destInputValue}
            onClick={onPathsSelectClick}
            ref={selectRef}
            className="border w-full border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 text-sm focus:ring-primary hover:cursor-pointer"
            onChange={onSelectChange}
          >
            <option value="">Select a folder</option>
            {selectPathsAvailable.map((path) => (
              <option key={path} value={path} className="text-lg w-full">
                {path}
              </option>
            ))}
          </select>

          <div
            className={`flex items-center gap-1 ${
              backupOptions.destInputValue.length === 3 || backupOptions.destInputValue === ""
                ? "cursor-not-allowed"
                : ""
            }`}
          >
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={
                    backupOptions.destInputValue.length === 3 ||
                    backupOptions.destInputValue === "" ||
                    isRootDrive
                  }
                  className="p-2 text-red-500 rounded-md hover:bg-destructive hover:cursor"
                >
                  <Trash2Icon className="size-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>
                  <VisuallyHidden>Delete</VisuallyHidden>
                </DialogTitle>
                <DialogHeader>
                  <DialogDescription>
                    <VisuallyHidden>Delete options</VisuallyHidden>
                  </DialogDescription>
                  <div className="flex flex-col justify-center items-center gap-6 pb-3">
                    <Button
                      variant="destructive"
                      onClick={(e) => {
                        onClearInput();
                        setOpen(false);
                      }}
                    >
                      Clear input
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete path and all contents</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this path and all its contents? This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogCancel onClick={() => setOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            onDeletePath();
                            setOpen(false);
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </DialogHeader>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              disabled={backupOptions.destInputValue.length === 3 || backupOptions.destInputValue === ""}
              onClick={onNavBack}
              className="p-2 text-gray-500 rounded-md"
            >
              <ArrowBigLeft className="size-6" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
