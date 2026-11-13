-- DropForeignKey
ALTER TABLE "designs" DROP CONSTRAINT "designs_project_id_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_project_id_fkey";

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "area" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "certificate" TEXT NOT NULL DEFAULT 'SHM',
ADD COLUMN     "cover_url" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description_long" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "floorplans" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "nearby" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "photos" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "rooms_spec" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tour_set" TEXT,
ADD COLUMN     "units" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "designs";

-- DropTable
DROP TABLE "rooms";

-- CreateTable
CREATE TABLE "tour_sets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "base_path" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "tour_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "cover_url" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_role" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "read_minutes" INTEGER NOT NULL,
    "body_md" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "related_slugs" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "avatar_url" TEXT NOT NULL DEFAULT '',
    "is_demo" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tour_set_fkey" FOREIGN KEY ("tour_set") REFERENCES "tour_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

