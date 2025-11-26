/**
 * Data Type Service Tests
 * Tests for data type master management (CRUD operations)
 */

import { assertEquals, assertRejects } from "std/assert/mod.ts";
import { DataTypeService } from "@backend/services/DataTypeService.ts";
import { ConflictError, NotFoundError, ValidationError } from "@shared/types/errors.ts";
import { closeConnection, db, sql } from "@backend/models/db.ts";

// Test setup: Clean up test data
async function cleanupTestData() {
  await sql`DELETE FROM data_type_master WHERE data_type_name LIKE 'test_%'`;
}

Deno.test({
  name: "DataTypeService.createDataType - should create a new data type",
  async fn() {
    await cleanupTestData();

    const dataTypeService = new DataTypeService(db);
    const result = await dataTypeService.createDataType({
      dataTypeName: "test_血圧上",
      unit: "mmHg",
      displayOrder: 1,
    });

    assertEquals(result.dataTypeName, "test_血圧上");
    assertEquals(result.unit, "mmHg");
    assertEquals(result.displayOrder, 1);
    assertEquals(result.isActive, true);
    assertEquals(typeof result.dataTypeId, "bigint");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "DataTypeService.createDataType - should reject duplicate data type name",
  async fn() {
    await cleanupTestData();

    const dataTypeService = new DataTypeService(db);

    // Create first data type
    await dataTypeService.createDataType({
      dataTypeName: "test_体重",
      unit: "kg",
      displayOrder: 1,
    });

    // Try to create duplicate
    await assertRejects(
      async () => await dataTypeService.createDataType({
        dataTypeName: "test_体重",
        unit: "kg",
        displayOrder: 2,
      }),
      ConflictError,
      "このデータ種類名は既に登録されています",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "DataTypeService.createDataType - should validate data type name",
  async fn() {
    await cleanupTestData();

    const dataTypeService = new DataTypeService(db);

    // Empty name
    await assertRejects(
      async () => await dataTypeService.createDataType({
        dataTypeName: "",
        unit: "mmHg",
        displayOrder: 1,
      }),
      ValidationError,
      "データ種類名は必須です",
    );

    // Too long name (> 100 characters)
    await assertRejects(
      async () => await dataTypeService.createDataType({
        dataTypeName: "a".repeat(101),
        unit: "mmHg",
        displayOrder: 1,
      }),
      ValidationError,
      "データ種類名は100文字以内である必要があります",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "DataTypeService.createDataType - should validate unit",
  async fn() {
    await cleanupTestData();

    const dataTypeService = new DataTypeService(db);

    // Empty unit
    await assertRejects(
      async () => await dataTypeService.createDataType({
        dataTypeName: "test_脈拍",
        unit: "",
        displayOrder: 1,
      }),
      ValidationError,
      "単位は必須です",
    );

    // Too long unit (> 20 characters)
    await assertRejects(
      async () => await dataTypeService.createDataType({
        dataTypeName: "test_脈拍",
        unit: "a".repeat(21),
        displayOrder: 1,
      }),
      ValidationError,
      "単位は20文字以内である必要があります",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "DataTypeService.getAllActiveDataTypes - should return active data types only",
  async fn() {
    await cleanupTestData();

    const dataTypeService = new DataTypeService(db);

    // Create active data type
    await dataTypeService.createDataType({
      dataTypeName: "test_active",
      unit: "unit1",
      displayOrder: 1,
    });

    // Create and deactivate another data type
    const created = await dataTypeService.createDataType({
      dataTypeName: "test_inactive",
      unit: "unit2",
      displayOrder: 2,
    });
    await dataTypeService.deactivateDataType(created.dataTypeId);

    // Get active data types
    const activeTypes = await dataTypeService.getAllActiveDataTypes();
    const testTypes = activeTypes.filter((dt) => dt.dataTypeName.startsWith("test_"));

    assertEquals(testTypes.length, 1);
    assertEquals(testTypes[0].dataTypeName, "test_active");
    assertEquals(testTypes[0].isActive, true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "DataTypeService.getAllDataTypes - should return all data types including inactive",
  async fn() {
    await cleanupTestData();

    const dataTypeService = new DataTypeService(db);

    // Create active data type
    await dataTypeService.createDataType({
      dataTypeName: "test_type1",
      unit: "unit1",
      displayOrder: 1,
    });

    // Create and deactivate another data type
    const created = await dataTypeService.createDataType({
      dataTypeName: "test_type2",
      unit: "unit2",
      displayOrder: 2,
    });
    await dataTypeService.deactivateDataType(created.dataTypeId);

    // Get all data types
    const allTypes = await dataTypeService.getAllDataTypes();
    const testTypes = allTypes.filter((dt) => dt.dataTypeName.startsWith("test_type"));

    assertEquals(testTypes.length, 2);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "DataTypeService.getDataTypeById - should return data type by ID",
  async fn() {
    await cleanupTestData();

    const dataTypeService = new DataTypeService(db);

    const created = await dataTypeService.createDataType({
      dataTypeName: "test_findById",
      unit: "unit",
      displayOrder: 1,
    });

    const found = await dataTypeService.getDataTypeById(created.dataTypeId);

    assertEquals(found.dataTypeId, created.dataTypeId);
    assertEquals(found.dataTypeName, "test_findById");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "DataTypeService.getDataTypeById - should throw NotFoundError for non-existent ID",
  async fn() {
    const dataTypeService = new DataTypeService(db);

    await assertRejects(
      async () => await dataTypeService.getDataTypeById(BigInt(999999)),
      NotFoundError,
      "データ種類が見つかりません",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "DataTypeService.updateDataType - should update data type",
  async fn() {
    await cleanupTestData();

    const dataTypeService = new DataTypeService(db);

    const created = await dataTypeService.createDataType({
      dataTypeName: "test_update",
      unit: "oldUnit",
      displayOrder: 1,
    });

    const updated = await dataTypeService.updateDataType(created.dataTypeId, {
      dataTypeName: "test_updated",
      unit: "newUnit",
      displayOrder: 2,
    });

    assertEquals(updated.dataTypeId, created.dataTypeId);
    assertEquals(updated.dataTypeName, "test_updated");
    assertEquals(updated.unit, "newUnit");
    assertEquals(updated.displayOrder, 2);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "DataTypeService.updateDataType - should reject duplicate name on update",
  async fn() {
    await cleanupTestData();

    const dataTypeService = new DataTypeService(db);

    // Create two data types
    const first = await dataTypeService.createDataType({
      dataTypeName: "test_first",
      unit: "unit1",
      displayOrder: 1,
    });

    await dataTypeService.createDataType({
      dataTypeName: "test_second",
      unit: "unit2",
      displayOrder: 2,
    });

    // Try to rename first to match second
    await assertRejects(
      async () => await dataTypeService.updateDataType(first.dataTypeId, {
        dataTypeName: "test_second",
      }),
      ConflictError,
      "このデータ種類名は既に登録されています",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "DataTypeService.deactivateDataType - should set isActive to false (logical delete)",
  async fn() {
    await cleanupTestData();

    const dataTypeService = new DataTypeService(db);

    const created = await dataTypeService.createDataType({
      dataTypeName: "test_deactivate",
      unit: "unit",
      displayOrder: 1,
    });

    assertEquals(created.isActive, true);

    await dataTypeService.deactivateDataType(created.dataTypeId);

    const deactivated = await dataTypeService.getDataTypeById(created.dataTypeId);
    assertEquals(deactivated.isActive, false);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "DataTypeService.deactivateDataType - should throw NotFoundError for non-existent ID",
  async fn() {
    const dataTypeService = new DataTypeService(db);

    await assertRejects(
      async () => await dataTypeService.deactivateDataType(BigInt(999999)),
      NotFoundError,
      "データ種類が見つかりません",
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "DataTypeService - data types should be ordered by displayOrder",
  async fn() {
    await cleanupTestData();

    const dataTypeService = new DataTypeService(db);

    // Create data types with different display orders
    await dataTypeService.createDataType({
      dataTypeName: "test_order3",
      unit: "unit",
      displayOrder: 3,
    });

    await dataTypeService.createDataType({
      dataTypeName: "test_order1",
      unit: "unit",
      displayOrder: 1,
    });

    await dataTypeService.createDataType({
      dataTypeName: "test_order2",
      unit: "unit",
      displayOrder: 2,
    });

    const dataTypes = await dataTypeService.getAllActiveDataTypes();
    const testTypes = dataTypes.filter((dt) => dt.dataTypeName.startsWith("test_order"));

    assertEquals(testTypes.length, 3);
    assertEquals(testTypes[0].dataTypeName, "test_order1");
    assertEquals(testTypes[1].dataTypeName, "test_order2");
    assertEquals(testTypes[2].dataTypeName, "test_order3");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// Cleanup
Deno.test({
  name: "Cleanup: Close database connection",
  async fn() {
    await cleanupTestData();
    await closeConnection();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
