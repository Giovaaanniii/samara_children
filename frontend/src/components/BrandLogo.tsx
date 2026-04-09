import type { ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  /** Путь к растровому логотипу в `public/` */
  pngSrc?: string;
  fallbackSrc?: string;
};

/** Логотип из `public/logo.png` с запасным `logo.svg`. */
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
