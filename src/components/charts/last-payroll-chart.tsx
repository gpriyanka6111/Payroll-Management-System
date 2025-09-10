
"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { Label, Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};


export function LastPayrollChart({ totalAmount }: { totalAmount: number }) {
  const chartData = [{ browser: "desktop", visitors: totalAmount, fill: "var(--color-desktop)" }];
  
  const chartConfig = {
    visitors: {
      label: "Visitors",
    },
    desktop: {
      label: "Desktop",
      color: "hsl(var(--primary))",
    },
  }

  const totalVisitors = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.visitors, 0)
  }, [])

  return (
    <div className="flex items-center justify-center">
        <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-48"
        >
            <PieChart>
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                    data={chartData}
                    dataKey="visitors"
                    nameKey="browser"
                    innerRadius={60}
                    strokeWidth={5}
                >
                <Label
                    content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                        <g>
                            <text
                                x={viewBox.cx}
                                y={viewBox.cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="fill-foreground text-2xl font-bold"
                            >
                                {formatCurrency(totalVisitors)}
                            </text>
                             <text
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 20}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="fill-muted-foreground text-sm"
                            >
                                Cash required
                            </text>
                        </g>
                        )
                    }
                    }}
                />
                </Pie>
            </PieChart>
        </ChartContainer>
    </div>
  )
}
