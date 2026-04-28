"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type RowEditDeleteActionsProps = {
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled?: boolean;
  deleteTitle?: string;
  busy?: boolean;
};

export function RowEditDeleteActions({
  onEdit,
  onDelete,
  deleteDisabled,
  deleteTitle,
  busy,
}: RowEditDeleteActionsProps) {
  return (
    <div className="flex min-w-0 shrink-0 flex-wrap justify-end gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 text-foreground"
        onClick={onEdit}
        disabled={busy}
      >
        <Pencil className="size-3.5 shrink-0" aria-hidden />
        Edit
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="gap-1.5"
        disabled={deleteDisabled || busy}
        onClick={onDelete}
        title={deleteTitle}
      >
        <Trash2 className="size-3.5 shrink-0" aria-hidden />
        Delete
      </Button>
    </div>
  );
}
