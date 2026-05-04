"use client";

import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${color ?? "text-zinc-900"}`}>{value}</p>
        {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

const FUNNEL_ORDER = [
  { key: "AContacter", label: "À contacter", color: "#a1a1aa" },
  { key: "Contacte", label: "Contacté", color: "#60a5fa" },
  { key: "Echange", label: "Échange", color: "#818cf8" },
  { key: "RDV", label: "RDV", color: "#a78bfa" },
  { key: "Proposition", label: "Proposition", color: "#fbbf24" },
  { key: "Gagne", label: "Gagné", color: "#34d399" },
  { key: "Perdu", label: "Perdu", color: "#f87171" },
  { key: "Dormant", label: "Dormant", color: "#d4d4d8" },
];

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function DashboardClient() {
  const { data: kpis, isLoading } = trpc.pipeline.kpis.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!kpis) return null;

  const funnelData = FUNNEL_ORDER.map((s) => ({
    ...s,
    count: (kpis.statutCounts as Record<string, number>)[s.key] ?? 0,
  }));

  const weekData = kpis.weekBuckets;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-500">Aperçu de la prospection en cours</p>
      </div>

      {/* KPIs ligne 1 — volume */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Établissements"
          value={kpis.totalEtablissements.toLocaleString("fr-FR")}
          sub="dans la base"
        />
        <KpiCard
          label="Dans le pipeline"
          value={kpis.totalPipeline.toLocaleString("fr-FR")}
          sub={`${Math.round((kpis.totalPipeline / kpis.totalEtablissements) * 100)}% du total`}
        />
        <KpiCard
          label="Emails envoyés"
          value={kpis.emailsEnvoyes}
          sub={`${kpis.reponses} réponse${kpis.reponses !== 1 ? "s" : ""}`}
        />
        <KpiCard
          label="Taux de réponse"
          value={`${kpis.tauxReponse}%`}
          color={kpis.tauxReponse >= 10 ? "text-green-600" : "text-zinc-900"}
        />
      </div>

      {/* KPIs ligne 2 — conversion + CA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Taux RDV"
          value={`${kpis.tauxRdv}%`}
          sub="Contacté → RDV"
          color={kpis.tauxRdv >= 20 ? "text-green-600" : "text-zinc-900"}
        />
        <KpiCard
          label="Taux transfo"
          value={`${kpis.tauxTransfo}%`}
          sub="RDV → Gagné"
          color={kpis.tauxTransfo >= 30 ? "text-green-600" : "text-zinc-900"}
        />
        <KpiCard
          label="CA pondéré"
          value={fmt(kpis.caPondere)}
          sub={`Formiris ${fmt(kpis.caPondereFormiris)} / OPCO ${fmt(kpis.caPondereOpco)}`}
          color="text-blue-700"
        />
        <KpiCard
          label="CA gagné"
          value={fmt(kpis.caGagne)}
          color="text-green-700"
        />
      </div>

      {/* Graphiques */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Funnel pipeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Funnel pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={80} />
                <Tooltip
                  formatter={(v) => [`${v ?? 0} établissements`, ""]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelData.map((s) => (
                    <Cell key={s.key} fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Emails par semaine */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Emails (4 dernières semaines)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weekData} margin={{ left: 8, right: 16 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [`${v ?? 0} email${Number(v) !== 1 ? "s" : ""}`, ""]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Split Formiris / OPCO — CA pondéré */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">CA pondéré — split canal de financement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8 items-end">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Formiris</p>
              <p className="text-3xl font-bold text-blue-700">{fmt(kpis.caPondereFormiris)}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Enseignants sous contrat</p>
            </div>
            <div className="h-10 w-px bg-zinc-200" />
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">OPCO</p>
              <p className="text-3xl font-bold text-violet-700">{fmt(kpis.caPondereOpco)}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Admin / direction + hors contrat</p>
            </div>
            <div className="h-10 w-px bg-zinc-200" />
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Total pondéré</p>
              <p className="text-3xl font-bold text-zinc-800">{fmt(kpis.caPondere)}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Formiris + OPCO (prob.)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
