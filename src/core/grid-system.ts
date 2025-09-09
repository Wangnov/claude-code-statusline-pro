/**
 * 网格布局系统 | Grid layout system
 * 管理多行多列的状态栏布局 | Manages multi-row multi-column statusline layout
 *
 * 设计原则：简单直接，性能优先，错误处理清晰
 */

import type { MultilineConfig, MultilineRowConfig } from '../config/schema.js';

/**
 * 网格单元格 | Grid cell
 */
export interface GridCell {
  /** 行位置 | Row position */
  row: number;
  /** 列位置 | Column position */
  col: number;
  /** 单元格内容 | Cell content */
  content: string;
  /** 优先级（用于排序）| Priority (for sorting) */
  priority?: number;
}

/**
 * 网格行数据 | Grid row data
 */
interface GridRow {
  /** 行号 | Row number */
  rowNumber: number;
  /** 行内所有单元格 | All cells in row */
  cells: GridCell[];
  /** 行配置 | Row configuration */
  config: MultilineRowConfig;
}

/**
 * 网格渲染结果 | Grid rendering result
 */
export interface GridRenderResult {
  /** 渲染成功 | Render success */
  success: boolean;
  /** 渲染后的行数组 | Rendered lines array */
  lines: string[];
  /** 错误信息 | Error message */
  error?: string;
}

/**
 * 网格系统类 | Grid system class
 */
export class GridSystem {
  private cells = new Map<string, GridCell>();
  private multilineConfig: MultilineConfig;

  constructor(multilineConfig: MultilineConfig) {
    this.multilineConfig = multilineConfig;
  }

  /**
   * 设置单元格内容 | Set cell content
   */
  setCell(row: number, col: number, content: string, priority = 0): void {
    // 验证参数 | Validate parameters
    if (row < 1) {
      throw new Error(`行号必须大于0: ${row}`);
    }
    if (col < 0) {
      throw new Error(`列号必须大于等于0: ${col}`);
    }
    if (row > this.multilineConfig.max_rows) {
      throw new Error(`行号超过最大限制 ${this.multilineConfig.max_rows}: ${row}`);
    }

    // 忽略空内容 | Ignore empty content
    if (!content || !content.trim()) {
      return;
    }

    const key = this.getCellKey(row, col);
    this.cells.set(key, {
      row,
      col,
      content: content.trim(),
      priority,
    });
  }

  /**
   * 获取单元格内容 | Get cell content
   */
  getCell(row: number, col: number): string | null {
    const key = this.getCellKey(row, col);
    const cell = this.cells.get(key);
    return cell?.content || null;
  }

  /**
   * 清空网格 | Clear grid
   */
  clear(): void {
    this.cells.clear();
  }

  /**
   * 获取所有非空行号 | Get all non-empty row numbers
   */
  getNonEmptyRows(): number[] {
    const rows = new Set<number>();
    for (const cell of this.cells.values()) {
      rows.add(cell.row);
    }
    return Array.from(rows).sort((a, b) => a - b);
  }

  /**
   * 渲染网格为字符串数组 | Render grid to string array
   */
  render(): GridRenderResult {
    try {
      const lines: string[] = [];
      const nonEmptyRows = this.getNonEmptyRows();

      for (const rowNumber of nonEmptyRows) {
        const rowData = this.buildRowData(rowNumber);
        if (rowData.cells.length === 0) continue;

        const renderedLine = this.renderRow(rowData);
        if (renderedLine) {
          lines.push(renderedLine);
        }
      }

      return {
        success: true,
        lines,
      };
    } catch (error) {
      return {
        success: false,
        lines: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 获取网格统计信息 | Get grid statistics
   */
  getStats(): {
    totalCells: number;
    occupiedRows: number;
    maxCellsPerRow: number;
  } {
    const rowCellCounts = new Map<number, number>();

    for (const cell of this.cells.values()) {
      const currentCount = rowCellCounts.get(cell.row) || 0;
      rowCellCounts.set(cell.row, currentCount + 1);
    }

    return {
      totalCells: this.cells.size,
      occupiedRows: rowCellCounts.size,
      maxCellsPerRow: Math.max(...Array.from(rowCellCounts.values()), 0),
    };
  }

  /**
   * 生成单元格键 | Generate cell key
   */
  private getCellKey(row: number, col: number): string {
    return `${row}:${col}`;
  }

  /**
   * 构建行数据 | Build row data
   */
  private buildRowData(rowNumber: number): GridRow {
    // 收集该行的所有单元格 | Collect all cells in this row
    const rowCells: GridCell[] = [];

    for (const cell of this.cells.values()) {
      if (cell.row === rowNumber) {
        rowCells.push(cell);
      }
    }

    // 按列号排序（主要）和优先级排序（次要）| Sort by column number (primary) and priority (secondary)
    rowCells.sort((a, b) => {
      if (a.col !== b.col) {
        return a.col - b.col;
      }
      return (b.priority || 0) - (a.priority || 0);
    });

    // 获取行配置 | Get row configuration
    const config = this.getRowConfig(rowNumber);

    return {
      rowNumber,
      cells: rowCells,
      config,
    };
  }

  /**
   * 获取行配置 | Get row configuration
   */
  private getRowConfig(rowNumber: number): MultilineRowConfig {
    const rowKey = `row${rowNumber}`;
    const rowConfig = this.multilineConfig.rows?.[rowKey];

    // 如果没有特定配置，使用默认值 | If no specific config, use defaults
    if (!rowConfig) {
      return {
        separator: ' | ',
        max_width: 120,
      };
    }

    return rowConfig;
  }

  /**
   * 渲染单行 | Render single row
   */
  private renderRow(rowData: GridRow): string | null {
    if (rowData.cells.length === 0) {
      return null;
    }

    // 提取单元格内容 | Extract cell contents
    const cellContents = rowData.cells.map((cell) => cell.content);

    // 用分隔符连接 | Join with separator
    const joined = cellContents.join(rowData.config.separator);

    // 检查长度限制 | Check length limit
    if (joined.length > rowData.config.max_width) {
      // 截断并添加省略号 | Truncate and add ellipsis
      const ellipsis = '...';
      const maxContentLength = rowData.config.max_width - ellipsis.length;
      if (maxContentLength > 0) {
        return joined.substring(0, maxContentLength) + ellipsis;
      } else {
        // 如果max_width太小，只返回省略号 | If max_width is too small, return only ellipsis
        return ellipsis;
      }
    }

    return joined;
  }
}

/**
 * 网格系统工厂函数 | Grid system factory function
 */
export function createGridSystem(multilineConfig: MultilineConfig): GridSystem {
  return new GridSystem(multilineConfig);
}

/**
 * 默认多行配置 | Default multiline config
 */
export const DEFAULT_MULTILINE_CONFIG: MultilineConfig = {
  enabled: false,
  max_rows: 5,
  rows: {
    row1: { separator: ' | ', max_width: 120 },
    row2: { separator: ' • ', max_width: 100 },
    row3: { separator: ' | ', max_width: 80 },
  },
};
