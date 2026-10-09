// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,integer,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const projects=sqliteTable('projects',{id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),settings:text('settings').notNull(),assets:text('assets').notNull().default('{}'),version:integer('version').notNull().default(1),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()},t=>[index('projects_owner_updated').on(t.owner,t.updatedAt)]);
export const assets=sqliteTable('assets',{id:text('id').primaryKey(),projectId:text('project_id').notNull(),owner:text('owner').notNull(),kind:text('kind').notNull(),name:text('name').notNull(),type:text('type').notNull(),size:integer('size').notNull(),objectKey:text('object_key').notNull()},t=>[index('assets_project_owner').on(t.projectId,t.owner)]);

export const accounts=sqliteTable('accounts',{id:text('id').primaryKey(),username:text('username').notNull().unique(),displayName:text('display_name').notNull(),ownerKey:text('owner_key').notNull().unique(),passwordHash:text('password_hash').notNull(),recoveryHash:text('recovery_hash').notNull(),createdAt:integer('created_at').notNull()});
export const accountSessions=sqliteTable('account_sessions',{tokenHash:text('token_hash').primaryKey(),accountId:text('account_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),expiresAt:integer('expires_at').notNull()},t=>[index('account_sessions_expiry').on(t.expiresAt),index('account_sessions_account').on(t.accountId)]);
export const accountLimits=sqliteTable('account_limits',{key:text('key').primaryKey(),hits:integer('hits').notNull(),expiresAt:integer('expires_at').notNull()},t=>[index('account_limits_expiry').on(t.expiresAt)]);

export const presets=sqliteTable('presets',{id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),settings:text('settings').notNull(),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()},t=>[index('presets_owner_updated').on(t.owner,t.updatedAt)]);

export const songs=sqliteTable('songs',{id:text('id').primaryKey(),owner:text('owner').notNull(),hash:text('hash').notNull(),name:text('name').notNull(),type:text('type').notNull(),size:integer('size').notNull(),objectKey:text('object_key').notNull(),createdAt:integer('created_at').notNull()},t=>[uniqueIndex('songs_owner_hash').on(t.owner,t.hash),index('songs_owner_created').on(t.owner,t.createdAt)]);

export const preferences=sqliteTable('preferences',{owner:text('owner').primaryKey(),settings:text('settings').notNull()});

export const galleryPosts=sqliteTable('gallery_posts',{
 id:text('id').primaryKey(),projectId:text('project_id').notNull().unique().references(()=>projects.id,{onDelete:'cascade'}),owner:text('owner').notNull(),author:text('author').notNull(),title:text('title').notNull(),description:text('description').notNull(),settings:text('settings').notNull(),assets:text('assets').notNull(),coverKey:text('cover_key').notNull(),analysisKey:text('analysis_key').notNull(),duration:integer('duration').notNull(),published:integer('published').notNull().default(0),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),revision:text('revision').notNull(),videoKey:text('video_key'),videoToken:text('video_token').unique(),videoSize:integer('video_size')
},t=>[index('gallery_public_created').on(t.published,t.createdAt,t.id),index('gallery_owner_created').on(t.owner,t.createdAt,t.id)]);
