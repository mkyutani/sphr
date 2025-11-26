/**
 * Analysis Service
 * Handles statistical analysis and graph data generation
 */

import type { PostgresJsDatabase } from "https://esm.sh/drizzle-orm@0.29.0/postgres-js";
import { eq, and, gte, lte, asc, sql as drizzleSql } from "https://esm.sh/drizzle-orm@0.29.0";
import { healthData, dataTypeMaster } from "@backend/models/schema.ts";
import { createLogger } from "@backend/utils/logger.ts";

const logger = createLogger("AnalysisService");

/**
 * Analysis filters
 */
export interface AnalysisFilters {
  dataTypeId: bigint;
  startDate: Date;
  endDate: Date;
}

/**
 * Moving average filters
 */
export interface MovingAverageFilters extends AnalysisFilters {
  window?: number; // Window size in days (default: 30)
}

/**
 * Compare data types filters
 */
export interface CompareDataTypesFilters {
  dataTypeIds: bigint[];
  startDate: Date;
  endDate: Date;
}

/**
 * Statistics result
 */
export interface StatisticsResult {
  dataTypeId: bigint;
  dataTypeName: string;
  unit: string;
  max: string | null;
  min: string | null;
  avg: string | null;
  count: number;
  startDate: string;
  endDate: string;
}

/**
 * Graph data point
 */
export interface GraphDataPoint {
  date: string;
  value: string;
}

/**
 * Graph data result
 */
export interface GraphDataResult {
  dataTypeId: bigint;
  dataTypeName: string;
  unit: string;
  data: GraphDataPoint[];
}

/**
 * Moving average data point
 */
export interface MovingAverageDataPoint {
  date: string;
  value: string;
  movingAverage: string | null;
}

/**
 * Moving average result
 */
export interface MovingAverageResult {
  dataTypeId: bigint;
  dataTypeName: string;
  unit: string;
  window: number;
  data: MovingAverageDataPoint[];
}

/**
 * Analysis Service
 */
export class AnalysisService {
  constructor(private db: PostgresJsDatabase) {}

  /**
   * Get statistics (max, min, average)
   */
  async getStatistics(userId: bigint, filters: AnalysisFilters): Promise<StatisticsResult> {
    logger.info("Getting statistics", {
      userId: userId.toString(),
      dataTypeId: filters.dataTypeId.toString(),
    });

    const startDateStr = filters.startDate.toISOString().split("T")[0];
    const endDateStr = filters.endDate.toISOString().split("T")[0];

    // Get data type information
    const dataType = await this.db
      .select()
      .from(dataTypeMaster)
      .where(eq(dataTypeMaster.dataTypeId, filters.dataTypeId))
      .limit(1);

    const dataTypeName = dataType[0]?.dataTypeName || "";
    const unit = dataType[0]?.unit || "";

    // Calculate statistics using SQL aggregation
    const result = await this.db
      .select({
        max: drizzleSql<string>`MAX(${healthData.value})`,
        min: drizzleSql<string>`MIN(${healthData.value})`,
        avg: drizzleSql<string>`ROUND(AVG(${healthData.value}::numeric), 2)`,
        count: drizzleSql<number>`COUNT(*)`,
      })
      .from(healthData)
      .where(
        and(
          eq(healthData.userId, userId),
          eq(healthData.dataTypeId, filters.dataTypeId),
          gte(healthData.measurementDate, startDateStr),
          lte(healthData.measurementDate, endDateStr),
        ),
      );

    const stats = result[0];

    return {
      dataTypeId: filters.dataTypeId,
      dataTypeName,
      unit,
      max: stats.max,
      min: stats.min,
      avg: stats.avg,
      count: stats.count,
      startDate: startDateStr,
      endDate: endDateStr,
    };
  }

  /**
   * Get graph data (time series)
   */
  async getGraphData(userId: bigint, filters: AnalysisFilters): Promise<GraphDataResult> {
    logger.info("Getting graph data", {
      userId: userId.toString(),
      dataTypeId: filters.dataTypeId.toString(),
    });

    const startDateStr = filters.startDate.toISOString().split("T")[0];
    const endDateStr = filters.endDate.toISOString().split("T")[0];

    // Get data type information
    const dataType = await this.db
      .select()
      .from(dataTypeMaster)
      .where(eq(dataTypeMaster.dataTypeId, filters.dataTypeId))
      .limit(1);

    const dataTypeName = dataType[0]?.dataTypeName || "";
    const unit = dataType[0]?.unit || "";

    // Get time series data
    const result = await this.db
      .select({
        date: healthData.measurementDate,
        value: healthData.value,
      })
      .from(healthData)
      .where(
        and(
          eq(healthData.userId, userId),
          eq(healthData.dataTypeId, filters.dataTypeId),
          gte(healthData.measurementDate, startDateStr),
          lte(healthData.measurementDate, endDateStr),
        ),
      )
      .orderBy(asc(healthData.measurementDate));

    return {
      dataTypeId: filters.dataTypeId,
      dataTypeName,
      unit,
      data: result.map((row) => ({
        date: row.date,
        value: row.value,
      })),
    };
  }

  /**
   * Get moving average
   */
  async getMovingAverage(
    userId: bigint,
    filters: MovingAverageFilters,
  ): Promise<MovingAverageResult> {
    logger.info("Getting moving average", {
      userId: userId.toString(),
      dataTypeId: filters.dataTypeId.toString(),
      window: filters.window ?? 30,
    });

    const window = filters.window ?? 30;
    const startDateStr = filters.startDate.toISOString().split("T")[0];
    const endDateStr = filters.endDate.toISOString().split("T")[0];

    // Get data type information
    const dataType = await this.db
      .select()
      .from(dataTypeMaster)
      .where(eq(dataTypeMaster.dataTypeId, filters.dataTypeId))
      .limit(1);

    const dataTypeName = dataType[0]?.dataTypeName || "";
    const unit = dataType[0]?.unit || "";

    // Calculate moving average using PostgreSQL window function
    const result = await this.db.execute(drizzleSql`
      SELECT
        measurement_date::text as date,
        value,
        ROUND(
          AVG(value::numeric) OVER (
            ORDER BY measurement_date
            ROWS BETWEEN ${window - 1} PRECEDING AND CURRENT ROW
          ),
          2
        ) as moving_average,
        COUNT(*) OVER (
          ORDER BY measurement_date
          ROWS BETWEEN ${window - 1} PRECEDING AND CURRENT ROW
        ) as window_count
      FROM health_data
      WHERE user_id = ${userId}
        AND data_type_id = ${filters.dataTypeId}
        AND measurement_date >= ${startDateStr}
        AND measurement_date <= ${endDateStr}
      ORDER BY measurement_date
    `);

    return {
      dataTypeId: filters.dataTypeId,
      dataTypeName,
      unit,
      window,
      data: result.rows.map((row: {
        date: string;
        value: string;
        moving_average: string;
        window_count: number;
      }) => ({
        date: row.date,
        value: row.value,
        movingAverage: row.window_count >= window ? row.moving_average : null,
      })),
    };
  }

  /**
   * Compare multiple data types
   */
  async compareDataTypes(
    userId: bigint,
    filters: CompareDataTypesFilters,
  ): Promise<GraphDataResult[]> {
    logger.info("Comparing data types", {
      userId: userId.toString(),
      dataTypeIds: filters.dataTypeIds.map((id) => id.toString()),
    });

    const results: GraphDataResult[] = [];

    for (const dataTypeId of filters.dataTypeIds) {
      const graphData = await this.getGraphData(userId, {
        dataTypeId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      results.push(graphData);
    }

    return results;
  }
}
