"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type ActiveSwitchFieldProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
};

/** Full-width row for dialogs (create / edit). */
export function ActiveSwitchField({
  id,
  checked,
  onCheckedChange,
  disabled,
  label = "Active",
  description,
}: ActiveSwitchFieldProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5">
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
        </Label>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {checked
              ? "Included in normal operations and lists."
              : "Marked inactive; can be re-enabled anytime."}
          </p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

type ActiveRowSwitchProps = {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  title?: string;
};

/** Compact switch + status label for data tables. */
export function ActiveRowSwitch({
  checked,
  onCheckedChange,
  disabled,
  title,
}: ActiveRowSwitchProps) {
  return (
    <div
      className="flex min-w-0 items-center gap-2"
      title={title}
    >
      <Switch
        className="shrink-0 border border-border/80"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={checked ? "Active, click to deactivate" : "Inactive, click to activate"}
      />
      <span
        className={cn(
          "text-sm",
          checked ? "font-medium text-emerald-700" : "text-muted-foreground",
        )}
      >
        {checked ? "Active" : "Inactive"}
      </span>
    </div>
  );
}
