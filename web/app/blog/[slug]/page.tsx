import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Shell } from "@/components/Shell";
import { PostCard } from "@/components/PostCard";
import { HomeCard, InvestCard } from "@/components/HomeCard";
import { ShareButtons } from "@/components/ShareButtons";
import { prisma } from "@/lib/db";
import { audienceOf } from "@/lib/project";
import { toCards } from "@/lib/cards";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await prisma.blogPost.findUnique({ where: { slug: (await params).slug } });
  return p ? { title: p.title, description: p.excerpt, openGraph: { images: [p.coverUrl], type: "article" } } : { title: "Article" };
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || !post.published) notFound();
  const related = await prisma.project.findMany({ where: { slug: { in: post.relatedSlugs as string[] }, published: true } });
  const relatedCards = await toCards(related);
  const more = await prisma.blogPost.findMany({ where: { published: true, slug: { not: slug } }, orderBy: { publishedAt: "desc" }, take: 2 });
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(post.publishedAt);

  return (
    <Shell banner={false}>
      <article className="pb-12">
        <div className="mx-auto max-w-[1000px] px-0 md:px-6 md:pt-6">
          <div className="relative aspect-video overflow-hidden bg-rs-green-100 md:rounded-2xl">
            <Image src={post.coverUrl} alt="" fill priority sizes="(max-width: 1000px) 100vw, 1000px" className="object-cover" />
          </div>
        </div>
        <div className="mx-auto max-w-[680px] px-6">
          <nav className="mt-6 text-[13px] text-rs-ink/60" aria-label="Breadcrumb"><Link href="/blog" className="hover:text-rs-green-700">Blog</Link> › {post.category}</nav>
          <span className="mt-3 inline-block rounded bg-rs-green-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rs-green-700">{post.category}</span>
          <h1 className="mt-3 text-[28px] leading-[34px] md:text-[36px] md:leading-[44px]">{post.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[14px] text-rs-ink/70">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rs-green-700 text-xs font-semibold text-white" aria-hidden>R</span>
            <span><strong className="text-rs-ink">{post.authorName}</strong> · {post.authorRole}</span>
            <span aria-hidden>·</span><time dateTime={post.publishedAt.toISOString()}>{date}</time>
            <span aria-hidden>·</span><span>{post.readMinutes} min read</span>
          </div>
          <div className="article mt-8">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ href, children }) => (href?.startsWith("/") ? <Link href={href}>{children}</Link> : <a href={href} target="_blank" rel="noreferrer">{children}</a>) }}>{post.bodyMd}</ReactMarkdown>
          </div>
          <div className="mt-8 border-t border-rs-border pt-6"><ShareButtons title={post.title} /></div>
        </div>

        {relatedCards.length > 0 && (
          <section className="container-rs mt-14" aria-labelledby="rel">
            <h2 id="rel" className="text-xl">Related homes</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{relatedCards.slice(0, 2).map((c) => (audienceOf(c.status) === "investor" ? <InvestCard key={c.slug} c={c} /> : <HomeCard key={c.slug} c={c} />))}</div>
          </section>
        )}
        {more.length > 0 && (
          <section className="container-rs mt-14" aria-labelledby="more">
            <h2 id="more" className="text-xl">More from the blog</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{more.map((p) => <PostCard key={p.id} p={p} />)}</div>
          </section>
        )}
      </article>
    </Shell>
  );
}
