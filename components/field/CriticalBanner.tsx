"use client";

interface CriticalBannerProps {
  message: string;
}

export function CriticalBanner({ message }: CriticalBannerProps) {
  return <p className="critical-banner">⚠ {message}</p>;
}
