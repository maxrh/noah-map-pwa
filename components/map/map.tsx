"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { layers, namedFlavor } from "@protomaps/basemaps";
import { icons as lucideIcons } from "lucide";
import type { Group } from "@/lib/groups";
import { useSearch } from "@/lib/search-context";
import { cn } from "@/lib/utils";
import { CompassControl, ZoomLevelControl, replaceControlIcons } from "./map-controls";

const PROTOMAPS_API_KEY = process.env.NEXT_PUBLIC_PROTOMAPS_API_KEY;
const SOURCE_ID = "groups";

// Denmark center coordinates
const DENMARK_CENTER: [number, number] = [10.45, 55.6];
const INITIAL_ZOOM = 5.7;
const ONLINE_MAX_ZOOM = 17;
// Offline cap: limit zoom to a range users likely have cached from prior
// browsing (the SW caches each tile a user pans/zooms to).
const OFFLINE_MAX_ZOOM = 13;

function kebabToPascal(str: string): string {
  return str
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function getIconSvg(iconName: string, size = 18, stroke = "white"): string {
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`;
}

function createMarkerElement(iconName?: string, label?: string): HTMLElement {
  // Outer element is owned by MapLibre (it sets transform + opacity each frame).
  // Inner element holds visuals + opacity transition so MapLibre doesn't override.
  const el = document.createElement("div");
  el.className = "poi-marker";
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  if (label) el.setAttribute("aria-label", label);
  el.style.width = "36px";
  el.style.height = "36px";
  el.style.cursor = "pointer";

  const inner = document.createElement("div");
  inner.style.cssText =
    "width:100%;height:100%;border-radius:50%;background-color:#00ae5a;" +
    "border:2px solid #DBF1E0;display:flex;align-items:center;" +
    "justify-content:center;transition:opacity 300ms cubic-bezier(0.4, 0, 0.2, 1);" +
    "box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);";

  const svg = iconName ? getIconSvg(iconName) : "";
  if (svg) {
    inner.innerHTML = svg;
  }
  el.appendChild(inner);
  return el;
}

function createClusterElement(count: number): HTMLElement {
  const el = document.createElement("div");
  el.className = "cluster-marker";
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  el.setAttribute("aria-label", `Klynge med ${count} grupper. Aktivér for at zoome ind.`);
  el.style.width = "44px";
  el.style.height = "44px";
  el.style.cursor = "pointer";

  const inner = document.createElement("div");
  inner.style.cssText =
    "width:100%;height:100%;border-radius:50%;background-color:#168c49;" +
    "border:2px solid #DBF1E0;color:#ffffff;font-weight:500;font-size:14px;" +
    "font-family:'Roboto',sans-serif;display:flex;align-items:center;" +
    "justify-content:center;transition:opacity 300ms cubic-bezier(0.4, 0, 0.2, 1);" +
    "box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);";
  inner.textContent = String(count);
  el.appendChild(inner);
  return el;
}

/** Fade element to 0 then remove the marker. Safe to call multiple times. */
function fadeOutAndRemove(marker: maplibregl.Marker) {
  const el = marker.getElement();
  if (el.dataset.removing === "1") return;
  el.dataset.removing = "1";
  const inner = el.firstElementChild as HTMLElement | null;
  if (inner) {
    // Commit current opacity before fading so the transition always runs,
    // even if a fade-in just started (force reflow).
    void inner.offsetHeight;
    inner.style.opacity = "0";
  }
  window.setTimeout(() => marker.remove(), 300);
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function groupsToGeoJSON(groups: Group[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: groups
      .filter((g) => g.lat && g.lng)
      .map((g) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [g.lng, g.lat] },
        properties: {
          slug: g.slug,
          name: g.name,
          address: g.address,
          category: g.category,
          categoryIcon: g.categoryIcon,
          description: g.description,
          link: g.link,
          image: g.image,
        },
      })),
  };
}

function createPopupHTML(props: {
  name: string;
  address: string;
  category: string;
  categoryIcon?: string;
  slug: string;
}): string {
  const iconSvg = props.categoryIcon ? getIconSvg(props.categoryIcon, 14, "currentColor") : "";
  return `<div style="font-family:'Roboto',sans-serif">
    <div style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px 2px 6px;border-radius:9999px;background:#f5f5f5;font-size:12px;font-weight:500;color:#555;margin-bottom:16px">${iconSvg}${escapeHtml(props.category)}</div>
    <h2 style="margin:0 0 4px;font-size:18px;font-weight:bold;line-height:1.3">${escapeHtml(props.name)}</h2>
    <p style="margin:0 0 16px;font-size:13px">${escapeHtml(props.address)}</p>
    <a href="/gruppe/${encodeURIComponent(props.slug)}" class="popup-cta">Læs mere</a>
  </div>`;
}

export function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const groupsRef = useRef<Group[]>([]);
  const markersOnScreen = useRef<Record<string, maplibregl.Marker>>({});
  const validSlugs = useRef<Set<string>>(new Set());
  const rafId = useRef<number>(0);
  const compassRef = useRef<CompassControl | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const { query, groups, selectedCategory, registerFlyTo, registerResetView } = useSearch();

  // Build filtered GeoJSON and update source
  const updateSource = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const q = query.toLowerCase().trim();
    const filtered = groupsRef.current.filter((g) => {
      const matchesCategory =
        !selectedCategory || g.category === selectedCategory;
      const matchesQuery =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.address.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });

    // Update valid slugs and immediately remove invalid markers
    validSlugs.current = new Set(filtered.map((g) => g.slug));
    for (const id in markersOnScreen.current) {
      if (!validSlugs.current.has(id)) {
        fadeOutAndRemove(markersOnScreen.current[id]);
        delete markersOnScreen.current[id];
      }
    }

    source.setData(groupsToGeoJSON(filtered));
  }, [query, selectedCategory]);

  // Sync DOM markers for clusters and unclustered points visible on screen
  const updateMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const features = map.querySourceFeatures(SOURCE_ID);
    const newMarkers: Record<string, maplibregl.Marker> = {};
    const seen = new Set<string>();

    for (const feature of features) {
      const props = feature.properties;
      if (!props) continue;
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

      // Cluster bubble
      if (props.cluster) {
        const id = `cluster-${props.cluster_id}`;
        if (seen.has(id)) continue;
        seen.add(id);

        let marker = markersOnScreen.current[id];
        if (!marker) {
          const el = createClusterElement(props.point_count as number);
          const expand = () => {
            const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
            source.getClusterExpansionZoom(props.cluster_id as number).then((zoom) => {
              map.easeTo({ center: coords, zoom: zoom + 0.5 });
            });
          };
          el.addEventListener("click", expand);
          el.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              expand();
            }
          });
          marker = new maplibregl.Marker({ element: el }).setLngLat(coords);
        }

        newMarkers[id] = marker;
        if (!markersOnScreen.current[id]) {
          marker.addTo(map);
        }
        continue;
      }

      // POI marker
      const id = props.slug as string;
      if (!validSlugs.current.has(id)) continue;
      if (seen.has(id)) continue;
      seen.add(id);

      let marker = markersOnScreen.current[id];
      if (!marker) {
        const label = `${props.name as string}, ${props.category as string}`;
        const el = createMarkerElement(props.categoryIcon, label);
        const popup = new maplibregl.Popup({ offset: 20, closeButton: false })
          .setHTML(createPopupHTML(props as { name: string; address: string; category: string; categoryIcon?: string; slug: string }));

        // Add dialog semantics + focus management when popup opens
        popup.on("open", () => {
          const popupEl = popup.getElement();
          if (!popupEl) return;
          popupEl.setAttribute("role", "dialog");
          popupEl.setAttribute("aria-label", `${props.name as string} – detaljer`);
          // Move focus to the first focusable element (the "Læs mere" link)
          const firstLink = popupEl.querySelector<HTMLAnchorElement>("a.popup-cta");
          firstLink?.focus();
        });

        marker = new maplibregl.Marker({ element: el })
          .setLngLat(coords)
          .setPopup(popup);

        // Keyboard activation: Enter/Space toggles popup
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            marker!.togglePopup();
          }
        });
      }

      newMarkers[id] = marker;

      if (!markersOnScreen.current[id]) {
        marker.addTo(map);
      }
    }

    // Remove markers no longer present (POIs and clusters)
    for (const id in markersOnScreen.current) {
      if (!newMarkers[id]) {
        fadeOutAndRemove(markersOnScreen.current[id]);
      }
    }

    markersOnScreen.current = newMarkers;
  }, []);

  const handleFlyTo = useCallback((slug: string) => {
    const map = mapRef.current;
    if (!map) return;
    const group = groupsRef.current.find((g) => g.slug === slug);
    if (!group) return;

    map.flyTo({
      center: [group.lng, group.lat],
      zoom: 13,
      duration: 1200,
    });

    // After fly animation, show popup on the marker
    map.once("moveend", () => {
      // Force marker sync so the marker exists
      updateMarkers();
      const marker = markersOnScreen.current[slug];
      const popup = marker?.getPopup();
      if (marker && popup && !popup.isOpen()) {
        marker.togglePopup();
      }
    });
  }, [updateMarkers]);

  useEffect(() => {

    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      attributionControl: false,
      fadeDuration: 300,
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
      minZoom: INITIAL_ZOOM,
      maxZoom:
        typeof navigator !== "undefined" && !navigator.onLine
          ? OFFLINE_MAX_ZOOM
          : ONLINE_MAX_ZOOM,
    });

    mapRef.current = map;

    // Zoom-level badge + scale bar (bottom-left, above the filters/search bar).
    // Zoom added first so it appears on the left.
    map.addControl(new ZoomLevelControl(OFFLINE_MAX_ZOOM), "bottom-left");
    const scaleControl = new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" });
    map.addControl(scaleControl, "bottom-left");
    // ScaleControl has no aria/title API — annotate the rendered element.
    const scaleEl = (scaleControl as unknown as { _container?: HTMLElement })._container;
    if (scaleEl) {
      scaleEl.setAttribute("role", "img");
      scaleEl.setAttribute("aria-label", "Skala");
      scaleEl.title = "Skala";
    }

    // Live offline/online switch: clamp max zoom when offline so users
    // can't zoom past the cached tile range; restore full zoom online.
    const applyMaxZoom = () => {
      const max = navigator.onLine ? ONLINE_MAX_ZOOM : OFFLINE_MAX_ZOOM;
      map.setMaxZoom(max);
      if (map.getZoom() > max) map.easeTo({ zoom: max, duration: 300 });
    };
    window.addEventListener("online", applyMaxZoom);
    window.addEventListener("offline", applyMaxZoom);

    // Native geolocate control (top-right)
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
    });
    map.addControl(geolocate, "top-right");

    // Inject compass button into the geolocate control group
    const compass = new CompassControl(map, {
      center: DENMARK_CENTER,
      zoom: INITIAL_ZOOM,
    });
    compass.injectInto(mapContainerRef.current!);
    compassRef.current = compass;

    // Replace default MapLibre icons with Lucide SVGs
    replaceControlIcons(mapContainerRef.current!);

    map.on("load", () => {
      map.resize();

      // Generate cluster bubble icons (3 sizes) so circle + text fade together as one symbol layer
      // Add clustered GeoJSON source
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 30,
      });

      // Clusters and POIs are rendered as HTML markers in updateMarkers().
      // We still need an invisible layer so MapLibre tiles the source –
      // querySourceFeatures only returns features from rendered tiles.
      map.addLayer({
        id: "groups-tiler",
        type: "circle",
        source: SOURCE_ID,
        paint: { "circle-radius": 0, "circle-opacity": 0 },
      });

      // Sync DOM markers when source data settles and on pan/zoom
      map.on("data", (e) => {
        if (e.dataType === "source" && (e as maplibregl.MapSourceDataEvent).sourceId === SOURCE_ID && (e as maplibregl.MapSourceDataEvent).isSourceLoaded) {
          updateMarkers();
        }
      });
      map.on("move", () => {
        cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(updateMarkers);
      });

      setMapReady(true);

      // Initial data will be populated by the groups effect below
    });

    // Resize map when container dimensions change
    const container = mapContainerRef.current;
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("online", applyMaxZoom);
      window.removeEventListener("offline", applyMaxZoom);
      compassRef.current?.destroy();
      compassRef.current = null;
      map.remove();
      mapRef.current = null;
      groupsRef.current = [];
      markersOnScreen.current = {};
      validSlugs.current = new Set();
      setMapReady(false);
    };
  }, []);

  // Update source data when filters change
  useEffect(() => {
    updateSource();
  }, [updateSource]);

  // Sync groups from context into map
  useEffect(() => {
    if (!mapReady || !groups.length) return;
    groupsRef.current = groups;
    validSlugs.current = new Set(groups.map((g) => g.slug));
    updateSource();
    updateMarkers();
  }, [groups, mapReady, updateSource, updateMarkers]);

  // Expose flyTo only after map + groups are ready (groupsRef populated above)
  useEffect(() => {
    if (!mapReady || !groups.length) return;
    registerFlyTo(handleFlyTo);
    return () => {
      // Unregister on unmount/re-run so context queues subsequent calls
      // until a new map instance is ready.
      registerFlyTo(null);
    };
  }, [registerFlyTo, handleFlyTo, mapReady, groups.length]);

  // Expose a reset-view action used by the header logo click
  useEffect(() => {
    if (!mapReady) return;
    const reset = () => {
      const map = mapRef.current;
      if (!map) return;
      // Close any open popups
      for (const id in markersOnScreen.current) {
        const popup = markersOnScreen.current[id].getPopup();
        if (popup?.isOpen()) popup.remove();
      }
      map.easeTo({ center: DENMARK_CENTER, zoom: INITIAL_ZOOM, bearing: 0, pitch: 0, duration: 800 });
    };
    registerResetView(reset);
    return () => registerResetView(null);
  }, [registerResetView, mapReady]);

  return (
    <div
      className={cn(
        "relative flex-1 w-full flex flex-col overflow-hidden transition-opacity duration-500 ease-out",
        mapReady ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        ref={mapContainerRef}
        className="flex-1 w-full"
        role="application"
        aria-label="Kort over NOAHs afdelinger"
      />
    </div>
  );
}
