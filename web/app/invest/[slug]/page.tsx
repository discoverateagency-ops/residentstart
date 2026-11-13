import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { ProjectDetail } from "@/components/ProjectDetail";
import { loadDetail } from "@/lib/detail";
import { getProjectBySlug } from "@/lib/project";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProjectBySlug((await params).slug);
  return p ? { title: `${p.name} · funding`, description: p.description, openGraph: { images: [p.coverUrl] } } : { title: "Project" };
}

export default async function InvestDetail({ params }: { params: Promise<{ slug: string }> }) {
  const d = await loadDetail((await params).slug);
  if (!d) notFound();
  if (d.aud === "buyer") redirect(`/buy/${d.p.slug}`);
  return <Shell banner><ProjectDetail p={d.p} similar={d.similar} funding={d.funding} /></Shell>;
}
