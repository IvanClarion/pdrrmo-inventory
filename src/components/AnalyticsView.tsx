import React from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  PackageCheck,
  AlertTriangle,
  Boxes,
  FileSpreadsheet,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { items, transactions } = useInventory();

  // Physical items only (excluding Item Sets to prevent double counting valuation)
  const physicalItems = items.filter((i) => !i.isSetOrBundle);

  // Category Valuation breakdown
  const categoryValuationMap: Record<string, { name: string; valuation: number; count: number }> = {};
  physicalItems.forEach((item) => {
    if (!categoryValuationMap[item.category]) {
      categoryValuationMap[item.category] = { name: item.category, valuation: 0, count: 0 };
    }
    categoryValuationMap[item.category].valuation += item.quantity * item.unitPrice;
    categoryValuationMap[item.category].count += item.quantity;
  });

  const categoryData = Object.values(categoryValuationMap);

  // Top Checked-Out Items
  const itemMovementMap: Record<string, { name: string; totalCheckedOut: number }> = {};
  transactions.forEach((tx) => {
    if (tx.type === 'CHECK_OUT') {
      if (!itemMovementMap[tx.itemName]) {
        itemMovementMap[tx.itemName] = { name: tx.itemName.split(' ')[0] + '...', totalCheckedOut: 0 };
      }
      itemMovementMap[tx.itemName].totalCheckedOut += tx.quantity;
    }
  });

  const topMovementData = Object.values(itemMovementMap).slice(0, 5);

  // Dead stock identification (physical items with 0 check-outs)
  const deadStockItems = physicalItems.filter(
    (item) => !transactions.some((tx) => tx.itemId === item.id && tx.type === 'CHECK_OUT')
  );

  const totalInventoryValuation = physicalItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
  const totalCostValuation = physicalItems.reduce((acc, i) => acc + i.quantity * i.costPrice, 0);
  const totalMargin = totalInventoryValuation - totalCostValuation;

  const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-black" />
          <span>Executive Inventory Analytics & Reports</span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Real-time stock valuation, turnover velocity, dead stock identification, and shrinkage metrics.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-sm">
          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Total Stock Price (PHP)</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-[#1A1A1A]">₱{totalInventoryValuation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            <div className="w-8 h-8 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] text-black flex items-center justify-center font-bold">
              ₱
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-sm">
          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Estimated Gross Margin (PHP)</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-green-700">₱{totalMargin.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            <div className="w-8 h-8 rounded-xl bg-green-50 border border-green-200 text-green-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-sm">
          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Active Items Tracked</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-[#1A1A1A]">{items.length} SKUs</span>
            <div className="w-8 h-8 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] text-black flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-sm">
          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Dead Stock SKUs</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-amber-700">{deadStockItems.length} Items</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Visual Recharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Valuation Bar Chart */}
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-[#1A1A1A] text-sm">Stock Valuation by Category (PHP ₱)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis dataKey="name" stroke="#666666" fontSize={10} />
                <YAxis stroke="#666666" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E5E5E5', borderRadius: '8px', color: '#1A1A1A' }}
                />
                <Bar dataKey="valuation" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Checked Out Items */}
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-[#1A1A1A] text-sm">Top Checked-Out Asset Velocity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMovementData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis type="number" stroke="#666666" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#666666" fontSize={10} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E5E5E5', borderRadius: '8px', color: '#1A1A1A' }}
                />
                <Bar dataKey="totalCheckedOut" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dead Stock Report Table */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-[#1A1A1A] text-sm">Dead Stock & Zero-Movement Identification</h3>
        <p className="text-xs text-gray-500">
          The following items have recorded zero movement in current operational period and tie up capital.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F9F9F9] border-b border-[#E5E5E5] text-[#1A1A1A] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3">Qty Holding</th>
                <th className="py-2.5 px-3">Tied Capital (PHP ₱)</th>
                <th className="py-2.5 px-3">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {deadStockItems.map((i) => (
                <tr key={i.id} className="hover:bg-[#F9F9F9]">
                  <td className="py-2.5 px-3 font-bold text-[#1A1A1A]">{i.name}</td>
                  <td className="py-2.5 px-3 font-mono text-gray-500">{i.sku}</td>
                  <td className="py-2.5 px-3">{i.quantity} Units</td>
                  <td className="py-2.5 px-3 font-bold text-amber-700">₱{(i.quantity * i.costPrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="py-2.5 px-3 text-gray-500">{i.locationName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
