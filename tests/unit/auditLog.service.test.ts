/**
 * Audit Log Service Tests
 */

import { assertEquals } from "std/assert/mod.ts";
import { AuditLogService, AuditOperation, AuditTargetType } from "@backend/services/AuditLogService.ts";
import { closeConnection, db, sql } from "@backend/models/db.ts";
import { AuthService } from "@backend/services/AuthService.ts";

// Test setup: Create test user
async function setupTestUser() {
  await sql`DELETE FROM users WHERE username = 'auditlog_test'`;
  const authService = new AuthService(db);
  const user = await authService.register("auditlog_test", "TestPassword123!");
  return user.userId;
}

// Cleanup audit logs
async function cleanupAuditLogs(userId: bigint) {
  await sql`DELETE FROM access_log WHERE user_id = ${userId}`;
}

Deno.test({
  name: "AuditLogService.log - should create audit log entry",
  async fn() {
    const userId = await setupTestUser();
    const auditLogService = new AuditLogService(db);

    await auditLogService.log({
      userId,
      operation: AuditOperation.CREATE,
      targetType: AuditTargetType.HEALTH_DATA,
      targetId: BigInt(1),
      ipAddress: "192.168.1.1",
      userAgent: "Test Agent",
    });

    // Verify log was created
    const logs = await sql`
      SELECT * FROM access_log
      WHERE user_id = ${userId}
      AND operation = ${AuditOperation.CREATE}
    `;

    assertEquals(logs.length, 1);
    assertEquals(logs[0].operation, AuditOperation.CREATE);
    assertEquals(logs[0].target_type, AuditTargetType.HEALTH_DATA);
    assertEquals(logs[0].ip_address, "192.168.1.1");

    await cleanupAuditLogs(userId);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AuditLogService.getLogsByUser - should retrieve logs for specific user",
  async fn() {
    const userId = await setupTestUser();
    const auditLogService = new AuditLogService(db);

    // Create multiple log entries
    await auditLogService.log({
      userId,
      operation: AuditOperation.CREATE,
      targetType: AuditTargetType.HEALTH_DATA,
      targetId: BigInt(1),
    });

    await auditLogService.log({
      userId,
      operation: AuditOperation.UPDATE,
      targetType: AuditTargetType.HEALTH_DATA,
      targetId: BigInt(1),
    });

    // Retrieve logs
    const logs = await auditLogService.getLogsByUser(userId);

    assertEquals(logs.length >= 2, true);

    await cleanupAuditLogs(userId);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AuditLogService.getLogsByOperation - should retrieve logs by operation type",
  async fn() {
    const userId = await setupTestUser();
    const auditLogService = new AuditLogService(db);

    // Create DELETE operation log
    await auditLogService.log({
      userId,
      operation: AuditOperation.DELETE,
      targetType: AuditTargetType.HEALTH_DATA,
      targetId: BigInt(1),
    });

    // Retrieve DELETE logs
    const logs = await auditLogService.getLogsByOperation(AuditOperation.DELETE);

    assertEquals(logs.length >= 1, true);
    assertEquals(logs.every((log) => log.operation === AuditOperation.DELETE), true);

    await cleanupAuditLogs(userId);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AuditLogService.getLogsByTarget - should retrieve logs for specific target",
  async fn() {
    const userId = await setupTestUser();
    const auditLogService = new AuditLogService(db);

    const targetId = BigInt(999);

    // Create multiple operations on same target
    await auditLogService.log({
      userId,
      operation: AuditOperation.CREATE,
      targetType: AuditTargetType.HEALTH_DATA,
      targetId,
    });

    await auditLogService.log({
      userId,
      operation: AuditOperation.UPDATE,
      targetType: AuditTargetType.HEALTH_DATA,
      targetId,
    });

    // Retrieve logs for specific target
    const logs = await auditLogService.getLogsByTarget(
      AuditTargetType.HEALTH_DATA,
      targetId,
    );

    assertEquals(logs.length >= 2, true);
    assertEquals(logs.every((log) => log.targetId === targetId), true);

    await cleanupAuditLogs(userId);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "AuditLogService.log - should handle missing optional fields",
  async fn() {
    const userId = await setupTestUser();
    const auditLogService = new AuditLogService(db);

    await auditLogService.log({
      userId,
      operation: AuditOperation.LOGIN,
      targetType: AuditTargetType.USER,
      // No targetId, ipAddress, or userAgent
    });

    const logs = await auditLogService.getLogsByUser(userId);
    const loginLog = logs.find((log) => log.operation === AuditOperation.LOGIN);

    assertEquals(loginLog !== undefined, true);
    assertEquals(loginLog?.targetId, null);

    await cleanupAuditLogs(userId);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// Cleanup
Deno.test({
  name: "Cleanup: Close database connection",
  async fn() {
    await sql`DELETE FROM users WHERE username = 'auditlog_test'`;
    await closeConnection();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
