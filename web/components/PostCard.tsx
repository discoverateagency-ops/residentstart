import Link from "next/link";
import Image from "next/image";
import type { BlogPost } from "@prisma/client";

export function PostCard({ p }: { p: Pick<BlogPost, "slug" | "title" | "excerpt" | "category" | "coverUrl" | "authorName" | "publishedAt" | "readMinutes"> }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-rs-border bg-white">
      <Link href={`/blog/${p.slug}`} className="relative block aspect-video bg-rs-green-100" tabIndex={-1} aria-hidden>
        <Image src={p.coverUrl} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="self-start rounded bg-rs-green-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rs-green-700">{p.category}</span>
        <h3 className="text-[16px] leading-snug line-clamp-2"><Link href={`/blog/${p.slug}`} className="hover:underline">{p.title}</Link></h3>
        <p className="text-[14px] text-rs-ink/70 line-clamp-2">{p.excerpt}</p>
        <div className="mt-auto flex items-center gap-2 pt-2 text-[12px] text-rs-ink/60">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rs-green-700 text-[11px] font-semibold text-white" aria-hidden>R</span>
          <span>{p.authorName}</span><span aria-hidden>·</span>
          <time dateTime={p.publishedAt.toISOString()}>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(p.publishedAt)}</time>
          <span aria-hidden>·</span><span>{p.readMinutes} min read</span>
        </div>
      </div>
    </article>
  );
}
