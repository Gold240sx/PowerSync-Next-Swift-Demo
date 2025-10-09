// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { index, pgTableCreator, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { AppConfig } from "AppConfig";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator(
	(name) => `${AppConfig.DBprefix}${name}`,
);

export const posts = createTable(
	"post",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		name: d.varchar({ length: 256 }),
		createdAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [index("name_idx").on(t.name)],
);

// Counter schema matching existing database table
export const counters = createTable(
	"counters",
	(d) => ({
		id: d.text().primaryKey(),
		created_at: d
			.timestamp({ withTimezone: true })
			.default(sql`now()`)
			.notNull(),
		count: d.integer().default(0),
		owner_id: d.text(),
	}),
	(t) => [index("counter_owner_idx").on(t.owner_id)],
);
