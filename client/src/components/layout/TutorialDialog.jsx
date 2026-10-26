import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, PlayCircle, BookOpen, ExternalLink } from "lucide-react";

export function TutorialDialog({ tutorial, isOpen, onClose, onExecuteAction }) {
  if (!tutorial) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
        {/* Header with visual accent */}
        <div className="bg-linear-to-r from-[#0a1e35] via-[#102d50] to-[#00a99d] text-white p-6 relative">
          <div className="flex items-center gap-2 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <BookOpen className="w-4 h-4" />
            <span>MakaziFlow Guide & Tutorial</span>
          </div>
          <DialogTitle className="text-xl font-bold text-white tracking-tight">
            {tutorial.title}
          </DialogTitle>
          <DialogDescription className="text-slate-200 text-xs mt-1 leading-relaxed">
            {tutorial.description}
          </DialogDescription>
        </div>

        {/* Steps List */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Step-by-Step Instructions
          </h4>

          <div className="space-y-3">
            {tutorial.steps?.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition hover:border-slate-200"
              >
                <div className="w-6 h-6 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0 text-xs font-bold">
                  {idx + 1}
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed pt-0.5">
                  <span className="font-semibold text-slate-900 dark:text-white mr-1">
                    {step.title}:
                  </span>
                  {step.detail}
                </div>
              </div>
            ))}
          </div>

          {tutorial.tip && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <span className="font-bold shrink-0">💡 Pro Tip:</span>
              <span className="leading-relaxed">{tutorial.tip}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
          >
            Close
          </Button>

          {tutorial.actionLabel && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onClose();
                if (onExecuteAction) onExecuteAction(tutorial.actionType, tutorial.actionTarget);
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>{tutorial.actionLabel}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
