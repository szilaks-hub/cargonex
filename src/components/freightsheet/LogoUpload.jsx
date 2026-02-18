import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, X, Eye } from "lucide-react";

export default function LogoUpload({ sheetId, currentLogoUrl, isDraft, onLogoUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setError("Csak PNG, JPG vagy SVG képek engedélyezve");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("A fájl mérete nem haladhatja meg az 5 MB-ot");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      const logoUrl = res.data?.file_url || res.file_url;

      // Update sheet with new logo
      await base44.entities.FreightSheet.update(sheetId, { sheet_logo_url: logoUrl });
      onLogoUpdated(logoUrl);
    } catch (err) {
      setError("Feltöltési hiba: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Biztosan törölni szeretnéd a logót?")) return;
    setUploading(true);
    try {
      await base44.entities.FreightSheet.update(sheetId, { sheet_logo_url: null });
      onLogoUpdated(null);
    } catch (err) {
      setError("Törlési hiba: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="cx-glass px-5 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Csatolt logó / Sheet Logo</h3>
        {!isDraft && <span className="text-xs text-slate-400">(csak Draft-ban szerkeszthető)</span>}
      </div>

      {currentLogoUrl && (
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
          <img src={currentLogoUrl} alt="Sheet Logo" className="h-10 object-contain" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">Logó feltöltve</p>
          </div>
          <button
            onClick={() => setShowPreview(true)}
            className="text-slate-400 hover:text-blue-600 p-1"
            title="Előnézet"
          >
            <Eye className="w-4 h-4" />
          </button>
          {isDraft && (
            <button
              onClick={handleDelete}
              disabled={uploading}
              className="text-slate-400 hover:text-red-500 p-1"
              title="Törlés"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {isDraft && (
        <div className="flex gap-2">
          <label className="flex-1">
            <Button
              asChild
              variant="outline"
              className="w-full gap-2 cursor-pointer border-[#c6ccda]"
              disabled={uploading}
            >
              <span>
                <Upload className="w-4 h-4" /> {uploading ? "Feltöltés..." : "Logo feltöltése"}
              </span>
            </Button>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.svg"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      )}

      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded">{error}</p>}

      {showPreview && currentLogoUrl && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">Logo előnézet</h4>
            <img src={currentLogoUrl} alt="Logo preview" className="max-h-40 object-contain mx-auto" />
            <Button variant="outline" onClick={() => setShowPreview(false)} className="w-full mt-3">
              Bezárás
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}