import React, { useEffect, useState } from "react";
import { Wallet, ShoppingBag, Users2, Coffee, Sparkles } from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import Layout from "../components/layout/Layout";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/dashboard/StatCard";
import RevenueChart from "../components/dashboard/RevenueChart";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";

// Fungsi untuk memformat angka ke Rupiah
function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Dashboard({ onLogout }) {
  const [loading, setLoading] = useState(true);
  const [bestSellers, setBestSellers] = useState([]);

  // State untuk menyimpan hasil hitungan statistik
  const [stats, setStats] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
    trxCount: 0
  });

  // Format tanggal hari ini (Contoh: Senin, 15 Agustus 2026)
  const todayFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // 1. Ambil data Menu / Inventaris
        try {
          const produkData = await apiClient.get('/produk');
          if (produkData) {
            const formattedMenu = produkData
              .slice(0, 5) // Tampilkan 5 menu saja di dashboard
              .map((item) => ({
                name: item.nama || item.nama_produk, // Handle both since SQL has `nama`
                qty: `${item.stok} stok`
              }));
            setBestSellers(formattedMenu);
          }
        } catch (errorProduk) {
          console.error(errorProduk);
        }

        // 2. Ambil data Transaksi untuk menghitung Pemasukan
        try {
          const trxData = await apiClient.get('/transaksi');
          if (trxData) {
          let dailyTotal = 0;
          let weeklyTotal = 0;
          let monthlyTotal = 0;
          let monthlyTrxCount = 0;

          const now = new Date();
          const todayStr = now.toLocaleDateString("en-CA"); // Format YYYY-MM-DD
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          // Tentukan kapan awal minggu ini (Hari Minggu)
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);

          // Mulai berhitung dari semua data transaksi
          trxData.forEach((trx) => {
            const trxDate = new Date(trx.tanggal);
            const harga = trx.total_harga || 0;

            // Hitung Pemasukan Harian
            if (trxDate.toLocaleDateString("en-CA") === todayStr) {
              dailyTotal += harga;
            }

            // Hitung Pemasukan Mingguan
            if (trxDate >= startOfWeek) {
              weeklyTotal += harga;
            }

            // Hitung Pemasukan & Transaksi Bulanan
            if (trxDate.getMonth() === currentMonth && trxDate.getFullYear() === currentYear) {
              monthlyTotal += harga;
              monthlyTrxCount += 1;
            }
          });

          // Simpan hasil hitungan ke State
          setStats({
            daily: dailyTotal,
            weekly: weeklyTotal,
            monthly: monthlyTotal,
            trxCount: monthlyTrxCount
          });
        }
        } catch (errorTrx) {
          console.error(errorTrx);
        }
      } catch (err) {
        console.error("Terjadi kesalahan koneksi:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const topStats = [
    {
      label: "Pemasukan Harian",
      value: formatRupiah(stats.daily),
      delta: "Real-time",
      isPositive: true,
      icon: Wallet,
      comparisonLabel: "Hari ini"
    },
    {
      label: "Pemasukan Mingguan",
      value: formatRupiah(stats.weekly),
      delta: "Real-time",
      isPositive: true,
      icon: Sparkles,
      comparisonLabel: "Minggu ini"
    },
    {
      label: "Pemasukan Bulanan",
      value: formatRupiah(stats.monthly),
      delta: "Real-time",
      isPositive: true,
      icon: Wallet,
      comparisonLabel: "Bulan ini"
    },
    {
      label: "Transaksi Bulanan",
      value: stats.trxCount.toString(),
      delta: "Real-time",
      isPositive: true,
      icon: ShoppingBag,
      comparisonLabel: "Total struk bulan ini"
    },
  ];

  return (
    <Layout onLogout={onLogout}>
      <PageHeader
        subtitle="Ringkasan operasional"
        title="Z-Coffe-Hening Dashboard"
        description="Pantau pemasukan, transaksi, dan performa menu secara otomatis dan real-time."
        status="Sistem Terhubung"
        actions={<Button variant="secondary">Unduh ringkasan</Button>}
      />

      <div className="rounded-[1.25rem] border border-stone-200 bg-gradient-to-r from-stone-900 to-stone-800 p-6 text-stone-50 shadow-[var(--shadow)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-amber-300">{todayFormatted}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Operasional hari ini berjalan lancar</h2>
            <p className="mt-2 max-w-2xl text-sm text-stone-300">
              Pantau pemasukan, transaksi, absensi karyawan, dan performa menu favorit dari satu dashboard yang rapi dan profesional.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-amber-300" />
              Fokus hari ini: layanan cepat & stok aman
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:gap-5">
        {loading ? (
          <Skeleton count={4} />
        ) : (
          topStats.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={s.value}
              delta={s.delta}
              isPositive={s.isPositive}
              icon={s.icon}
              comparisonLabel={s.comparisonLabel}
            />
          ))
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Grafik ini masih tampilan UI, bisa kita fungsikan datanya menyusul kalau kamu mau */}
          <RevenueChart />
        </div>

        <div className="rounded-[1.25rem] border border-stone-200 bg-white p-5 shadow-[var(--shadow)]">
          <div className="flex items-center gap-2">
            <Coffee className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-stone-900">Ketersediaan Stok Menu</h3>
          </div>
          <p className="mt-1 text-xs text-stone-500">Terhubung secara real-time dari Database</p>
          <div className="mt-4">
            {loading ? (
              <Skeleton count={3} />
            ) : bestSellers.length === 0 ? (
              <EmptyState title="Tidak ada data menu" description="Belum ada data produk di database." />
            ) : (
              <ul className="mt-4 space-y-3">
                {bestSellers.map((item) => (
                  <li key={item.name} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
                    <span className="text-stone-700">{item.name}</span>
                    <span className="font-semibold text-amber-700">{item.qty}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}