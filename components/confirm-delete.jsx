"use client";
import { useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
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
      const { completed, message, isEmpty } = await deleteSources({
        [itemName]: true,
      });
      if (completed) {
        toast({
          title: (
            <div className="flex items-center gap-2">
              <Check className="size-4 text-green-500" />
              {message}
            </div>
          ),
          duration: 5000,
        });
      } else {
        toast({
          title: (
            <div className="flex items-center gap-2">
              <X className="size-4 text-red-500" />
              {message}
            </div>
          ),
          duration: 5000,
        });
      }
      setLoading(false);
      setIsPopupVisible(false);
    }
  };

  const showPopup = () => setIsPopupVisible(true);
  const hidePopup = () => setIsPopupVisible(false);

  return (
    <div className="flex items-center justify-center">
      <div className="rounded-sm" onClick={showPopup}>
        <Trash2 className="size-5 text-destructive hover:scale-110 transition-transform duration-200" />
      </div>

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
