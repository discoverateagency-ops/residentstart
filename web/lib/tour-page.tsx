import { notFound, redirect } from "next/navigation";
import { TourWalkthrough, type TourConfig } from "@/components/TourWalkthrough";
import { audienceOf, getProjectBySlug, projectHref, tourLabel } from "./project";

export async function TourPage({ slug, expect }: { slug: string; expect: "buyer" | "investor" }) {
  const p = await getProjectBySlug(slug);
  if (!p || !p.published || !p.tourSet) notFound();
  if (audienceOf(p.status) !== expect) redirect(`${projectHref(p)}/tour`);
  return <TourWalkthrough basePath={p.tourSet.basePath} config={p.tourSet.config as TourConfig} projectName={p.name} label={tourLabel(p, p.tourSet)} backHref={projectHref(p)} />;
}
