import maplibregl from "maplibre-gl";

// ---------------------------------------------------------------------------
// Lucide SVG icon strings for map controls
// ---------------------------------------------------------------------------
const LUCIDE_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const LUCIDE_LOCATE_FIXED = `<svg ${LUCIDE_ATTRS}><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>`;
const LUCIDE_COMPASS = `<svg ${LUCIDE_ATTRS}><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/></svg>`;

// ---------------------------------------------------------------------------
// CompassControl – injected into the geolocate control group
// ---------------------------------------------------------------------------

export interface CompassResetOptions {
  center?: [number, number];
  zoom?: number;
}

export class CompassControl {
  private _map: maplibregl.Map;
  private _button: HTMLButtonElement | null = null;
  private _iconEl: SVGSVGElement | null = null;
  private _resetOptions: CompassResetOptions;

  constructor(map: maplibregl.Map, resetOptions: CompassResetOptions = {}) {
    this._map = map;
    this._resetOptions = resetOptions;
  }

  injectInto(container: HTMLElement): void {
    const geolocateBtn = container.querySelector(".maplibregl-ctrl-geolocate");
    const group = geolocateBtn?.closest(".maplibregl-ctrl-group");
    if (!geolocateBtn || !group) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "maplibregl-ctrl-compass";
    button.setAttribute("aria-label", "Nulstil retning");
    button.title = "Nulstil retning";
    button.innerHTML = LUCIDE_COMPASS;

    this._iconEl = button.querySelector("svg") as SVGSVGElement | null;
    this._button = button;

    button.addEventListener("click", () => {
      this._map.easeTo({
        bearing: 0,
        pitch: 0,
        ...(this._resetOptions.center && { center: this._resetOptions.center }),
        ...(this._resetOptions.zoom !== undefined && { zoom: this._resetOptions.zoom }),
        duration: 600,
      });
    });

    group.insertBefore(button, geolocateBtn);

    this._map.on("rotate", this._onRotate);
    this._onRotate();
  }

  private _onRotate = (): void => {
    if (this._iconEl) {
      const bearing = this._map.getBearing();
      this._iconEl.style.transform = `rotate(${-bearing - 45}deg)`;
      this._iconEl.style.transition = "transform 0.2s";
    }
  };

  destroy(): void {
    this._map.off("rotate", this._onRotate);
    this._button?.remove();
    this._button = null;
    this._iconEl = null;
  }
}

// ---------------------------------------------------------------------------
// ZoomLevelControl – read-only badge showing the current zoom level
// ---------------------------------------------------------------------------

export class ZoomLevelControl implements maplibregl.IControl {
  private _map: maplibregl.Map | null = null;
  private _container: HTMLElement | null = null;
  private _offlineMaxZoom: number | null;

  constructor(offlineMaxZoom: number | null = null) {
    this._offlineMaxZoom = offlineMaxZoom;
  }

  onAdd(map: maplibregl.Map): HTMLElement {
    this._map = map;
    const el = document.createElement("div");
    el.className = "maplibregl-ctrl maplibregl-ctrl-zoom-level";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", "Zoomniveau");
    el.title = "Zoomniveau";
    this._container = el;
    map.on("zoom", this._update);
    if (typeof window !== "undefined") {
      window.addEventListener("online", this._update);
      window.addEventListener("offline", this._update);
    }
    this._update();
    return el;
  }

  onRemove(): void {
    this._map?.off("zoom", this._update);
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this._update);
      window.removeEventListener("offline", this._update);
    }
    this._container?.remove();
    this._container = null;
    this._map = null;
  }

  private _update = (): void => {
    if (!this._container || !this._map) return;
    const zoom = this._map.getZoom();
    const min = this._map.getMinZoom();
    const max = this._map.getMaxZoom();
    const EPS = 0.05;
    const isOffline =
      typeof navigator !== "undefined" && !navigator.onLine;
    const atOfflineCap =
      isOffline &&
      this._offlineMaxZoom !== null &&
      zoom >= this._offlineMaxZoom - EPS;

    let label: string;
    if (atOfflineCap) label = "Zoom max (offline)";
    else if (zoom >= max - EPS) label = "Zoom max";
    else if (zoom <= min + EPS) label = "Zoom min";
    else label = `Zoom ${zoom.toFixed(1)}`;
    this._container.textContent = label;
  };
}

// ---------------------------------------------------------------------------
// replaceControlIcons – swap default MapLibre icons with Lucide SVGs
// ---------------------------------------------------------------------------

export function replaceControlIcons(container: HTMLElement): void {
  const geolocate = container.querySelector(
    ".maplibregl-ctrl-geolocate .maplibregl-ctrl-icon"
  ) as HTMLElement | null;

  if (geolocate) {
    geolocate.style.backgroundImage = "none";
    geolocate.innerHTML = LUCIDE_LOCATE_FIXED;
  }
}
