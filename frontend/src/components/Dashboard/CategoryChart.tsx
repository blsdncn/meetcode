'use client';

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// Theme-aware colors that work in both light and dark modes
const COLORS = ["#7fb4ca", "#e6c384", "#e46876", "#76946a", "#957fb8"];

interface CategoryChartProps {
    categories: { name: string; value: number }[];
}
  
export default function CategoryChart({ categories }: CategoryChartProps) {
  return (
    <Card className="text-card-foreground">
      <CardHeader>
        <h2 className="text-2xl font-bold">Problem Categories</h2>
      </CardHeader>
      
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categories}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={({ name, midAngle, outerRadius, cx, cy }) => {
                const RADIAN = Math.PI / 180;
                const radius = outerRadius + 20; // push label out
                const xPos = cx + radius * Math.cos(-midAngle * RADIAN);
                const yPos = cy + radius * Math.sin(-midAngle * RADIAN);

                return (
                  <text
                    x={xPos}
                    y={yPos}
                    className="fill-foreground"
                    fontSize={16}
                    textAnchor={xPos > cx ? 'start' : 'end'}
                    dominantBaseline="central"
                  >
                    {name}
                  </text>
                );
              }}
            >
              {categories.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
             contentStyle={{
             backgroundColor: "hsl(var(--popover))",
             border: "1px solid hsl(var(--border))",
             borderRadius: "8px",
             color: "hsl(var(--popover-foreground))",
             fontSize: "13px",
             padding: "10px",
                }}
            labelStyle={{ color: "hsl(var(--popover-foreground))" }} 
            itemStyle={{ color: "hsl(var(--popover-foreground))" }}  
            formatter={(value, name) => [`${value} problems`, `${name}`]}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// icon: 📊
