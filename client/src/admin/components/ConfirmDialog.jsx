import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function ConfirmDialog({
  open,
  onOpenChange,
  title = "Confirm Action",
  description = "Are you sure you want to proceed?",
  confirmLabel = "Confirm",
  confirmVariant = "default",
  requireReason = false,
  reasonLabel = "Audit Reason",
  reasonPlaceholder = "Provide a brief reason for the audit log...",
  isPending = false,
  onConfirm
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const handleConfirm = () => {
    if (requireReason && reason.trim().length < 3) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <AlertTriangle className={`w-4.5 h-4.5 ${confirmVariant === "destructive" ? "text-rose-600" : "text-[#00a99d]"}`} />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {description}
          </DialogDescription>
        </DialogHeader>

        {requireReason && (
          <div className="space-y-1.5 py-2">
            <Label className="text-xs font-semibold">{reasonLabel} *</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              className="text-xs"
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="text-xs cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending || (requireReason && reason.trim().length < 3)}
            onClick={handleConfirm}
            className={`text-xs cursor-pointer text-white ${
              confirmVariant === "destructive"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-[#0d2240] hover:bg-[#132d4a]"
            }`}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
