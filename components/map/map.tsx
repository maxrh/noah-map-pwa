"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { layers, namedFlavor } from "@protomaps/basemaps";
import { icons as lucideIcons } from "lucide";
import { fetchGroups, type Group } from "@/lib/groups";
import { useSearch } from "@/lib/search-context";
import { MapControls } from "./map-controls";
import "maplibre-gl/dist/maplibre-gl.css";

const PROTOMAPS_API_KEY = process.env.NEXT_PUBLIC_PROTOMAPS_API_KEY;

// Denmark center coordinates
const DENMARK_CENTER: [number, number] = [10.45, 55.6];
const INITIAL_ZOOM = 5.7;

function kebabToPascal(str: string): string {
  return str
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function getIconSvg(iconName: string): string {
  const pascalName = kebabToPascal(iconName);
  const iconData = lucideIcons[pascalName as keyof typeof lucideIcons];
  if (!iconData) return "";
  const children = iconData
    .map(([tag, attrs]) => {
      const attrStr = Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      return `<${tag} ${attrStr}/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`;
}

function createMarkerElement(iconName?: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "poi-marker";
  el.style.width = "36px";
  el.style.height = "36px";
  el.style.borderRadius = "50%";
  el.style.backgroundColor = "#00ae5a";
  el.style.border = "1px solid #168c49";
  el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
  el.style.cursor = "pointer";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";

  const svg = iconName ? getIconSvg(iconName) : "";
  if (svg) {
    el.innerHTML = svg;
  }
  return el;
}

interface MarkerEntry {
  marker: maplibregl.Marker;
  group: Group;
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function addMarkers(map: maplibregl.Map, groups: Group[]): MarkerEntry[] {
  const entries: MarkerEntry[] = [];
  for (const group of groups) {
    if (!group.lat || !group.lng) continue;

    const el = createMarkerElement(group.categoryIcon);

    const popup = new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(
      `<div style="font-family:'Roboto',sans-serif">
        <h2 style="margin:0 0 8px;font-size:18px;font-weight:bold;line-height:1.3">${escapeHtml(group.name)}</h2>
        <p style="margin:4px 0;font-size:13px">${escapeHtml(group.address)}</p>
        <p style="margin:4px 0 8px;font-size:12px;color:#666">${escapeHtml(group.category)}</p>
        <div style="text-align:right">
          <a href="/gruppe/${encodeURIComponent(group.slug)}" style="display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 10px;font-size:13px;font-weight:500;border-radius:4px;border:1px solid #e2e2e2;color:#333;text-decoration:none;transition:background 0.15s" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='transparent'">Læs mere</a>
        </div>
      </div>`
    );

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([group.lng, group.lat])
      .setPopup(popup)
      .addTo(map);

    entries.push({ marker, group });
  }
  return entries;
}

export function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const { query, setGroups, registerFlyTo } = useSearch();

  const handleFlyTo = useCallback((slug: string) => {
    const map = mapRef.current;
    if (!map) return;
    const entry = markersRef.current.find((e) => e.group.slug === slug);
    if (!entry) return;
    entry.marker.addTo(map);
    map.flyTo({
      center: [entry.group.lng, entry.group.lat],
      zoom: 13,
      duration: 1200,
    });
    entry.marker.togglePopup();
  }, []);

  useEffect(() => {
    registerFlyTo(handleFlyTo);
  }, [registerFlyTo, handleFlyTo]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      attributionControl: false,
      container: mapContainerRef.current,
      style: {
        version: 8,
        glyphs:
          "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
        sprite:
          "https://protomaps.github.io/basemaps-assets/sprites/v4/white",
        sources: {
          protomaps: {
            type: "vector",
            url: `https://api.protomaps.com/tiles/v4.json?key=${PROTOMAPS_API_KEY}`,
            attribution:
              '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
          },
        },
        layers: layers("protomaps", namedFlavor("white"), { lang: "da" }),
      },
      center: DENMARK_CENTER,
      zoom: INITIAL_ZOOM,
    });

    mapRef.current = map;

    // Fetch groups and add markers once map is ready
    map.on("load", () => {
      map.resize();
      setMapReady(true);
      fetchGroups()
        .then((groups) => {
          markersRef.current = addMarkers(map, groups);
          setGroups(groups);
        })
        .catch((err) => console.error("Failed to fetch groups:", err));
    });

    // Resize map when container dimensions change (e.g. client-side navigation back)
    const container = mapContainerRef.current;
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      setMapReady(false);
    };
  }, []);

  // Filter markers based on search query
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const q = query.toLowerCase().trim();
    for (const { marker, group } of markersRef.current) {
      if (!q) {
        if (!marker.getLngLat()) continue;
        marker.addTo(map);
        continue;
      }
      const match =
        group.name.toLowerCase().includes(q) ||
        group.address.toLowerCase().includes(q) ||
        group.description.toLowerCase().includes(q) ||
        group.category.toLowerCase().includes(q);
      if (match) {
        marker.addTo(map);
      } else {
        marker.remove();
      }
    }
  }, [query]);

  return (
    <>
      <div
        ref={mapContainerRef}
        className="flex-1 w-full"
        role="application"
        aria-label="Kort over NOAHs afdelinger"
      />
      {mapReady && (
        <div className="fixed top-18 right-4 z-50">
          <MapControls map={mapRef.current} />
        </div>
      )}
    </>
  );
}
