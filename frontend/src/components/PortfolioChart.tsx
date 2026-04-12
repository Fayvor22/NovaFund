import React from "react";

interface Investment {
  id: string;
  projectName: string;
  amount: number;
  currentValue: number;
  status: "active" | "completed" | "failed";
}

interface PortfolioChartProps {
  investments: Investment[];
}

const PortfolioChart: React.FC<PortfolioChartProps> = ({ investments }) => {
  const totalValue = investments.reduce(
    (sum, inv) => sum + inv.currentValue,
    0,
  );

  const chartData = investments.map((inv) => ({
    ...inv,
    percentage: ((inv.currentValue / totalValue) * 100).toFixed(1),
  }));

  const colors = [
    "bg-purple-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-indigo-500",
    "bg-pink-500",
    "bg-orange-500",
  ];

  return (
    <div className="w-full">
      <h3 className="text-xl font-semibold mb-6 text-white">Portfolio Allocation</h3>

      {/* Simple Bar Chart */}
      <div className="space-y-4">
        {chartData.map((item, index) => (
          <div key={item.id} className="flex items-center group cursor-pointer p-2 hover:bg-white/5 rounded-lg transition-colors -mx-2">
            <div className="w-24 text-sm text-white/50 truncate group-hover:text-white transition-colors">
              {item.projectName}
            </div>
            <div className="flex-1 mx-3">
              <div className="bg-white/5 rounded-full h-3 overflow-hidden border border-white/5">
                <div
                  className={`h-full ${colors[index % colors.length]} transition-all duration-500 shadow-sm`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
            <div className="w-16 text-sm text-right text-white font-medium">{item.percentage}%</div>
            <div className="w-20 text-sm text-right text-white/40">
              ${item.currentValue.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <div className="grid grid-cols-2 gap-3 text-xs text-white/60">
          {chartData.slice(0, 6).map((item, index) => (
            <div key={item.id} className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full ${colors[index % colors.length]} mr-2`}
              />
              <span className="truncate">{item.projectName}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PortfolioChart;
