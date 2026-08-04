CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"section" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
