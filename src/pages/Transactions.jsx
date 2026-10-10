import { useMemo, useState, useEffect } from "react";
import { apiClient } from "../lib/apiClient";
import Layout from "../components/layout/Layout";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";

const statusStyles = {
  Selesai: "bg-emerald-100 text-emerald-700",
  Diproses: "bg-sky-100 text-sky-700",
  Menunggu: "bg-amber-100 text-amber-700",
};

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Transactions({ onLogout }) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [transactionsData, setTransactionsData] = useState([]);

  // Fungsi untuk menarik data dari Supabase
  const fetchTransactions = async () => {
    try {
      setLoading(true);

      const data = await apiClient.get('/transaksi');

      // Format data dari database agar sesuai dengan desain UI
      const formattedData = data.map((item) => {
        // Format tanggal ke Indonesia (cth: 22 Jul 2026)
        const dateObj = new Date(item.created_at || item.tanggal);
        const formattedDate = dateObj.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        return {
          id: `#${item.id}`,
          customer: `Kasir: ${item.nama_kasir || 'Admin'}`, // Sementara pakai nama kasir karena belum ada fitur pilih pelanggan di POS
          total: Number(item.total_harga),
          status: "Selesai", // Transaksi POS otomatis selesai
          date: formattedDate,
          payment: item.metode_pembayaran || "Tunai",
          items: Number(item.total_items),
        };
      });

      setTransactionsData(formattedData);
    } catch (error) {
      console.error("Gagal memuat transaksi:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    const keyword = search.toLowerCase();

    return transactionsData.filter((item) => {
      return [item.id, item.customer, item.status, item.payment, item.date]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [search, transactionsData]);

  const totalRevenue = transactionsData.reduce((sum, item) => sum + item.total, 0);
  const pendingCount = transactionsData.filter((item) => item.status === "Menunggu").length;

  return (
    <Layout onLogout={onLogout}>
      <PageHeader
        subtitle="Transaksi"
        title="Riwayat penjualan"
        description="Lihat ringkasan omzet, status pesanan, dan temukan transaksi yang perlu ditindaklanjuti dengan cepat."
        status="Aktif"
        actions={
          <Button variant="secondary" onClick={fetchTransactions} className="whitespace-nowrap">
            Refresh Data
          </Button>
        }
      />

      <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-amber-600">Riwayat transaksi</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-900">Ringkasan penjualan</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Total transaksi</p>
              <p className="mt-3 text-3xl font-semibold text-stone-900">{transactionsData.length}</p>
            </div>
            <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Pendapatan</p>
              <p className="mt-3 text-3xl font-semibold text-stone-900">{formatRupiah(totalRevenue)}</p>
            </div>
            <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Menunggu</p>
              <p className="mt-3 text-3xl font-semibold text-amber-700">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_0.7fr] xl:items-end">
          <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5 shadow-sm">
            <label htmlFor="transaction-search" className="text-sm font-semibold text-stone-700">Cari transaksi</label>
            <input
              id="transaction-search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari ID, pelanggan, status, atau metode bayar"
              className="mt-3 w-full rounded-[1.5rem] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </div>
          <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5 shadow-sm">
            <p className="text-sm font-semibold text-stone-700">Transaksi ditemukan</p>
            <p className="mt-3 text-3xl font-semibold text-stone-900">{filteredTransactions.length}</p>
            <p className="mt-1 text-sm text-stone-500">Hasil sesuai kata kunci</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <Skeleton type="card" count={3} />
          ) : filteredTransactions.length > 0 ? (
            filteredTransactions.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900">{item.id}</p>
                    <p className="mt-1 text-sm text-stone-600">{item.customer} • {item.items} item</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 xl:w-[45%]">
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-stone-500">Tanggal</p>
                      <p className="mt-1 text-sm text-stone-900">{item.date}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-stone-500">Metode</p>
                      <p className="mt-1 text-sm text-stone-900">{item.payment}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-stone-500">Total</p>
                      <p className="mt-1 text-sm font-semibold text-stone-900">{formatRupiah(item.total)}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[item.status] || "bg-stone-100 text-stone-700"}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Tidak ada transaksi" description="Tidak ditemukan transaksi yang sesuai pencarian." />
          )}
        </div>
      </div>
    </Layout>
  );
}