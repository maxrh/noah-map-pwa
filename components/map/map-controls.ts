import maplibregl from "maplibre-gl";

// ---------------------------------------------------------------------------
// Lucide SVG icon strings for map controls
// ---------------------------------------------------------------------------
const LUCIDE_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const LUCIDE_ZOOM_IN = `<svg ${LUCIDE_ATTRS}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const LUCIDE_ZOOM_OUT = `<svg ${LUCIDE_ATTRS}><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const LUCIDE_LOCATE_FIXED = `<svg ${LUCIDE_ATTRS}><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>`;
const LUCIDE_COMPASS = `<svg ${LUCIDE_ATTRS}><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/></svg>`;

// ---------------------------------------------------------------------------
// CompassControl – injected into the geolocate control group
// ---------------------------------------------------------------------------

export class CompassControl {
  private _map: maplibregl.Map;
  private _button: HTMLButtonElement | null = null;
  private _iconEl: SVGSVGElement | null = null;

  constructor(map: maplibregl.Map) {
    this._map = map;
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
      this._map.easeTo({ bearing: 0, pitch: 0, duration: 300 });
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
// replaceControlIcons – swap default MapLibre icons with Lucide SVGs
// ---------------------------------------------------------------------------

export function replaceControlIcons(container: HTMLElement): void {
  const zoomIn = container.querySelector(
    ".maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon"
  ) as HTMLElement | null;
  const zoomOut = container.querySelector(
    ".maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon"
  ) as HTMLElement | null;
  const geolocate = container.querySelector(
    ".maplibregl-ctrl-geolocate .maplibregl-ctrl-icon"
  ) as HTMLElement | null;

  if (zoomIn) {
    zoomIn.style.backgroundImage = "none";
    zoomIn.innerHTML = LUCIDE_ZOOM_IN;
  }
  if (zoomOut) {
    zoomOut.style.backgroundImage = "none";
    zoomOut.innerHTML = LUCIDE_ZOOM_OUT;
  }
  if (geolocate) {
    geolocate.style.backgroundImage = "none";
    geolocate.innerHTML = LUCIDE_LOCATE_FIXED;
  }
}
