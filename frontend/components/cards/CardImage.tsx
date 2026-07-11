"use client";

import Image from "next/image";
import { useState } from "react";
import { CARD_IMAGE_PLACEHOLDER_URL } from "@/components/cards/cardTypes";

const CATALOG_IMAGE_HOSTS = new Set(["rcgv.vn", "www.sacombank.com.vn", "www.uob.com.vn", "www.vib.com.vn"]);

const isDataImage = (src: string) => src.startsWith("data:image/");
const isLocalImage = (src: string) => src.startsWith("/");

const isAllowedCatalogRemoteImage = (src: string) => {
  try {
    const url = new URL(src);
    return url.protocol === "https:" && CATALOG_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
};

const getSafeCardImageSrc = (src?: string | null) => {
  if (!src) return CARD_IMAGE_PLACEHOLDER_URL;
  if (isLocalImage(src) || isDataImage(src) || isAllowedCatalogRemoteImage(src)) return src;
  return CARD_IMAGE_PLACEHOLDER_URL;
};

type CardImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
};

export function CardImage({ src, alt, className, sizes }: CardImageProps) {
  const [failed, setFailed] = useState(false);
  const safeSrc = failed ? CARD_IMAGE_PLACEHOLDER_URL : getSafeCardImageSrc(src);
  const remote = !isLocalImage(safeSrc) && !isDataImage(safeSrc);
  const wrapperClassName = `relative block overflow-hidden ${className ?? ""}`;
  const imageClassName = "h-full w-full object-contain";

  if (isDataImage(safeSrc)) {
    return (
      <span className={wrapperClassName}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Legacy cards may contain user-provided data URI snapshots that are intentionally outside Next remote image policy. */}
        <img
          src={safeSrc}
          alt={alt}
          className={imageClassName}
          onError={() => {
            setFailed(true);
          }}
        />
      </span>
    );
  }

  return (
    <span className={wrapperClassName}>
      <Image
        src={safeSrc}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized={remote}
        className={imageClassName}
        onError={() => {
          setFailed(true);
        }}
      />
    </span>
  );
}
