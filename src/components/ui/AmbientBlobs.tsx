"use client";

/**
 * 3 fixed ambient glow blobs driven by --blob1/2/3 CSS variables.
 * Import once in the dashboard layout; they float behind all content.
 */
export default function AmbientBlobs() {
  return (
    <>
      <div className="blob blob-1" aria-hidden="true" />
      <div className="blob blob-2" aria-hidden="true" />
      <div className="blob blob-3" aria-hidden="true" />
    </>
  );
}
