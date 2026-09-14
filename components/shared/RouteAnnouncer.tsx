'use client';

import { useEffect, useState } from 'react';

export interface RouteAnnouncerProps {
  title: string;
}

export function RouteAnnouncer({ title }: RouteAnnouncerProps) {
  const [announcement, setAnnouncement] = useState(title);

  useEffect(() => {
    setAnnouncement(title);
  }, [title]);

  return (
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </p>
  );
}
