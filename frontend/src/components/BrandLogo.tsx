import type { ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {

  pngSrc?: string;
  fallbackSrc?: string;
};

export default function BrandLogo({
  pngSrc = "/logo.png",
  fallbackSrc = "/logo.svg",
  alt = "",
  ...rest
}: Props) {
  return (
    <img
      src={pngSrc}
      alt={alt}
      decoding="async"
      onError={(e) => {
        const el = e.currentTarget;
        if (el.dataset.fallback === "1") return;
        el.dataset.fallback = "1";
        el.src = fallbackSrc;
      }}
      {...rest}
    />
  );
}

