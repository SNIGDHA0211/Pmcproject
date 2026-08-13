/**
 * India overview satellite map (night-styled) with office pin at Navi Mumbai.
 * Street address stays in contact copy — map shows pin + company name only.
 */
import React, { useEffect, useId, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const OFFICE = {
  title: 'Registered Office and Head Office',
  company: 'M/s Shrikhande Consultants Ltd.',
  mapLabel: 'Shrikhande Consultants Limited',
  lines: [
    'Office No. 2012-2013, 2nd floor, D Wing,',
    'Akshar Business Park, Sector 25, Vashi,',
    'Navi Mumbai – 400705',
  ],
  /** Akshar Business Park, Sector 25, Vashi */
  lat: 19.0788,
  lng: 73.0133,
} as const;

/** Frame India + neighbours like the reference overview */
const INDIA_BOUNDS: L.LatLngBoundsExpression = [
  [6.2, 66.5],
  [37.8, 98.5],
];

const MAP_QUERY = encodeURIComponent(
  'Akshar Business Park, Sector 25, Vashi, Navi Mumbai 400705',
);

export const MAP_EXTERNAL_HREF = `https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`;

const BRIEFCASE_SVG = `
<svg class="pmc-landing__map-badge-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M10 2h4a2 2 0 0 1 2 2v2h3a2 2 0 0 1 2 2v3H3V8a2 2 0 0 1 2-2h3V4a2 2 0 0 1 2-2zm0 4h4V4h-4v2zm11 7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5h7v1a1 1 0 0 0 2 0v-1h9z"/>
</svg>
`;

type LandingOfficeMapProps = {
  variant?: 'hero' | 'contact';
};

export default function LandingOfficeMap({ variant = 'hero' }: LandingOfficeMapProps) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapId = useId().replace(/:/g, '');

  useEffect(() => {
    const el = mapElRef.current;
    if (!el) return;

    const map = L.map(el, {
      center: [22.5, 80],
      zoom: 5,
      minZoom: 4,
      maxZoom: 12,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      wheelPxPerZoomLevel: 80,
      touchZoom: true,
      dragging: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: false,
      maxBounds: [
        [-5, 50],
        [50, 115],
      ],
      maxBoundsViscosity: 0.85,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Satellite base (reference-style overview)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '',
        maxZoom: 19,
        className: 'pmc-landing__map-tiles-sat',
      },
    ).addTo(map);

    // Soft place names for context (dark labels over imagery)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
      attribution: '',
      subdomains: 'abcd',
      maxZoom: 19,
      opacity: 0.85,
      className: 'pmc-landing__map-tiles-labels',
    }).addTo(map);

    map.fitBounds(INDIA_BOUNDS, { padding: [18, 18], maxZoom: 5 });

    const pin = L.divIcon({
      className: 'pmc-landing__map-marker',
      html: `
        <div class="pmc-landing__map-place">
          <span class="pmc-landing__map-badge" aria-hidden="true">
            ${BRIEFCASE_SVG}
          </span>
          <span class="pmc-landing__map-place-label">${OFFICE.mapLabel}</span>
        </div>
      `,
      iconSize: [220, 64],
      iconAnchor: [110, 22],
    });

    L.marker([OFFICE.lat, OFFICE.lng], {
      icon: pin,
      interactive: false,
      keyboard: false,
      title: OFFICE.mapLabel,
      zIndexOffset: 600,
    }).addTo(map);

    // Keep wheel/trackpad zoom active over the map (prevent page scroll while zooming)
    const canvas = el;
    const onWheel = (e: WheelEvent) => {
      if (!map.getContainer().contains(e.target as Node)) return;
      e.preventDefault();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const invalidate = () => {
      map.invalidateSize();
    };
    const t1 = window.setTimeout(invalidate, 80);
    const t2 = window.setTimeout(invalidate, 360);
    window.addEventListener('resize', invalidate);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', invalidate);
      canvas.removeEventListener('wheel', onWheel);
      map.remove();
    };
  }, [mapId, variant]);

  return (
    <div className={`pmc-landing__map pmc-landing__map--${variant}`}>
      <div
        ref={mapElRef}
        id={`pmc-office-map-${mapId}`}
        className="pmc-landing__map-canvas"
        role="img"
        aria-label={`${OFFICE.mapLabel} — Navi Mumbai, India`}
      />
    </div>
  );
}
