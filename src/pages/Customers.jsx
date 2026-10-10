import { useMemo, useState, useEffect } from "react";
import { apiClient } from "../lib/apiClient";
import { Trash2, PlusCircle } from "lucide-react";
import Layout from "../components/layout/Layout";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import Skeleton from "../components/ui/Skeleton";

export default function Customers({ onLogout }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk form tambah pelanggan
  const [form, setForm] = useState({ nama: "", no_hp: "" });

  // Fungsi memuat data pelanggan dari database
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/pelanggan');
      setCustomers(data || []);
    } catch (error) {
      console.error("Gagal memuat pelanggan:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fungsi tambah pelanggan baru
  const handleAddCustomer = async (event) => {
    event.preventDefault();
    if (!form.nama.trim()) return;

    try {
      setIsSubmitting(true);
      await apiClient.post('/pelanggan', {
        nama: form.nama.trim(),
        no_hp: form.no_hp.trim() || "-",
        total_order: 1,
        terakhir_datang: new Date().toISOString(),
      });

      setForm({ nama: "", no_hp: "" });
      fetchCustomers();
    } catch (error) {
      alert("Gagal menambah pelanggan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fungsi tambah jumlah order (Loyalty Point)
  const handleAddOrder = async (id, currentOrders) => {
    try {
      await apiClient.put(`/pelanggan/${id}`, {
        total_order: currentOrders + 1,
        terakhir_datang: new Date().toISOString()
      });
      fetchCustomers(); // Refresh data
    } catch (error) {
      alert("Gagal mengupdate order pelanggan.");
    }
  };

  // Fungsi hapus pelanggan
  const handleDeleteCustomer = async (id) => {
    const confirm = window.confirm("Yakin ingin menghapus pelanggan ini?");
    if (!confirm) return;

    try {
      await apiClient.delete(`/pelanggan/${id}`);
      fetchCustomers();
    } catch (error) {
      alert("Gagal menghapus pelanggan.");
    }
  };

  // Penentuan Tier Member otomatis
  const getTier = (orders) => {
    if (orders >= 15) return "Gold";
    if (orders >= 5) return "Silver";
    return "Bronze";
  };

  const filteredCustomers = useMemo(() => {
    const keyword = search.toLowerCase();
    return customers.filter((customer) => {
      const tier = getTier(customer.total_order);
      return [customer.nama, tier, customer.no_hp]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [search, customers]);

  return (
    <Layout onLogout={onLogout}>
      <PageHeader
        subtitle="Pelanggan"
        title="Database Member Z Coffee"
        description="Kelola data pelanggan setia, pantau jumlah kunjungan, dan berikan reward berdasarkan tier."
        status="Sistem Terkoneksi"
        actions={<Button variant="secondary" onClick={fetchCustomers}>Refresh Data</Button>}
      />

      <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-amber-600">Registrasi Member</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-900">Tambah Pelanggan Baru</h2>
          </div>
          <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700 shadow-sm">
            {customers.length} Member Terdaftar
          </div>
        </div>

        {/* Form Tambah Pelanggan */}
        <form onSubmit={handleAddCustomer} className="mt-6 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="text"
              value={form.nama}
              onChange={(event) => setForm((current) => ({ ...current, nama: event.target.value }))}
              placeholder="Nama Pelanggan"
              className="rounded-[1.5rem] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
            <input
              type="text"
              value={form.no_hp}
              onChange={(event) => setForm((current) => ({ ...current, no_hp: event.target.value }))}
              placeholder="Nomor HP / WhatsApp (Opsional)"
              className="rounded-[1.5rem] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting} className="rounded-[1.5rem] bg-amber-600 hover:bg-amber-700">
              {isSubmitting ? "Menyimpan..." : "Daftarkan Member"}
            </Button>
          </div>
        </form>

        <div className="mt-8 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5 shadow-sm">
            <label htmlFor="customer-search" className="text-sm font-semibold text-stone-700">Cari Member</label>
            <input
              id="customer-search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama atau nomor HP..."
              className="mt-3 w-full rounded-[1.5rem] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </div>
          <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5 shadow-sm">
            <p className="text-sm font-semibold text-stone-700">Hasil pencarian</p>
            <p className="mt-3 text-3xl font-semibold text-stone-900">{filteredCustomers.length}</p>
            <p className="mt-1 text-sm text-stone-500">Pelanggan sesuai kriteria</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <Skeleton count={3} />
          ) : filteredCustomers.map((customer) => {
            const tier = getTier(customer.total_order);
            const tierColor = tier === "Gold" ? "bg-amber-100 text-amber-700" : tier === "Silver" ? "bg-slate-200 text-slate-700" : "bg-orange-100 text-orange-800";

            return (
              <div key={customer.id} className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-amber-50 text-amber-700 font-semibold text-base">
                      {customer.nama.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-stone-900">{customer.nama}</p>
                      <p className={`text-xs font-semibold px-2 py-0.5 mt-1 rounded-full inline-block ${tierColor}`}>
                        {tier} Member
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteCustomer(customer.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-400 shadow-sm border border-stone-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                    title="Hapus Pelanggan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-stone-600">
                  <div className="flex items-center justify-between rounded-[1.5rem] bg-white px-4 py-3">
                    <div>
                      <p className="font-medium text-stone-900">{customer.total_order} pesanan</p>
                      <p className="text-xs text-stone-500">Total belanja</p>
                    </div>
                    <button
                      onClick={() => handleAddOrder(customer.id, customer.total_order)}
                      className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> 1 Order
                    </button>
                  </div>
                  <div className="rounded-[1.5rem] bg-white px-4 py-3">
                    <p className="font-medium text-stone-900">{new Date(customer.terakhir_datang).toLocaleDateString("id-ID")}</p>
                    <p className="text-xs text-stone-500">Terakhir datang</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredCustomers.length === 0 && !loading && (
          <div className="mt-4 rounded-[1.5rem] border border-dashed border-stone-200 bg-stone-50 p-6 text-center text-sm text-stone-500">
            Tidak ada pelanggan yang terdaftar.
          </div>
        )}
      </div>
    </Layout>
  );
}