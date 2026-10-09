// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const projects=sqliteTable('projects',{id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),settings:text('settings').notNull(),assets:text('assets').notNull().default('{}'),version:integer('version').notNull().default(1),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()},t=>[index('projects_owner_updated').on(t.owner,t.updatedAt)]);
export const assets=sqliteTable('assets',{id:text('id').primaryKey(),projectId:text('project_id').notNull(),owner:text('owner').notNull(),kind:text('kind').notNull(),name:text('name').notNull(),type:text('type').notNull(),size:integer('size').notNull(),objectKey:text('object_key').notNull()},t=>[index('assets_project_owner').on(t.projectId,t.owner)]);
