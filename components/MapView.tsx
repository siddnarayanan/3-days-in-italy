"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  order: number;
}

function numberedIcon(order: number) {
  return L.divIcon({
    className: "",
    html: `<div style="background:#4338ca;color:white;width:26px;height:26px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font:600 12px system-ui;box-shadow:0 1px 3px rgba(0,0,0,0.4)">${order}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function dotIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="background:#4338ca;width:12px;height:12px;border-radius:9999px;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

interface Props {
  points: MapPoint[];
  variant?: "route" | "preview";
}

export default function MapView({ points, variant = "route" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const bounds = useMemo(() => {
    if (points.length === 0) return null;
    return L.latLngBounds(points.map((p) => [p.lat, p.lng]));
  }, [points]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        scrollWheelZoom: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }
    const map = mapRef.current;

    const layerGroup = L.layerGroup().addTo(map);
    for (const p of points) {
      const icon = variant === "route" ? numberedIcon(p.order) : dotIcon();
      L.marker([p.lat, p.lng], { icon }).bindPopup(p.label).addTo(layerGroup);
    }
    if (variant === "route" && points.length > 1) {
      L.polyline(
        points.map((p) => [p.lat, p.lng]),
        { color: "#4338ca", weight: 2, opacity: 0.6, dashArray: "6 6" }
      ).addTo(layerGroup);
    }

    if (bounds) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
    } else {
      map.setView([41.9, 12.5], 6);
    }

    return () => {
      layerGroup.remove();
    };
  }, [points, bounds, variant]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return <div ref={containerRef} className="h-full w-full rounded-xl" />;
}
