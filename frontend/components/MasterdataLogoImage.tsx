"use client";

import { useState } from "react";

type MasterdataLogoImageProps = {
  src?: string | null;
  alt: string;
  fallbackLabel: string;
};

export function MasterdataLogoImage({ src, alt, fallbackLabel }: MasterdataLogoImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const imageSrc = src ?? undefined;

  if (!showImage) {
    return (
      <span className="max-w-full truncate px-1 text-center text-xs font-bold text-gray-500" aria-label={alt}>
        {fallbackLabel.slice(0, 3).toUpperCase() || "IMG"}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Masterdata logos are user-managed/base64 legacy data and must not broaden Next remote image policy.
    <img
      src={imageSrc}
      alt={alt}
      className="max-h-full max-w-full object-contain"
      onError={() => {
        setFailed(true);
      }}
    />
  );
}
