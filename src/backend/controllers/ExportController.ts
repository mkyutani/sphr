/**
 * Export Controller
 * Handles HTTP requests for data export operations
 */

import type { Context } from "hono";
import { ExportService } from "@backend/services/ExportService.ts";
import { db } from "@backend/models/db.ts";
import { createLogger } from "@backend/utils/logger.ts";
import { getAuthenticatedUser } from "@backend/middlewares/basicAuth.ts";

const logger = createLogger("ExportController");

/**
 * Export Controller
 */
export class ExportController {
  private exportService: ExportService;

  constructor() {
    this.exportService = new ExportService(db);
  }

  /**
   * POST /api/export
   * Export health data in specified format
   */
  async exportData(c: Context) {
    const user = getAuthenticatedUser(c);
    const body = await c.req.json();
    const { format, startDate, endDate, dataTypeId } = body;

    logger.info("Export data request", {
      userId: user.userId.toString(),
      format,
    });

    // Validate required parameters
    if (!format || !startDate || !endDate) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "形式、開始日、終了日は必須です",
          },
        },
        400,
      );
    }

    // Validate format
    if (format !== "csv" && format !== "pdf") {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "形式はcsvまたはpdfである必要があります",
          },
        },
        400,
      );
    }

    // Parse dates
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    // Validate dates
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "有効な日付を指定してください",
          },
        },
        400,
      );
    }

    if (parsedStartDate > parsedEndDate) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "開始日は終了日より前である必要があります",
          },
        },
        400,
      );
    }

    try {
      // Generate export data
      let data: string | Uint8Array;
      let contentType: string;
      let filename: string;

      if (format === "csv") {
        data = await this.exportService.generateCSV(user.userId, {
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          dataTypeId: dataTypeId ? BigInt(dataTypeId) : undefined,
        });
        contentType = "text/csv; charset=utf-8";
        filename = `health_data_${parsedStartDate.toISOString().split("T")[0]}_${
          parsedEndDate.toISOString().split("T")[0]
        }.csv`;
      } else {
        // PDF
        data = await this.exportService.generatePDF(user.userId, {
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          dataTypeId: dataTypeId ? BigInt(dataTypeId) : undefined,
        });
        contentType = "application/pdf";
        filename = `health_data_${parsedStartDate.toISOString().split("T")[0]}_${
          parsedEndDate.toISOString().split("T")[0]
        }.pdf`;
      }

      // Record export log
      await this.exportService.recordExportLog(user.userId, {
        format,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        dataTypeId: dataTypeId ? BigInt(dataTypeId) : undefined,
      });

      // Return file
      return c.body(data, 200, {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      });
    } catch (error) {
      logger.error("Export failed", { error });
      return c.json(
        {
          success: false,
          error: {
            code: "EXPORT_ERROR",
            message: "データの出力に失敗しました",
          },
        },
        500,
      );
    }
  }

  /**
   * GET /api/export/history
   * Get export history
   */
  async getHistory(c: Context) {
    const user = getAuthenticatedUser(c);

    const limit = c.req.query("limit");
    const offset = c.req.query("offset");

    logger.info("Get export history request", {
      userId: user.userId.toString(),
    });

    const history = await this.exportService.getExportHistory(user.userId, {
      limit: limit ? Number(limit) : 30,
      offset: offset ? Number(offset) : 0,
    });

    return c.json({
      success: true,
      data: history.map((item) => ({
        exportLogId: item.exportLogId.toString(),
        format: item.format,
        startDate: item.startDate,
        endDate: item.endDate,
        exportedAt: item.exportedAt,
      })),
    });
  }
}
