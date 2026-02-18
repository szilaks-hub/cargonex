import React, { useState } from "react";
import { Pencil, Archive, Trash2, RotateCcw, AlertTriangle } from "lucide-react";

/**
 * RowActions – Edit / Archive / Delete icons for list rows.
 * Props:
 *   onEdit        – open edit form
 *   onArchive     – set status = "archived"  (soft delete)
 *   onDelete      – hard delete (only when no linked records)
 *   isArchived    – if true show "Restore" instead of Archive
 *   canDelete     – show delete icon (admin only, no linked records)
 *   lockedMsg     – if set, all actions disabled with this tooltip
 */
export default function RowActions({ onEdit, onArchive, onDelete, isArchived, canDelete, lockedMsg }) {
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const stop = (e) => e.stopPropagation();

  if (lockedMsg) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-slate-400 italic" onClick={stop}>
        <AlertTriangle className="w-3 h-3 text-amber-400" /> Locked
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={stop}>
      {/* Edit */}
      {onEdit && (
        <button
          title="Edit / Szerkesztés"
          onClick={(e) => { stop(e); onEdit(); }}
          className="p-1 rounded hover:bg-[#2563eb]/10 text-slate-400 hover:text-[#2563eb] transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Archive / Restore */}
      {onArchive && !confirmArchive && (
        <button
          title={isArchived ? "Restore / Visszaállítás" : "Archive / Archiválás"}
          onClick={(e) => { stop(e); setConfirmArchive(true); }}
          className="p-1 rounded hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
        >
          {isArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
        </button>
      )}
      {confirmArchive && (
        <span className="flex items-center gap-1 text-[10px]">
          <span className="text-amber-600 font-medium">{isArchived ? "Restore?" : "Archive?"}</span>
          <button onClick={(e) => { stop(e); onArchive(); setConfirmArchive(false); }} className="text-amber-600 font-bold hover:underline">Yes</button>
          <button onClick={(e) => { stop(e); setConfirmArchive(false); }} className="text-slate-400 hover:underline">No</button>
        </span>
      )}

      {/* Delete (hard) */}
      {canDelete && onDelete && !confirmDelete && (
        <button
          title="Delete / Törlés"
          onClick={(e) => { stop(e); setConfirmDelete(true); }}
          className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      {confirmDelete && (
        <span className="flex items-center gap-1 text-[10px]">
          <span className="text-red-600 font-medium">Delete?</span>
          <button onClick={(e) => { stop(e); onDelete(); setConfirmDelete(false); }} className="text-red-600 font-bold hover:underline">Yes</button>
          <button onClick={(e) => { stop(e); setConfirmDelete(false); }} className="text-slate-400 hover:underline">No</button>
        </span>
      )}
    </div>
  );
}