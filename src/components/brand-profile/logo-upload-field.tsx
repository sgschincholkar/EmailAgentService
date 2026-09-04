"use client";

import { useRef, useState } from "react";

import { uploadAsset, UploadAssetError } from "@/components/asset/upload-asset";

type LogoUploadFieldProps = {
  logoAssetId?: string;
  onUploaded: (assetId: string, previewUrl: string) => void;
};

export function LogoUploadField({ logoAssetId, onUploaded }: LogoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const asset = await uploadAsset(file, "logo");
      const url = `/api/assets/${asset.storageKey}`;
      setPreviewUrl(url);
      onUploaded(asset.id, url);
    } catch (uploadError) {
      setError(
        uploadError instanceof UploadAssetError
          ? uploadError.message
          : "Upload failed. Try again.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const hasLogo = Boolean(logoAssetId);

  return (
    <div className="field">
      <span className="field-label">Logo upload</span>
      <div className="upload-placeholder">
        {previewUrl ? (
          <img alt="Brand logo preview" className="logo-preview" src={previewUrl} />
        ) : (
          <div>
            <strong>{hasLogo ? "Logo uploaded" : "Add your logo"}</strong>
            <p>PNG, JPEG, GIF, or WEBP, up to 5MB.</p>
          </div>
        )}
        <button
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {uploading ? "Uploading…" : hasLogo ? "Replace file" : "Choose file"}
        </button>
        <input
          accept="image/png,image/jpeg,image/gif,image/webp"
          hidden
          onChange={handleFileChange}
          ref={inputRef}
          type="file"
        />
      </div>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
