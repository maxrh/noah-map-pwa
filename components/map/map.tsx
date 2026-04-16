"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { layers, namedFlavor } from "@protomaps/basemaps";
import { icons as lucideIcons } from "lucide";
import { fetchGroups, type Group } from "@/lib/groups";
import { useSearch } from "@/lib/search-context";
import { MapControls } from "./map-controls";

const PROTOMAPS_API_KEY = process.env.NEXT_PUBLIC_PROTOMAPS_API_KEY;
const SOURCE_ID = "groups";
const CLUSTER_LAYER = "clusters";
const CLUSTER_COUNT_LAYER = "cluster-count";

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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`;
}

function createMarkerElement(iconName?: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "poi-marker";
  el.style.width = "36px";
  el.style.height = "36px";
  el.style.borderRadius = "50%";
  el.style.backgroundColor = "#00ae5a";
  el.style.border = "2px solid white";
  el.style.cursor = "pointer";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.transition = "opacity 0.15s ease-out";
  el.style.opacity = "1";

  const svg = iconName ? getIconSvg(iconName) : "";
  if (svg) {
    el.innerHTML = svg;
  }
  return el;
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
  slug: string;
}): string {
  return `<div style="font-family:'Roboto',sans-serif">
    <h2 style="margin:0 0 8px;font-size:18px;font-weight:bold;line-height:1.3">${escapeHtml(props.name)}</h2>
    <p style="margin:4px 0;font-size:13px">${escapeHtml(props.address)}</p>
    <p style="margin:4px 0 8px;font-size:12px;color:#666">${escapeHtml(props.category)}</p>
    <div style="text-align:right">
      <a href="/gruppe/${encodeURIComponent(props.slug)}" style="display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 10px;font-size:13px;font-weight:500;border-radius:4px;border:1px solid #e2e2e2;color:#333;text-decoration:none;transition:background 0.15s" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='transparent'">Læs mere</a>
    </div>
  </div>`;
}

export function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const groupsRef = useRef<Group[]>([]);
  const markersOnScreen = useRef<Record<string, maplibregl.Marker>>({});
  const validSlugs = useRef<Set<string>>(new Set());
  const rafId = useRef<number>(0);
  const [mapReady, setMapReady] = useState(false);
  const { query, setGroups, selectedCategory, registerFlyTo } = useSearch();

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
        markersOnScreen.current[id].remove();
        delete markersOnScreen.current[id];
      }
    }

    source.setData(groupsToGeoJSON(filtered));
  }, [query, selectedCategory]);

  // Sync DOM markers for unclustered points visible on screen
  const updateMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const features = map.querySourceFeatures(SOURCE_ID);
    const newMarkers: Record<string, maplibregl.Marker> = {};
    const seen = new Set<string>();

    for (const feature of features) {
      const props = feature.properties;
      if (!props || props.cluster) continue;

      const id = props.slug as string;

      // Skip stale features and dedup across tile boundaries
      if (!validSlugs.current.has(id)) continue;
      if (seen.has(id)) continue;
      seen.add(id);

      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

      let marker = markersOnScreen.current[id];
      if (!marker) {
        const el = createMarkerElement(props.categoryIcon);
        const popup = new maplibregl.Popup({ offset: 20, closeButton: false })
          .setHTML(createPopupHTML(props as { name: string; address: string; category: string; slug: string }));

        marker = new maplibregl.Marker({ element: el })
          .setLngLat(coords)
          .setPopup(popup);
      }

      newMarkers[id] = marker;

      if (!markersOnScreen.current[id]) {
        marker.addTo(map);
      }
    }

    // Remove markers no longer valid
    for (const id in markersOnScreen.current) {
      if (!newMarkers[id]) {
        markersOnScreen.current[id].remove();
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
      if (marker && !marker.getPopup().isOpen()) {
        marker.togglePopup();
      }
    });
  }, [updateMarkers]);

  useEffect(() => {
    registerFlyTo(handleFlyTo);
  }, [registerFlyTo, handleFlyTo]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      attributionControl: false,
      fadeDuration: 0,
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

    map.on("load", () => {
      map.resize();

      // Add clustered GeoJSON source
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 30,
      });

      // Cluster circle layer
      map.addLayer({
        id: CLUSTER_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#00ae5a",
          "circle-radius": ["step", ["get", "point_count"], 18, 5, 22, 10, 28],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Cluster count label layer
      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Noto Sans Medium"],
          "text-size": 14,
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Click cluster → zoom to expand
      map.on("click", CLUSTER_LAYER, (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [CLUSTER_LAYER],
        });
        if (!features.length) return;
        const clusterId = features[0].properties.cluster_id;
        const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({
            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom + 0.5,
          });
        });
      });

      // Cursor pointer on clusters
      map.on("mouseenter", CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = "";
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

      // Fetch and populate
      fetchGroups()
        .then((groups) => {
          groupsRef.current = groups;
          validSlugs.current = new Set(groups.map((g) => g.slug));
          setGroups(groups);
          const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
          source.setData(groupsToGeoJSON(groups));
        })
        .catch((err) => console.error("Failed to fetch groups:", err));
    });

    // Resize map when container dimensions change
    const container = mapContainerRef.current;
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
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
