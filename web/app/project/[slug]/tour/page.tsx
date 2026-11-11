import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getProjectBySlug } from "@/lib/project";
import { TourViewer } from "./TourViewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Virtual tour" };

export default async function TourPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project || !project.published) notFound();
  const rooms = await prisma.room.findMany({ where: { projectId: project.id }, orderBy: { sort: "asc" } });
  return (
    <TourViewer
      projectName={project.name}
      slug={project.slug}
      rooms={rooms.map((r) => ({ key: r.key, name: r.name, panoramaUrl: r.panoramaUrl, initialYaw: r.initialYaw, hotspots: r.hotspots as { yaw: number; pitch: number; target_room_key: string; label: string }[] }))}
    />
  );
}
