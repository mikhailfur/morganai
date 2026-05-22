CREATE TABLE "character_modes" (
	"id" serial PRIMARY KEY NOT NULL,
	"char_id" integer NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"prompt_addon" text,
	"is_nsfw" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"user_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_by" bigint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_links_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "chats" DROP CONSTRAINT "uq_user_char";--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "nsfw_capable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "active_mode_id" integer;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "is_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referral_code" varchar(32);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referral_source" varchar(32);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kyc_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kyc_session_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kyc_nationality" varchar(3);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nsfw_unlocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "blocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "character_modes" ADD CONSTRAINT "character_modes_char_id_characters_id_fk" FOREIGN KEY ("char_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_clicks" ADD CONSTRAINT "referral_clicks_link_id_referral_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."referral_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_clicks" ADD CONSTRAINT "referral_clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_referral_clicks_link" ON "referral_clicks" USING btree ("link_id");--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_active_mode_id_character_modes_id_fk" FOREIGN KEY ("active_mode_id") REFERENCES "public"."character_modes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chats_user_char" ON "chats" USING btree ("user_id","char_id");--> statement-breakpoint
CREATE INDEX "idx_chats_user_active" ON "chats" USING btree ("user_id","is_active");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code");