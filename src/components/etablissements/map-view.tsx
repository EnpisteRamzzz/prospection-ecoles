"use client";

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { StatutContrat } from "@/generated/prisma/enums";
import { Skeleton } from "@/components/ui/skeleton";

// MapLibre est chargé dynamiquement pour éviter les problèmes SSR
let maplibreLoaded = false;

const COLORS: Record<StatutContrat, string> = {
  [StatutContrat.SousContrat]: "#3b82f6", // blue
  [StatutContrat.HorsContrat]: "#f59e0b", // amber
  [StatutContrat.Inconnu]: "#a1a1aa",     // zinc
};

type Filters = {
  search?: string;
  region?: string;
  departement?: string;
  statutContrat?: "SousContrat" | "HorsContrat" | "Inconnu";
  type?: string;
  hasSiteWeb?: boolean;
  hasEmail?: boolean;
  publicFormiris?: boolean;
  publicOpco?: boolean;
};

export function MapView({ filters }: { filters?: Filters }) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null);
  const [mapReady, setMapReady] = useState(maplibreLoaded);

  const { data: points, isLoading } = trpc.etablissement.mapPoints.useQuery(
    filters ?? {},
    { staleTime: 60_000 }
  );

  // Chargement dynamique de MapLibre (pas de SSR)
  useEffect(() => {
    if (maplibreLoaded) { return; }
    import("maplibre-gl").then((ml) => {
      import("maplibre-gl/dist/maplibre-gl.css").catch(() => {
        // CSS optionnel — peut être ignoré si déjà chargé globalement
      });
      maplibreLoaded = true;
      if (!mapRef.current || mapInstance.current) return;

      mapInstance.current = new ml.Map({
        container: mapRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: [2.5, 48.4], // Centre IDF + Grand Est
        zoom: 6,
      });

      mapInstance.current.on("load", () => setMapReady(true));
    });

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  // Mise à jour des marqueurs quand les points changent
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !points) return;
    const map = mapInstance.current;

    // Supprime la source/layer existante
    if (map.getSource("ecoles")) {
      map.removeLayer("ecoles-circles");
      map.removeLayer("ecoles-clusters");
      map.removeLayer("ecoles-cluster-count");
      map.removeSource("ecoles");
    }

    if (points.length === 0) return;

    const geojson = {
      type: "FeatureCollection" as const,
      features: points.map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.longitude!, p.latitude!] },
        properties: {
          uai: p.uai,
          nom: p.nomEtablissement,
          ville: p.ville,
          statut: p.statutContrat,
          color: COLORS[p.statutContrat as StatutContrat] ?? "#a1a1aa",
        },
      })),
    };

    map.addSource("ecoles", {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterMaxZoom: 12,
      clusterRadius: 40,
    });

    map.addLayer({
      id: "ecoles-clusters",
      type: "circle",
      source: "ecoles",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#3b82f6",
        "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 50, 32],
        "circle-opacity": 0.85,
      },
    });

    map.addLayer({
      id: "ecoles-cluster-count",
      type: "symbol",
      source: "ecoles",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-size": 12,
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      },
      paint: { "text-color": "#ffffff" },
    });

    map.addLayer({
      id: "ecoles-circles",
      type: "circle",
      source: "ecoles",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": 7,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
      },
    });

    // Popup au survol
    let popup: { remove: () => void } | null = null;
    map.on("mouseenter", "ecoles-circles", (e: { features?: Array<{ properties?: Record<string, string> }>; lngLat: { lng: number; lat: number } }) => {
      map.getCanvas().style.cursor = "pointer";
      const props = e.features?.[0]?.properties;
      if (!props) return;
      import("maplibre-gl").then((ml) => {
        popup = new ml.Popup({ offset: 8, closeButton: false })
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .setHTML(`<strong>${props.nom}</strong><br/><span style="color:#71717a">${props.ville}</span>`)
          .addTo(map);
      });
    });
    map.on("mouseleave", "ecoles-circles", () => {
      map.getCanvas().style.cursor = "";
      popup?.remove();
      popup = null;
    });

    // Clic sur un marqueur → navigate vers la fiche
    map.on("click", "ecoles-circles", (e: { features?: Array<{ properties?: Record<string, string> }> }) => {
      const uai = e.features?.[0]?.properties?.uai;
      if (uai) window.location.href = `/etablissements/${uai}`;
    });
  }, [mapReady, points]);

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full rounded-xl" />;
  }

  const geocodedCount = points?.length ?? 0;

  return (
    <div className="relative">
      <div ref={mapRef} className="h-[600px] w-full rounded-xl overflow-hidden border border-zinc-200" />
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-zinc-600 shadow-sm">
        {geocodedCount} établissements affichés
        {geocodedCount === 0 && (
          <span className="block text-amber-600 mt-0.5">
            Aucun établissement géocodé — lancez le géocodage depuis les paramètres
          </span>
        )}
      </div>
      {/* Légende */}
      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-zinc-600 shadow-sm space-y-1">
        {[
          { color: COLORS[StatutContrat.SousContrat], label: "Sous contrat" },
          { color: COLORS[StatutContrat.HorsContrat], label: "Hors contrat" },
          { color: COLORS[StatutContrat.Inconnu], label: "Inconnu" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
