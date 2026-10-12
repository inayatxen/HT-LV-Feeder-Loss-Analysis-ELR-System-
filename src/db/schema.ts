import { pgTable, serial, text, timestamp, jsonb, numeric, boolean } from 'drizzle-orm/pg-core';

export const materials = pgTable('materials', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  unit: text('unit').notNull(),
  specification: text('specification'),
  voltageApplicability: text('voltage_applicability'),
  defaultQtyFactor: numeric('default_qty_factor'),
  materialRate: numeric('material_rate').notNull(),
  labourRate: numeric('labour_rate'),
  installationRate: numeric('installation_rate'),
  transportationRate: numeric('transportation_rate'),
  effectiveFrom: text('effective_from'),
  isActive: boolean('is_active').default(true),
});

export const estimates = pgTable('estimates', {
  id: text('id').primaryKey(),
  projectInfo: jsonb('project_info').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  lineDetails: jsonb('line_details').notNull(),
  items: jsonb('items').notNull(),
  charges: jsonb('charges').notNull(),
  auditTrail: jsonb('audit_trail').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
