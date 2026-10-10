import { useState, useEffect } from "react";
import { apiClient } from "../lib/apiClient";
import Layout from "../components/layout/Layout";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";

export default function Settings({ onLogout }) {
  const [settings, setSettings] = useState([]);
  const [editingKey, setEditingKey] = useState(null);
  const [draftValue, setDraftValue] = useState("");
  const [loading, setLoading] = useState(true);

  // 1. Tarik data dari database saat halaman dibuka
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/pengaturan');
      setSettings(data || []);
    } catch (error) {
      console.error("Gagal memuat pengaturan:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // 2. Fungsi saat tombol "Lihat & Edit" ditekan
  const startEditing = (item) => {
    setEditingKey(item.title);
    setDraftValue(item.detail);
  };

  // 3. Fungsi saat tombol "Simpan" ditekan (Update ke Supabase)
  const saveEditing = async (item) => {
    try {
      await apiClient.put(`/pengaturan/${item.id}`, { detail: draftValue });

      // Jika sukses, update tampilan di layar
      setSettings((current) =>
        current.map((s) => (s.id === item.id ? { ...s, detail: draftValue } : s))
      );
      setEditingKey(null); // Tutup mode edit
    } catch (error) {
      console.error("Gagal menyimpan:", error.message);
      alert("Gagal menyimpan perubahan ke database.");
    }
  };

  return (
    <Layout onLogout={onLogout}>
      <PageHeader
        subtitle="Pengaturan"
        title="Preferensi operasional"
        description="Atur jam operasional, metode pembayaran, dan notifikasi dengan mudah."
        status="Terkoneksi Database"
        actions={<Button variant="secondary" onClick={fetchSettings}>Refresh Data</Button>}
      />

      <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium text-amber-600">Pengaturan</p>
          <h2 className="mt-1 text-2xl font-semibold text-stone-900">Atur preferensi operasional</h2>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <p className="text-sm text-stone-500">Memuat pengaturan dari database...</p>
          ) : (
            settings.map((item) => {
              const isEditing = editingKey === item.title;

              return (
                <div key={item.id} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-900">{item.title}</p>
                      {isEditing ? (
                        <input
                          value={draftValue}
                          onChange={(event) => setDraftValue(event.target.value)}
                          className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-amber-400 focus:ring-1"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-stone-600">{item.detail}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => (isEditing ? saveEditing(item) : startEditing(item))}
                      className="rounded-full bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-700"
                    >
                      {isEditing ? "Simpan" : "Lihat & Edit"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}