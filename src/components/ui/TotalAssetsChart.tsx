"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { useI18n } from "@/contexts/I18nContext";

import { logger } from '@/lib/logger';
type TotalAssetsChartProps = {
  height?: number;
  // 单位：亿（Billion）
  data?: number[];
  yearLabel?: string;
};

interface CSVRow {
  Method: string;
  "Token In": string;
  "Token Out": string;
  "Token Balance Change": string;
  "date(UTC)": string;
}

// 解析 CSV 数据
function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    // 处理可能包含逗号的字段（使用简单的 CSV 解析）
    const values: string[] = [];
    let currentValue = "";
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim()); // 添加最后一个值
    
    const row: Partial<CSVRow> = {};
    headers.forEach((header, index) => {
      const value = values[index]?.trim() || "";
      row[header as keyof CSVRow] = value === "/" ? "0" : value;
    });
    rows.push(row as CSVRow);
  }

  return rows;
}

// 处理 CSV 数据，计算每月的资产余额
function processChartData(csvRows: CSVRow[]): {
  labels: string[];
  data: number[];
} {
  // 按日期排序（从早到晚）
  const sortedRows = [...csvRows].sort((a, b) => {
    const dateA = new Date(a["date(UTC)"]).getTime();
    const dateB = new Date(b["date(UTC)"]).getTime();
    return dateA - dateB;
  });

  // 累计计算余额
  // 从最早的记录开始，初始余额为0，然后累计变化
  let currentBalance = 0;
  const balanceByMonth = new Map<string, number>();

  sortedRows.forEach((row) => {
    const method = row.Method.trim();
    const balanceChangeStr = row["Token Balance Change"].trim();
    const balanceChange = parseFloat(balanceChangeStr) || 0;

    // 根据交易类型处理余额变化
    if (method === "PAYMENT RECEIVED") {
      // 接收支付，余额增加
      currentBalance += balanceChange;
    } else if (method === "PAYMENT SENT") {
      // 发送支付，余额减少（Token Balance Change = Token In - Token Out，是正数但表示减少）
      currentBalance -= balanceChange;
    }

    const date = new Date(row["date(UTC)"]);
    if (isNaN(date.getTime())) {
      logger.warn("Invalid date found in chart data");
      return;
    }
    
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    
    // 更新该月的余额（取该月最后一天的余额）
    balanceByMonth.set(monthKey, currentBalance);
  });

  // 获取所有有数据的月份，按时间排序
  const allMonths = Array.from(balanceByMonth.keys()).sort();
  
  // 如果没有数据，返回空数组
  if (allMonths.length === 0) {
    return { labels: [], data: [] };
  }

  // 填充缺失的月份（使用前一个月的余额）
  const firstMonth = allMonths[0];
  const lastMonth = allMonths[allMonths.length - 1];
  
  const [firstYear, firstMonthNum] = firstMonth.split("-").map(Number);
  const [lastYear, lastMonthNum] = lastMonth.split("-").map(Number);
  
  const labels: string[] = [];
  const data: number[] = [];
  let lastKnownBalance = 0;

  // 从第一个月到最后一个月，填充所有月份
  for (let year = firstYear; year <= lastYear; year++) {
    const startMonth = year === firstYear ? firstMonthNum : 1;
    const endMonth = year === lastYear ? lastMonthNum : 12;
    
    for (let month = startMonth; month <= endMonth; month++) {
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      const balance = balanceByMonth.get(monthKey);
      
      if (balance !== undefined) {
        lastKnownBalance = balance;
        labels.push(monthKey);
        // 转换为亿（Billion）单位
        data.push(balance / 100000000);
      } else {
        // 如果没有该月数据，使用上一个已知余额
        labels.push(monthKey);
        data.push(lastKnownBalance / 100000000);
      }
    }
  }

  return { labels, data };
}

