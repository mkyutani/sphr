/**
 * Data Type Seed Data Tests
 * Tests for default data types initialization
 */

import { assertEquals } from "std/assert/mod.ts";
import { seedDefaultDataTypes } from "@backend/models/seed.ts";
import { closeConnection, db, sql } from "@backend/models/db.ts";
import { dataTypeMaster } from "@backend/models/schema.ts";
import { eq } from "https://esm.sh/drizzle-orm@0.29.0";

// Cleanup seed data
async function cleanupSeedData() {
  await sql`DELETE FROM data_type_master WHERE data_type_name IN ('血圧上', '血圧下', '脈拍', '体重')`;
}

Deno.test({
  name: "seedDefaultDataTypes - should create 4 default data types",
  async fn() {
    await cleanupSeedData();

    await seedDefaultDataTypes(db);

    // Verify all 4 default data types exist
    const dataTypes = await db
      .select()
      .from(dataTypeMaster)
      .where(eq(dataTypeMaster.isActive, true));

    const defaultTypes = dataTypes.filter((dt) =>
      ["血圧上", "血圧下", "脈拍", "体重"].includes(dt.dataTypeName)
    );

    assertEquals(defaultTypes.length, 4);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "seedDefaultDataTypes - should create 血圧上 with correct properties",
  async fn() {
    await cleanupSeedData();

    await seedDefaultDataTypes(db);

    const systolic = await db
      .select()
      .from(dataTypeMaster)
      .where(eq(dataTypeMaster.dataTypeName, "血圧上"))
      .limit(1);

    assertEquals(systolic.length, 1);
    assertEquals(systolic[0].dataTypeName, "血圧上");
    assertEquals(systolic[0].unit, "mmHg");
    assertEquals(systolic[0].displayOrder, 1);
    assertEquals(systolic[0].isActive, true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "seedDefaultDataTypes - should create 血圧下 with correct properties",
  async fn() {
    await cleanupSeedData();

    await seedDefaultDataTypes(db);

    const diastolic = await db
      .select()
      .from(dataTypeMaster)
      .where(eq(dataTypeMaster.dataTypeName, "血圧下"))
      .limit(1);

    assertEquals(diastolic.length, 1);
    assertEquals(diastolic[0].dataTypeName, "血圧下");
    assertEquals(diastolic[0].unit, "mmHg");
    assertEquals(diastolic[0].displayOrder, 2);
    assertEquals(diastolic[0].isActive, true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "seedDefaultDataTypes - should create 脈拍 with correct properties",
  async fn() {
    await cleanupSeedData();

    await seedDefaultDataTypes(db);

    const pulse = await db
      .select()
      .from(dataTypeMaster)
      .where(eq(dataTypeMaster.dataTypeName, "脈拍"))
      .limit(1);

    assertEquals(pulse.length, 1);
    assertEquals(pulse[0].dataTypeName, "脈拍");
    assertEquals(pulse[0].unit, "bpm");
    assertEquals(pulse[0].displayOrder, 3);
    assertEquals(pulse[0].isActive, true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "seedDefaultDataTypes - should create 体重 with correct properties",
  async fn() {
    await cleanupSeedData();

    await seedDefaultDataTypes(db);

    const weight = await db
      .select()
      .from(dataTypeMaster)
      .where(eq(dataTypeMaster.dataTypeName, "体重"))
      .limit(1);

    assertEquals(weight.length, 1);
    assertEquals(weight[0].dataTypeName, "体重");
    assertEquals(weight[0].unit, "kg");
    assertEquals(weight[0].displayOrder, 4);
    assertEquals(weight[0].isActive, true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "seedDefaultDataTypes - should be idempotent (not create duplicates)",
  async fn() {
    await cleanupSeedData();

    // Seed twice
    await seedDefaultDataTypes(db);
    await seedDefaultDataTypes(db);

    // Should still have only 4 default types, not 8
    const dataTypes = await db
      .select()
      .from(dataTypeMaster)
      .where(eq(dataTypeMaster.isActive, true));

    const defaultTypes = dataTypes.filter((dt) =>
      ["血圧上", "血圧下", "脈拍", "体重"].includes(dt.dataTypeName)
    );

    assertEquals(defaultTypes.length, 4);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "seedDefaultDataTypes - should maintain display order",
  async fn() {
    await cleanupSeedData();

    await seedDefaultDataTypes(db);

    const dataTypes = await db
      .select()
      .from(dataTypeMaster)
      .where(eq(dataTypeMaster.isActive, true))
      .orderBy(dataTypeMaster.displayOrder);

    const defaultTypes = dataTypes.filter((dt) =>
      ["血圧上", "血圧下", "脈拍", "体重"].includes(dt.dataTypeName)
    );

    assertEquals(defaultTypes[0].dataTypeName, "血圧上");
    assertEquals(defaultTypes[0].displayOrder, 1);
    assertEquals(defaultTypes[1].dataTypeName, "血圧下");
    assertEquals(defaultTypes[1].displayOrder, 2);
    assertEquals(defaultTypes[2].dataTypeName, "脈拍");
    assertEquals(defaultTypes[2].displayOrder, 3);
    assertEquals(defaultTypes[3].dataTypeName, "体重");
    assertEquals(defaultTypes[3].displayOrder, 4);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// Cleanup
Deno.test({
  name: "Cleanup: Close database connection",
  async fn() {
    await cleanupSeedData();
    await closeConnection();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
