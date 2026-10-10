import { useState, useEffect } from "react";
import { apiClient } from "../lib/apiClient";
import { Trash2, Coffee, CupSoda, Utensils, PackageSearch, PlusCircle, LayoutGrid, Box } from "lucide-react";
import Layout from "../components/layout/Layout";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";

export default function Inventory({ onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    nama_produk: "",
    kategori: "Kopi",
    harga: "",
    stok: "",
  });

  const fetchProduk = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/produk');
      setItems(data || []);
    } catch (error) {
      console.error("Gagal memuat inventaris:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduk();
  }, []);

  const handleAddItem = async (event) => {
    event.preventDefault();
    if (!form.nama_produk || !form.harga || !form.stok) return;

    try {
      setIsSubmitting(true);
      await apiClient.post('/produk', {
        nama: form.nama_produk.trim(),
        kategori: form.kategori,
        harga: parseInt(form.harga),
        stok: parseInt(form.stok),
      });

      setForm({ nama_produk: "", kategori: "Kopi", harga: "", stok: "" });
      fetchProduk();
    } catch (error) {
      console.error("Gagal menambah produk:", error.message);
      alert("Gagal menyimpan data ke database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id) => {
    const confirm = window.confirm("Yakin ingin menghapus menu ini? Data di mesin kasir juga akan hilang.");
    if (!confirm) return;

    try {
      await apiClient.delete(`/produk/${id}`);

      fetchProduk();
    } catch (error) {
      console.error("Gagal menghapus produk:", error.message);
      alert("Gagal menghapus produk.");
    }
  };

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(angka);
  };

  const getCategoryIcon = (kategori) => {
    switch (kategori) {
      case "Kopi": return <Coffee className="h-6 w-6 text-amber-500" />;
      case "Non-Kopi": return <CupSoda className="h-6 w-6 text-emerald-500" />;
      case "Makanan": return <Utensils className="h-6 w-6 text-rose-500" />;
      default: return <Box className="h-6 w-6 text-stone-500" />;
    }
  };

  const getCategoryColor = (kategori) => {
    switch (kategori) {
      case "Kopi": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Non-Kopi": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Makanan": return "bg-rose-50 text-rose-700 border-rose-200";
      default: return "bg-stone-50 text-stone-700 border-stone-200";
    }
  };

  return (
    <Layout onLogout={onLogout}>
      <PageHeader
        subtitle="Inventaris & Menu"
        title="Kelola Menu Kafe"
        description="Tambahkan menu baru, atur harga, dan pantau stok jualan agar operasi Z Coffee Hening selalu lancar."
        status="Terhubung ke Database"
        actions={<Button variant="secondary" onClick={fetchProduk}>Refresh Data</Button>}
      />

      <div className="flex flex-col gap-8 pb-12">
        {/* Form Tambah Menu - Redesigned */}
        <div className="relative overflow-hidden rounded-[2rem] border border-stone-100 bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <PlusCircle className="w-64 h-64 text-amber-900" />
          </div>
          
          <div className="relative p-8">
            <div className="mb-8 flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30">
                <PackageSearch className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-stone-900 tracking-tight">Tambah Menu Baru</h2>
                <p className="text-sm font-medium text-stone-500 mt-1">Isi detail produk untuk menambahkannya ke sistem kasir.</p>
              </div>
            </div>

            <form onSubmit={handleAddItem} className="relative z-10">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Nama Menu</label>
                  <input
                    type="text"
                    value={form.nama_produk}
                    onChange={(e) => setForm({ ...form, nama_produk: e.target.value })}
                    placeholder="Contoh: Matcha Latte"
                    className="w-full rounded-2xl border-2 border-stone-100 bg-stone-50/50 px-5 py-4 text-[15px] font-bold text-stone-800 transition-all focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                  />
                </div>
                
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Kategori</label>
                  <select
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    className="w-full rounded-2xl border-2 border-stone-100 bg-stone-50/50 px-5 py-4 text-[15px] font-bold text-stone-800 transition-all focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 appearance-none cursor-pointer"
                  >
                    <option value="Kopi">☕ Kopi</option>
                    <option value="Non-Kopi">🥤 Non-Kopi</option>
                    <option value="Makanan">🍔 Makanan</option>
                  </select>
                </div>

                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Harga Jual (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 font-bold">Rp</span>
                    <input
                      type="number"
                      value={form.harga}
                      onChange={(e) => setForm({ ...form, harga: e.target.value })}
                      placeholder="0"
                      className="w-full rounded-2xl border-2 border-stone-100 bg-stone-50/50 pl-14 pr-5 py-4 text-[15px] font-bold text-stone-800 transition-all focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Stok Awal</label>
                  <input
                    type="number"
                    value={form.stok}
                    onChange={(e) => setForm({ ...form, stok: e.target.value })}
                    placeholder="Jumlah Stok"
                    className="w-full rounded-2xl border-2 border-stone-100 bg-stone-50/50 px-5 py-4 text-[15px] font-bold text-stone-800 transition-all focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end pt-6 border-t border-stone-100">
                <Button 
                  type="submit" 
                  loading={isSubmitting} 
                  disabled={isSubmitting || !form.nama_produk || !form.harga || !form.stok} 
                  className="rounded-2xl bg-stone-900 hover:bg-stone-800 px-10 py-4 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] w-full md:w-auto text-[15px] font-bold transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Menu ke Inventaris"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Daftar Inventaris - Redesigned Grid */}
        <div className="rounded-[2rem] border border-stone-100 bg-white p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-stone-100 text-stone-600">
                <LayoutGrid className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight">Daftar Menu Saat Ini</h2>
            </div>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-bold text-stone-700 shadow-sm">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
              {items.length} Menu Aktif
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? (
              <div className="col-span-full">
                <Skeleton count={3} />
              </div>
            ) : items.length === 0 ? (
              <div className="col-span-full">
                <EmptyState title="Inventaris kosong" description="Belum ada menu yang didaftarkan. Silakan tambah menu di atas." />
              </div>
            ) : (
              items.map((entry) => (
                <div
                  key={entry.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[1.5rem] border border-stone-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-300 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.2)]"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 items-center">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-[1rem] shadow-sm border ${getCategoryColor(entry.kategori)} bg-opacity-30`}>
                        {getCategoryIcon(entry.kategori)}
                      </div>
                      <div>
                        <h3 className="text-[17px] font-black text-stone-900 line-clamp-1 group-hover:text-amber-600 transition-colors">{entry.nama || entry.nama_produk}</h3>
                        <p className="text-[13px] font-bold text-stone-400 mt-0.5 uppercase tracking-wide">{entry.kategori}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex items-end justify-between border-t border-stone-100 pt-5">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mb-1.5">Harga Jual</p>
                      <p className="text-xl font-black text-amber-500 tracking-tight">{formatRupiah(entry.harga)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mb-1.5">Sisa Stok</p>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-2xl font-black text-stone-900 leading-none">{entry.stok}</span>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${entry.stok > 10 ? "bg-emerald-100 text-emerald-700" : entry.stok > 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                          {entry.stok > 10 ? "Aman" : entry.stok > 0 ? "Tipis" : "Habis"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delete Button Hover */}
                  <button
                    onClick={() => handleDeleteItem(entry.id)}
                    className="absolute top-4 right-4 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 flex h-10 w-10 items-center justify-center rounded-[0.8rem] bg-white text-stone-400 shadow-md border border-stone-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all duration-300"
                    title="Hapus Menu"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}