export default function TotalAssetsChart({
  height = 300,
  data,
  yearLabel,
}: TotalAssetsChartProps) {
  const { messages } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);
  const defaultData = data || [3.4, 0.8, 1.6, 1.0, 2.0, 0.5, 2.8, 0.7, 2.8, 2.6, 4.8, 2.1];
  const defaultLabels = [
    messages.chart.totalAssetsChart.months.january,
    messages.chart.totalAssetsChart.months.february,
    messages.chart.totalAssetsChart.months.march,
    messages.chart.totalAssetsChart.months.april,
    messages.chart.totalAssetsChart.months.may,
    messages.chart.totalAssetsChart.months.june,
    messages.chart.totalAssetsChart.months.july,
    messages.chart.totalAssetsChart.months.august,
    messages.chart.totalAssetsChart.months.september,
    messages.chart.totalAssetsChart.months.october,
    messages.chart.totalAssetsChart.months.november,
    messages.chart.totalAssetsChart.months.december,
  ];
  
  const [chartData, setChartData] = useState<number[]>(defaultData);
  const [chartLabels, setChartLabels] = useState<string[]>(defaultLabels);
  const currentYear = yearLabel || String(new Date().getFullYear());

  // 加载 CSV 数据
  useEffect(() => {
    // 格式化月份标签
    const formatMonthLabel = (monthKey: string): string => {
      const [year, month] = monthKey.split("-");
      const monthNum = parseInt(month, 10);
      const monthNames = [
        messages.chart.totalAssetsChart.months.january,
        messages.chart.totalAssetsChart.months.february,
        messages.chart.totalAssetsChart.months.march,
        messages.chart.totalAssetsChart.months.april,
        messages.chart.totalAssetsChart.months.may,
        messages.chart.totalAssetsChart.months.june,
        messages.chart.totalAssetsChart.months.july,
        messages.chart.totalAssetsChart.months.august,
        messages.chart.totalAssetsChart.months.september,
        messages.chart.totalAssetsChart.months.october,
        messages.chart.totalAssetsChart.months.november,
        messages.chart.totalAssetsChart.months.december,
      ];
      return `${monthNames[monthNum - 1]} ${year}`;
    };

    const loadCSVData = async () => {
      // 确保只在客户端执行
      if (typeof window === "undefined") return;
      
      // 尝试加载 CSV 的路径列表（按优先级排序）
      const csvPaths = [
        "/chart.csv", // 直接访问 public 目录
        "/api/chart-data", // 通过 API 路由
      ];
      
      let csvText = "";
      let lastError: Error | null = null;
      
      // 尝试每个路径
      for (const path of csvPaths) {
        try {
          const response = await fetch(path, {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
            },
          });
          
          if (response.ok) {
            csvText = await response.text();
            if (csvText && csvText.trim().length > 0) {
              logger.log(`Successfully loaded chart data from ${path}`);
              break; // 成功加载，退出循环
            }
          } else {
            logger.warn(`Failed to load chart data from ${path}: ${response.status} ${response.statusText}`);
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          logger.warn(`Error loading chart data from ${path}`);
        }
      }
      
      // 如果所有路径都失败
      if (!csvText || csvText.trim().length === 0) {
        logger.error("Failed to load chart data from all attempted paths", lastError);
        // 保持使用默认数据，不中断组件渲染
        return;
      }
      
      try {
        const csvRows = parseCSV(csvText);
        if (csvRows.length === 0) {
          logger.warn("CSV file parsed but contains no valid rows");
          return;
        }
        
        const processed = processChartData(csvRows);
        
        if (processed.labels.length > 0 && processed.data.length > 0) {
          setChartData(processed.data);
          setChartLabels(processed.labels.map(formatMonthLabel));
          logger.log(`Successfully processed ${processed.labels.length} months of chart data`);
        } else {
          logger.warn("Processed chart data is empty");
        }
      } catch (parseError) {
        logger.error("Error parsing chart data:", parseError);
      }
    };

    loadCSVData();
  }, [messages.chart.totalAssetsChart.months]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line" },
        confine: true,
        className: "chart-tooltip-dark",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `${p.axisValue}<br/>${p.value}${messages.chart.totalAssetsChart.tooltip.unit}`;
        },
      },
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: chartLabels,
        axisLine: { lineStyle: { color: "#4C525C" } },
        axisLabel: { 
          color: "#9AA3AF",
          rotate: chartLabels.length > 12 ? 45 : 0, // 如果数据点多，旋转标签
          interval: chartLabels.length > 24 ? "auto" : 0, // 如果数据点太多，自动间隔显示
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: Math.max(...chartData, 1) * 1.2, // 动态计算最大值，留20%的余量
        interval: Math.ceil(Math.max(...chartData, 1) * 1.2 / 5), // 动态计算间隔
        axisLabel: {
          color: "#9AA3AF",
          formatter: (v: number) => `${v.toFixed(1)}${messages.chart.totalAssetsChart.yAxis.unit}`,
        },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "#3A3F49", type: "dashed" } },
      },
      legend: {
        bottom: 6,
        textStyle: { color: "#9AA3AF" },
        data: [currentYear],
        itemHeight: 8,
        itemWidth: 12,
        icon: "circle",
      },
      series: [
        {
          name: currentYear,
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { color: "#00CC9B", width: 2 },
          itemStyle: { color: "#00CC9B", borderColor: "#0b1a16" },
          emphasis: {
            focus: "series",
            itemStyle: { shadowBlur: 8, shadowColor: "rgba(0, 204, 155, 0.5)" },
          },
          data: chartData,
        },
      ],
    };

    chart.setOption(option);

    const resize = () => chart.resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
      chartRef.current = null;
    };
  }, [chartData, chartLabels, currentYear, messages.chart.totalAssetsChart]);

  return (
    <div
      className="assets_chart"
      ref={containerRef}
      style={{ width: "100%", height }}
      aria-label="total-assets-line-chart"
    />
  );
}


