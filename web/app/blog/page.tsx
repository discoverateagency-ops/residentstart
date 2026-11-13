import { Shell } from "@/components/Shell";
import { PostCard } from "@/components/PostCard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog", description: "Property, financing and the DAO, explained." };

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" } });
  return (
    <Shell banner={false}>
      <div className="border-b border-rs-border">
        <div className="container-rs py-6">
          <h1 className="text-[28px] leading-[34px] md:text-[32px] md:leading-[40px]">Blog</h1>
          <p className="mt-1 text-[15px] text-rs-ink/70">Property, financing and the DAO, explained.</p>
        </div>
      </div>
      <div className="container-rs py-8">
        {posts.length === 0 ? <p className="text-rs-ink/60">No articles yet.</p> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{posts.map((p) => <PostCard key={p.id} p={p} />)}</div>}
      </div>
    </Shell>
  );
}
