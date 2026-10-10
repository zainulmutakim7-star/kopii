import React, { useState, useEffect } from "react";
import { apiClient } from "../../lib/apiClient";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Array bantuan untuk nama hari dan bulan
const hariIndo = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const bulanIndo = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function formatRupiah(value) {
  if (value >= 1000000) {
    return `Rp${(value / 1000000).toFixed(1)}jt`;
  }
  if (value >= 1000) {
    return `Rp${(value / 1000).toFixed(0)}rb`;
  }
  return `Rp${value.toLocaleString("id-ID")}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-3 py-2 shadow-[0_10px_30px_-15px_rgba(15,23,42,0.2)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-stone-900">
        {formatRupiah(payload[0].value)}
      </p>
      <p className="text-xs text-stone-500">Pemasukan</p>
    </div>
  );
}

export default function RevenueChart() {
  const [mode, setMode] = useState("daily");
  const [loading, setLoading] = useState(true);

  // State untuk menyimpan data grafik yang asli
  const [dataDaily, setDataDaily] = useState([]);
  const [dataWeekly, setDataWeekly] = useState([]);
  const [dataMonthly, setDataMonthly] = useState([]);

  useEffect(() => {
    async function fetchChartData() {
      try {
        setLoading(true);
        const trxData = await apiClient.get('/transaksi?select=tanggal,total_harga');

        // No explicit error object; apiClient throws on non‑ok responses

        if (trxData) {
          const now = new Date();

          // --- 1. Persiapkan Wadah Data Harian (7 Hari Terakhir) ---
          const tempDaily = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            tempDaily.push({
              dateString: d.toISOString().split("T")[0], // Format YYYY-MM-DD
              label: hariIndo[d.getDay()],
              pemasukan: 0,
            });
          }

          // --- 2. Persiapkan Wadah Data Mingguan (4 Minggu Terakhir) ---
          const tempWeekly = [
            { label: "Mgg 1", pemasukan: 0 }, // 4 minggu lalu
            { label: "Mgg 2", pemasukan: 0 }, // 3 minggu lalu
            { label: "Mgg 3", pemasukan: 0 }, // 2 minggu lalu
            { label: "Mgg 4", pemasukan: 0 }, // Minggu ini
          ];

          // --- 3. Persiapkan Wadah Data Bulanan (Jan - Des Tahun Ini) ---
          const tempMonthly = bulanIndo.map((b) => ({ label: b, pemasukan: 0 }));

          // --- 4. Masukkan Data Transaksi ke Wadah Masing-masing ---
          trxData.forEach((trx) => {
            const tDate = new Date(trx.tanggal);
            const harga = trx.total_harga || 0;

            // Hitungan Harian
            const tDateString = tDate.toISOString().split("T")[0];
            const dailyItem = tempDaily.find((d) => d.dateString === tDateString);
            if (dailyItem) dailyItem.pemasukan += harga;

            // Hitungan Bulanan
            if (tDate.getFullYear() === now.getFullYear()) {
              tempMonthly[tDate.getMonth()].pemasukan += harga;
            }

            // Hitungan Mingguan
            const timeDiff = Math.abs(now.setHours(0, 0, 0, 0) - tDate.setHours(0, 0, 0, 0));
            const diffDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (diffDays <= 7) tempWeekly[3].pemasukan += harga;
            else if (diffDays <= 14) tempWeekly[2].pemasukan += harga;
            else if (diffDays <= 21) tempWeekly[1].pemasukan += harga;
            else if (diffDays <= 28) tempWeekly[0].pemasukan += harga;
          });

          setDataDaily(tempDaily);
          setDataWeekly(tempWeekly);
          setDataMonthly(tempMonthly);
        }
      } catch (err) {
        console.error("Gagal memuat data grafik:", err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchChartData();
  }, []);

  let chartData = dataDaily;
  let title = "Pemasukan Harian";
  let subtitle = "7 hari terakhir";

  if (mode === "weekly") {
    chartData = dataWeekly;
    title = "Pemasukan Mingguan";
    subtitle = "4 minggu terakhir";
  } else if (mode === "monthly") {
    chartData = dataMonthly;
    title = "Pemasukan Bulanan";
    subtitle = `Tahun ${new Date().getFullYear()}`;
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
          <p className="text-xs text-stone-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full bg-stone-100 p-1 shadow-sm">
            <button
              onClick={() => setMode("daily")}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${mode === "daily" ? "bg-amber-600 text-white shadow-md" : "text-stone-600 hover:bg-stone-100"
                }`}
            >
              Harian
            </button>
            <button
              onClick={() => setMode("weekly")}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${mode === "weekly" ? "bg-amber-600 text-white shadow-md" : "text-stone-600 hover:bg-stone-100"
                }`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setMode("monthly")}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${mode === "monthly" ? "bg-amber-600 text-white shadow-md" : "text-stone-600 hover:bg-stone-100"
                }`}
            >
              Bulanan
            </button>
          </div>

          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
            {loading ? "Memuat..." : "Data Aktif"}
          </span>
        </div>
      </div>

      <div className="h-64 w-full">
        {loading ? (
          <div className="flex h-full w-full items-center justify-center text-sm font-medium text-stone-400">
            Mengambil data grafik...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="amberFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e7e5e4" strokeDasharray="3 3" opacity={0.7} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#57534e", fontSize: 12, fontWeight: 600 }}
                axisLine={{ stroke: "#e7e5e4" }}
                tickLine={false}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis
                tick={{ fill: "#57534e", fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatRupiah}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#d97706", strokeWidth: 1.5, opacity: 0.15 }} />
              <Area
                type="monotone"
                dataKey="pemasukan"
                stroke="#d97706"
                strokeWidth={3}
                fill="url(#amberFill)"
                activeDot={{ r: 5, fill: "#ffffff", stroke: "#d97706", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}