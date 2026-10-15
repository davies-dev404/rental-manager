import { evaluatePassword, PASSWORD_CRITERIA } from "@/lib/passwordPolicy";
import { CheckCircle2, Circle } from "lucide-react";

/**
 * PasswordStrengthIndicator Component
 * Renders real-time strength bar and checklist of password requirements.
 */
export default function PasswordStrengthIndicator({ password = "", showChecklist = true, className = "" }) {
  if (!password && !showChecklist) return null;

  const evaluation = evaluatePassword(password);
  const { score, label, color, textColor, checks, isCommon } = evaluation;

  return (
    <div className={`space-y-2 pt-1 transition-all duration-200 ${className}`}>
      {/* Strength Bar */}
      {password ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Password strength:</span>
            <span className={`font-semibold ${textColor}`}>{label}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 h-1.5">
            {[1, 2, 3, 4].map((step) => {
              const active = score >= step;
              return (
                <div
                  key={step}
                  className={`h-full rounded-full transition-all duration-300 ${
                    active ? color : "bg-muted"
                  }`}
                />
              );
            })}
          </div>
          {isCommon && (
            <p className="text-[11px] text-rose-500 font-medium">
              ⚠️ Common password pattern detected. Please choose a more unique phrase.
            </p>
          )}
        </div>
      ) : null}

      {/* Checklist */}
      {showChecklist && (
        <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5 text-xs space-y-1.5">
          <p className="font-medium text-foreground text-[11px] uppercase tracking-wider">
            Password Requirements:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
            {PASSWORD_CRITERIA.map((criterion) => {
              const passed = checks[criterion.id];
              return (
                <div
                  key={criterion.id}
                  className={`flex items-center gap-1.5 transition-colors duration-150 ${
                    passed
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                  )}
                  <span className="text-[11px]">{criterion.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
