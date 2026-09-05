"use client";

import { useRef, useState } from "react";

import { uploadAsset, UploadAssetError } from "@/components/asset/upload-asset";

export type CampaignImageEntry = {
  assetId: string;
  previewUrl: string;
  altText: string;
};

type CampaignImagesFieldProps = {
  value: CampaignImageEntry[];
  onChange: (value: CampaignImageEntry[]) => void;
  imageRequired: boolean;
};

const MAX_IMAGES = 3;

export function CampaignImagesField({
  value,
  onChange,
  imageRequired,
}: CampaignImagesFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const asset = await uploadAsset(file, "campaign_image");
      onChange([
        ...value,
        {
          assetId: asset.id,
          previewUrl: `/api/assets/${asset.storageKey}`,
          altText: "",
        },
      ]);
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

  function removeImage(assetId: string) {
    onChange(value.filter((entry) => entry.assetId !== assetId));
  }

  function setAltText(assetId: string, altText: string) {
    onChange(
      value.map((entry) => (entry.assetId === assetId ? { ...entry, altText } : entry)),
    );
  }

  return (
    <div className="field">
      <span className="field-label">
        Add your images{imageRequired ? " *" : ""}
      </span>
      <p className="field-hint">
        Upload up to 3 images. PNG, JPEG, GIF, or WEBP, up to 5MB each.
      </p>

      <div className="image-thumbnail-grid">
        {value.map((entry) => (
          <div className="image-thumbnail" key={entry.assetId}>
            <img alt={entry.altText || "Campaign image"} src={entry.previewUrl} />
            <input
              aria-label="Image description"
              onChange={(event) => setAltText(entry.assetId, event.target.value)}
              placeholder="Describe this image"
              value={entry.altText}
            />
            <button
              aria-label="Remove image"
              className="compact-control"
              onClick={() => removeImage(entry.assetId)}
              type="button"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {value.length < MAX_IMAGES ? (
        <button
          className="compact-control"
          disabled={uploading}
          id="campaign-images-upload"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {uploading ? "Uploading…" : "Upload image"}
        </button>
      ) : null}
      <input
        accept="image/png,image/jpeg,image/gif,image/webp"
        hidden
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />

      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
