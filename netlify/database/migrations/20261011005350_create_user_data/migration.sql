CREATE TABLE "user_data" (
	"user_id" text,
	"key" text,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_data_pkey" PRIMARY KEY("user_id","key")
);
