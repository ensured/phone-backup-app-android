"use client";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { deleteSources } from "@/actions/_actions";
import { toast } from "@/hooks/use-toast";

export default function ConfirmDelete({ itemName = "item" }) {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const isConfirmed = confirmText.toLowerCase() === "d";

  const handleDelete = async () => {
    if (isConfirmed) {
      setLoading(true);
      const { completed, result, isEmpty } = await deleteSources({
        [itemName]: true,
      });
      const toastTitle = completed
        ? isEmpty
          ? "Folder is already empty."
          : "Successfully deleted"
        : "Error";
      toast({
        title: toastTitle,
        duration: 5000,
      });
      setLoading(false);
      setIsPopupVisible(false);
    }
  };

  const showPopup = () => setIsPopupVisible(true);
  const hidePopup = () => setIsPopupVisible(false);

  return (
    <div className="flex items-center justify-center">
      <Button
        onClick={(e) => {
          e.preventDefault();
          showPopup();
        }}
        variant="destructive"
        size="icon"
        className="size-5"
      >
        <Trash2 className="size-4" />
      </Button>

      {isPopupVisible && (
        <Dialog open={isPopupVisible} onOpenChange={setIsPopupVisible}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete /storage/emulated/0/DCIM/
                {itemName}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="mb-4">
              <Label
                htmlFor="confirm-delete"
                className="block text-sm font-medium text-muted-foreground mb-1"
              >
                Type "d" to confirm deletion:
              </Label>
              <Input
                id="confirm-delete"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full"
                placeholder="Type 'd' here"
              />
            </div>
            <Button
              onClick={handleDelete}
              disabled={!isConfirmed}
              className={`w-full bg-red-600 hover:bg-red-700 text-white ${
                isConfirmed
                  ? "transform transition-transform duration-200 hover:scale-105"
                  : ""
              }`}
            >
              {loading ? <Loader2 className="size-5 animate-spin" /> : "Delete"}
            </Button>
            <Button onClick={hidePopup} className="mt-2">
              Cancel
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
