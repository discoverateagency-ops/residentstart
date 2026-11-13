import { TourPage } from "@/lib/tour-page";
export const dynamic = "force-dynamic";
export const metadata = { title: "Photo walkthrough" };
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <TourPage slug={(await params).slug} expect="buyer" />;
}
