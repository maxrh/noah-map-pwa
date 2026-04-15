"use client";

import { useEffect, useState } from "react";
import { Plus, Minus, Compass, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import type maplibregl from "maplibre-gl";

interface MapControlsProps {
  map: maplibregl.Map | null;
}

export function MapControls({ map }: MapControlsProps) {
  const [locating, setLocating] = useState(false);
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    if (!map) return;
    const onRotate = () => setBearing(map.getBearing());
    map.on("rotate", onRotate);
    return () => { map.off("rotate", onRotate); };
  }, [map]);

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
    if (!map || !navigator.geolocation) return;
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 12,
          duration: 1500,
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
        disabled={locating}
      >
        <LocateFixed className={`size-4 ${locating ? "animate-pulse" : ""}`} />
      </Button>
    </div>
  );
}
