// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const projects=sqliteTable('projects',{id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),settings:text('settings').notNull(),assets:text('assets').notNull().default('{}'),version:integer('version').notNull().default(1),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()},t=>[index('projects_owner_updated').on(t.owner,t.updatedAt)]);
export const assets=sqliteTable('assets',{id:text('id').primaryKey(),projectId:text('project_id').notNull(),owner:text('owner').notNull(),kind:text('kind').notNull(),name:text('name').notNull(),type:text('type').notNull(),size:integer('size').notNull(),objectKey:text('object_key').notNull()},t=>[index('assets_project_owner').on(t.projectId,t.owner)]);

export const accounts=sqliteTable('accounts',{id:text('id').primaryKey(),username:text('username').notNull().unique(),displayName:text('display_name').notNull(),ownerKey:text('owner_key').notNull().unique(),passwordHash:text('password_hash').notNull(),recoveryHash:text('recovery_hash').notNull(),createdAt:integer('created_at').notNull()});
export const accountSessions=sqliteTable('account_sessions',{tokenHash:text('token_hash').primaryKey(),accountId:text('account_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),expiresAt:integer('expires_at').notNull()},t=>[index('account_sessions_expiry').on(t.expiresAt),index('account_sessions_account').on(t.accountId)]);
export const accountLimits=sqliteTable('account_limits',{key:text('key').primaryKey(),hits:integer('hits').notNull(),expiresAt:integer('expires_at').notNull()},t=>[index('account_limits_expiry').on(t.expiresAt)]);
