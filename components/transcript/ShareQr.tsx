'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface ShareQrProps {
  /** The private share link. It is encoded here in the browser and never sent anywhere. */
  url: string;
  size?: number;
}

/** QR code for a share link, generated locally as an SVG (no third-party service, no canvas needed). */
export function ShareQr({ url, size = 180 }: Readonly<ShareQrProps>) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setFailed(false);
    QRCode.toString(url, { type: 'svg', margin: 1, width: size, color: { dark: '#4f46e5', light: '#ffffff' } })
      .then((svg) => {
        if (!cancelled) setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, [url, size]);

  if (failed) {
    return <p className="max-w-[18rem] text-sm text-[var(--acade-text-muted)]">The QR code could not be drawn. Copy the link below instead.</p>;
  }

  // Reserve the space while the code is drawn so nothing jumps.
  return (
    <div style={{ width: size, height: size }} className="mx-auto">
      {src ? <img src={src} alt="QR code for your transcript link" width={size} height={size} className="mx-auto" /> : null}
    </div>
  );
}
