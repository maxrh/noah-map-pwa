"use client";

import { useEffect, useState } from "react";
import { Plus, Minus, Compass, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import type maplibregl from "maplibre-gl";

interface MapControlsProps {
  map: maplibregl.Map | null;
  geolocate: maplibregl.GeolocateControl | null;
}

export function MapControls({ map, geolocate }: MapControlsProps) {
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    if (!map) return;
    const onRotate = () => setBearing(map.getBearing());
    map.on("rotate", onRotate);
    return () => { map.off("rotate", onRotate); };
  }, [map]);

  // Hide the native geolocate control button (we use our own)
  useEffect(() => {
    if (!geolocate) return;
    const el = (geolocate as unknown as { _container?: HTMLElement })._container;
    if (el) el.style.display = "none";
  }, [geolocate]);

  const handleZoomIn = () => {
    map?.zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    map?.zoomOut({ duration: 300 });
  };

  const handleResetNorth = () => {
    map?.easeTo({ bearing: 0, pitch: 0, duration: 300 });
  };

  const handleLocate = () => {
    geolocate?.trigger();
  };

  return (
    <div className="flex flex-col gap-0.5">
      <Button
        variant="default"
        size="icon"
        onClick={handleZoomIn}
        aria-label="Zoom ind"
        title="Zoom ind"
      >
        <Plus className="size-4" />
      </Button>
      <Button
        variant="default"
        size="icon"
        onClick={handleZoomOut}
        aria-label="Zoom ud"
        title="Zoom ud"
        className="mb-2"
      >
        <Minus className="size-4" />
      </Button>
      <Button
        variant="default"
        size="icon"
        onClick={handleResetNorth}
        aria-label="Nulstil retning"
        title="Nulstil retning"
      >
        <Compass
          className="size-4"
          style={{ transform: `rotate(${-bearing - 45}deg)`, transition: "transform 0.2s" }}
        />
      </Button>
      <Button
        variant="default"
        size="icon"
        onClick={handleLocate}
        aria-label="Find min placering"
        title="Find min placering"
      >
        <LocateFixed className="size-4" />
      </Button>
    </div>
  );
}
