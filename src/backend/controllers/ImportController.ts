/**
 * Import Controller
 * Handles HTTP requests for data import operations
 */

import type { Context } from "hono";
import { ImportService } from "@backend/services/ImportService.ts";
import { db } from "@backend/models/db.ts";
import { createLogger } from "@backend/utils/logger.ts";
import { getAuthenticatedUser } from "@backend/middlewares/basicAuth.ts";

const logger = createLogger("ImportController");

/**
 * Import Controller
 */
export class ImportController {
  private importService: ImportService;

  constructor() {
    this.importService = new ImportService(db);
  }

  /**
   * POST /api/import
   * Import health data from CSV
   */
  async importData(c: Context) {
    const user = getAuthenticatedUser(c);

    logger.info("Import data request", { userId: user.userId.toString() });

    try {
      // Get uploaded file
      const body = await c.req.parseBody();
      const file = body["file"];

      if (!file || typeof file === "string") {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "CSVファイルをアップロードしてください",
            },
          },
          400,
        );
      }

      // Read file content
      let csvData: string;
      if (file instanceof File) {
        csvData = await file.text();
      } else {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "無効なファイル形式です",
            },
          },
          400,
        );
      }

      // Validate file is not empty
      if (!csvData || csvData.trim().length === 0) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "CSVファイルが空です",
            },
          },
          400,
        );
      }

      // Import data
      const result = await this.importService.importHealthData(user.userId, csvData);

      // Return result
      return c.json({
        success: result.success,
        data: {
          successCount: result.successCount,
          failureCount: result.failureCount,
          errors: result.errors,
          message: result.success
            ? `${result.successCount}件のデータをインポートしました`
            : `${result.successCount}件成功、${result.failureCount}件失敗しました`,
        },
      });
    } catch (error) {
      logger.error("Import failed", { error });

      return c.json(
        {
          success: false,
          error: {
            code: "IMPORT_ERROR",
            message: error instanceof Error ? error.message : "データのインポートに失敗しました",
          },
        },
        400,
      );
    }
  }
}
