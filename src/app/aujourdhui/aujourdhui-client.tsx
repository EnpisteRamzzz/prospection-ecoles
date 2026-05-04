"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Link2, Phone, CheckCircle, PauseCircle, Building2, MapPin, User } from "lucide-react";

const today = new Date();
const todayLabel = today.toLocaleDateString("fr-FR", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

type CanalType = "email" | "linkedin" | "appel" | string;

function CanalBadge({ canal }: { canal: CanalType }) {
  if (canal === "email") {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1">
        <Mail className="size-3" />
        Email
      </Badge>
    );
  }
  if (canal === "linkedin") {
    return (
      <Badge className="bg-purple-100 text-purple-700 border-purple-200 gap-1">
        <Link2 className="size-3" />
        LinkedIn
      </Badge>
    );
  }
  if (canal === "appel") {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
        <Phone className="size-3" />
        Appel
      </Badge>
    );
  }
  return <Badge>{canal}</Badge>;
}

interface StepInfo {
  jour: number;
  canal: string;
  templateSlug: string;
  description?: string;
}

export function AujourdhuiClient() {
  const utils = trpc.useUtils();
  const { data: actions, isLoading } = trpc.sequence.todayActions.useQuery();

  const exitEnrollment = trpc.sequence.exitEnrollment.useMutation({
    onSuccess: () => utils.sequence.todayActions.invalidate(),
  });

  const pauseEnrollment = trpc.sequence.pauseEnrollment.useMutation({
    onSuccess: () => utils.sequence.todayActions.invalidate(),
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Actions du jour</h1>
        <p className="text-muted-foreground capitalize">{todayLabel}</p>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && actions && actions.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
          <span className="text-4xl">🎉</span>
          <p className="text-lg font-medium">Aucune action prévue aujourd&apos;hui</p>
          <p className="text-sm">Toutes les séquences sont à jour.</p>
        </div>
      )}

      {!isLoading && actions && actions.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {actions.length} action{actions.length > 1 ? "s" : ""} en attente
          </p>
          {actions.map((action) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const steps = (action as any).sequence.steps as StepInfo[];
            const step = steps[action.currentStep];

            return (
              <Card key={action.id} className="border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-base font-semibold leading-tight">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="size-4 shrink-0 text-muted-foreground" />
                        {action.etablissement.nomEtablissement}
                      </span>
                    </CardTitle>
                    {step && <CanalBadge canal={step.canal} />}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {action.etablissement.ville && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {action.etablissement.ville}
                      </span>
                    )}
                    {action.contact && (
                      <span className="flex items-center gap-1">
                        <User className="size-3.5" />
                        {[action.contact.prenom, action.contact.nom].filter(Boolean).join(" ")}
                      </span>
                    )}
                  </div>

                  <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                    <span className="font-medium">{action.sequence.nom}</span>
                    {step && (
                      <span className="text-muted-foreground">
                        {" "}— J+{step.jour}{" "}
                        {step.description ? `— ${step.description}` : ""}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1.5"
                      disabled={exitEnrollment.isPending}
                      onClick={() =>
                        exitEnrollment.mutate({
                          enrollmentId: action.id,
                          exitReason: "done",
                        })
                      }
                    >
                      <CheckCircle className="size-3.5" />
                      Marquer fait
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={pauseEnrollment.isPending}
                      onClick={() =>
                        pauseEnrollment.mutate({ enrollmentId: action.id })
                      }
                    >
                      <PauseCircle className="size-3.5" />
                      Pause
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
