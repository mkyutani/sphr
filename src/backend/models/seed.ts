/**
 * Database Seed Functions
 * Handles initialization of default data
 */

import type { PostgresJsDatabase } from "https://esm.sh/drizzle-orm@0.29.0/postgres-js";
import { eq } from "https://esm.sh/drizzle-orm@0.29.0";
import { dataTypeMaster } from "@backend/models/schema.ts";
import { createLogger } from "@backend/utils/logger.ts";

const logger = createLogger("Seed");

/**
 * Default data types definition
 * Based on requirements 4.7: デフォルトデータ種類（血圧上、血圧下、脈拍、体重）
 */
const DEFAULT_DATA_TYPES = [
  {
    dataTypeName: "血圧上",
    unit: "mmHg",
    displayOrder: 1,
  },
  {
    dataTypeName: "血圧下",
    unit: "mmHg",
    displayOrder: 2,
  },
  {
    dataTypeName: "脈拍",
    unit: "bpm",
    displayOrder: 3,
  },
  {
    dataTypeName: "体重",
    unit: "kg",
    displayOrder: 4,
  },
];

/**
 * Seed default data types
 * Idempotent - will not create duplicates
 */
export async function seedDefaultDataTypes(db: PostgresJsDatabase): Promise<void> {
  logger.info("Seeding default data types...");

  for (const dataType of DEFAULT_DATA_TYPES) {
    // Check if data type already exists
    const existing = await db
      .select()
      .from(dataTypeMaster)
      .where(eq(dataTypeMaster.dataTypeName, dataType.dataTypeName))
      .limit(1);

    if (existing.length > 0) {
      logger.debug(`Data type already exists: ${dataType.dataTypeName}`);
      continue;
    }

    // Insert new data type
    await db.insert(dataTypeMaster).values({
      dataTypeName: dataType.dataTypeName,
      unit: dataType.unit,
      displayOrder: dataType.displayOrder,
      isActive: true,
    });

    logger.info(`Created default data type: ${dataType.dataTypeName}`);
  }

  logger.info("Default data types seeding completed");
}

/**
 * Seed all default data
 */
export async function seedAll(db: PostgresJsDatabase): Promise<void> {
  logger.info("Starting database seeding...");

  await seedDefaultDataTypes(db);

  logger.info("Database seeding completed");
}
