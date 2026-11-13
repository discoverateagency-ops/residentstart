import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { ProjectDetail } from "@/components/ProjectDetail";
import { loadDetail } from "@/lib/detail";
import { getProjectBySlug } from "@/lib/project";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProjectBySlug((await params).slug);
  return p ? { title: p.name, description: p.description, openGraph: { images: [p.coverUrl] } } : { title: "Home" };
}

export default async function BuyDetail({ params }: { params: Promise<{ slug: string }> }) {
  const d = await loadDetail((await params).slug);
  if (!d) notFound();
  if (d.aud === "investor") redirect(`/invest/${d.p.slug}`);
  return <Shell banner><ProjectDetail p={d.p} similar={d.similar} /></Shell>;
}
