import { createElement } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// render icon tanpa JSX — utils.js bukan .jsx
export const renderIcon = (IconComponent, size = 20, className = "") => {
  if (!IconComponent) return null;
  return createElement(IconComponent, { size, className: cn(className) });
};
