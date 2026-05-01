import { z } from "zod";

export const categorySchema = z.enum(["weapon", "picto", "status_effect", "item"]);

export const sourceSchema = z.object({
  url: z.string().url(),
  scraped_at: z.string(),
});

export const statBonusSchema = z.object({
  stat: z.string(),
  value: z.number().nullable(),
});

export const weaponSummarySchema = z.object({
  level: z.number().nullable(),
  power: z.number().nullable(),
  element: z.string().nullable(),
  scaling: z.array(
    z.object({
      stat: z.string(),
      grade: z.string(),
    }),
  ),
});

export const weaponEffectSchema = z.object({
  level: z.number(),
  effect: z.string(),
});

export const weaponUpgradeLevelSchema = z.object({
  level: z.number(),
  power: z.number().nullable(),
  scaling: z.array(
    z.object({
      stat: z.string(),
      grade: z.string(),
    }),
  ),
  required_tint: z
    .object({
      quantity: z.number(),
      item_name: z.string(),
      item_id: z.string(),
      wiki_url: z.string().url(),
      image_url: z.string().url().nullable(),
    })
    .nullable(),
});

export const baseEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  category: categorySchema,
  description: z.string().nullable(),
  image_url: z.string().url().nullable(),
  source: sourceSchema,
  tags: z.array(z.string()).default([]),
});

export const weaponSchema = baseEntrySchema.extend({
  category: z.literal("weapon"),
  wielders: z.array(z.string()).default([]),
  element: z.string().nullable(),
  scaling_attributes: z.array(z.string()).default([]),
  obtain_locations: z.array(z.string()).default([]),
  weapon_summary: weaponSummarySchema.nullable().default(null),
  weapon_effects: z.array(weaponEffectSchema).default([]),
  upgrade_levels: z.array(weaponUpgradeLevelSchema).default([]),
  raw_upgrade_table: z.array(z.array(z.string())).default([]),
  raw_weapon_effects_table: z.array(z.array(z.string())).default([]),
});

export const pictoSchema = baseEntrySchema.extend({
  category: z.literal("picto"),
  lumina_cost: z.number().nullable(),
  lumina_effect: z.string().nullable(),
  passive_bonuses: z.array(statBonusSchema).default([]),
  obtain_locations: z.array(z.string()).default([]),
});

export const statusEffectSchema = baseEntrySchema.extend({
  category: z.literal("status_effect"),
  effect_kind: z.enum(["buff", "debuff", "neutral"]).nullable(),
  effect_summary: z.string().nullable(),
  can_stack: z.boolean().nullable(),
  related_skills: z.array(z.string()).default([]),
  related_pictos: z.array(z.string()).default([]),
});

export const itemSchema = baseEntrySchema.extend({
  category: z.literal("item"),
  subtype: z.enum([
    "tint",
    "upgrade_material",
    "consumable",
    "music_record",
    "expedition_journal",
    "quest_item",
    "unknown",
  ]),
  usage: z.string().nullable(),
  obtain_locations: z.array(z.string()).default([]),
});

export const databaseSchema = z.object({
  metadata: z.object({
    generated_at: z.string(),
    totals: z.object({
      weapons: z.number(),
      pictos: z.number(),
      status_effects: z.number(),
      items: z.number(),
    }),
    warnings: z.array(z.string()),
  }),
  weapons: z.array(weaponSchema),
  pictos: z.array(pictoSchema),
  status_effects: z.array(statusEffectSchema),
  items: z.array(itemSchema),
});

export type Weapon = z.infer<typeof weaponSchema>;
export type Picto = z.infer<typeof pictoSchema>;
export type StatusEffect = z.infer<typeof statusEffectSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Database = z.infer<typeof databaseSchema>;
