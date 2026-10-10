import React, { useState, useEffect, useMemo } from "react";
import { apiClient } from "../lib/apiClient";
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle2, Loader2, Search, Coffee, Home, Printer } from "lucide-react";

export default function Transaksi() {
    const [produk, setProduk] = useState([]);
    const [keranjang, setKeranjang] = useState([]);
    const [loading, setLoading] = useState(true);
    const [prosesBayar, setProsesBayar] = useState(false);
    const [notifSukses, setNotifSukses] = useState(false);
    const [showRecap, setShowRecap] = useState(false);
    const [dataStruk, setDataStruk] = useState(null);

    // State Pembayaran (Uang Bayar & Kembalian)
    const [showModalBayar, setShowModalBayar] = useState(false);
    const [showCart, setShowCart] = useState(false);
    const [uangBayar, setUangBayar] = useState("");

    // State untuk filter dan pencarian
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Semua");

    const categories = ["Semua", "Kopi", "Non-Kopi", "Makanan", "Snack"];

    const fetchProduk = async (isBackground = false) => {
        try {
            // Cek cache lokal agar bisa langsung tampil (Instan)
            if (!isBackground) {
                const cachedData = localStorage.getItem("cache_produk");
                if (cachedData) {
                    setProduk(JSON.parse(cachedData));
                    setLoading(false); // Jangan tampilkan spinner jika sudah ada data dari cache
                } else {
                    setLoading(true);
                }
            }

            const produkData = await apiClient.get('/produk');

            // apiClient throws on error, no explicit error variable

            setProduk(produkData || []);
            localStorage.setItem("cache_produk", JSON.stringify(produkData || [])); // Simpan data terbaru ke cache
        } catch (error) {
            console.error("Gagal memuat produk:", error.message);
        } finally {
            if (!isBackground || !localStorage.getItem("cache_produk")) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchProduk();
    }, []);

    // Filter produk berdasarkan pencarian dan kategori
    const filteredProduk = useMemo(() => {
        return produk.filter((item) => {
            const matchSearch = item.nama_produk.toLowerCase().includes(searchQuery.toLowerCase());
            // Jika produk tidak punya kategori, fallback ke "Kopi"
            const itemCat = item.kategori || "Kopi";
            const matchCategory = selectedCategory === "Semua" || itemCat === selectedCategory;
            return matchSearch && matchCategory;
        });
    }, [produk, searchQuery, selectedCategory]);

    const tambahKeKeranjang = (item) => {
        if (item.stok <= 0) return;

        setKeranjang((prev) => {
            const ada = prev.find((p) => p.id === item.id);
            if (ada) {
                if (ada.jumlah >= item.stok) return prev;
                return prev.map((p) =>
                    p.id === item.id ? { ...p, jumlah: p.jumlah + 1 } : p
                );
            }
            return [...prev, { ...item, jumlah: 1 }];
        });
    };

    const kurangiDariKeranjang = (id) => {
        setKeranjang((prev) =>
            prev
                .map((p) => (p.id === id ? { ...p, jumlah: p.jumlah - 1 } : p))
                .filter((p) => p.jumlah > 0)
        );
    };

    const hapusItem = (id) => {
        setKeranjang((prev) => prev.filter((p) => p.id !== id));
    };

    // Perhitungan Keuangan
    const subtotal = keranjang.reduce((total, item) => total + (item.harga * item.jumlah), 0);
    const totalHarga = subtotal;
    const nominalUangBayar = parseInt(uangBayar.replace(/\D/g, "") || "0");
    const kembalian = nominalUangBayar - totalHarga;

    const bukaModalBayar = () => {
        if (keranjang.length === 0) return;
        setUangBayar(""); // reset tiap buka
        setShowModalBayar(true);
    };

    const prosesTransaksi = async () => {
        if (keranjang.length === 0) return;
        setProsesBayar(true);

        try {
            // Karena ini transaksi nyata, simpan totalHarga beserta user_id untuk RLS
            // Dapatkan user yang sedang login (Supabase v2)
            // TODO: Replace with proper auth handling
            const user = null;
            const dataTrx = await apiClient.post('/transaksi', {
                total_harga: totalHarga,
                user_id: user ? user.id : null
            });

            // Assume apiClient throws on error, proceed
            const transaksiId = dataTrx.id;

            const detailBelanja = keranjang.map((item) => ({
    transaksi_id: transaksiId,
    produk_id: item.id,
    jumlah_beli: item.jumlah,
    harga_satuan: item.harga,
    user_id: user ? user.id : null,
}));

            await apiClient.post('/detail_transaksi', detailBelanja);

            for (const item of keranjang) {
                const sisaStok = item.stok - item.jumlah;
                await apiClient.put(`/produk/${item.id}`, { stok: sisaStok });
            }

            // Simpan data untuk Struk
            // Sertakan info user pada struk (jika ada)
            setDataStruk({
                id: transaksiId,
                waktu: new Date().toLocaleString("id-ID"),
                items: [...keranjang],
                subtotal: subtotal,
                total: totalHarga,
                uangBayar: nominalUangBayar,
                kembalian: kembalian,
                kasir: user ? user.email || "Kasir" : "Kasir",
                userId: user ? user.id : null
            });
            // Show recap modal after successful transaction
            setShowRecap(true);

            // 1. Kurangi stok produk secara lokal untuk update tampilan secara instan
            setProduk(prevProduk =>
                prevProduk.map(p => {
                    const dibeli = keranjang.find(k => k.id === p.id);
                    return dibeli ? { ...p, stok: p.stok - dibeli.jumlah } : p;
                })
            );

            setNotifSukses(true);
            setKeranjang([]);
            setShowModalBayar(false);
            setUangBayar("");

            // 2. Lakukan sinkronisasi database di latar belakang (tanpa loading)
            fetchProduk(true);

            // Removed auto-print, user will use the "Cetak" button on the modal.
            // setTimeout(() => {
            //     window.print();
            // }, 500);

            setTimeout(() => setNotifSukses(false), 3000);

        } catch (error) {
            console.error("Gagal memproses transaksi:", error.message);
            alert(`Terjadi kesalahan saat memproses pembayaran.\nDetail: ${error.message}`);
        } finally {
            setProsesBayar(false);
        }
    };

    // Helper image yang disesuaikan dengan nama produk
    const getProductImage = (nama, category, id) => {
        if (!nama) return "";
        const nameLower = nama.toLowerCase();

        // Kategori Kopi
        if (nameLower.includes("espresso")) return "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&h=300&fit=crop"; // Espresso
        if (nameLower.includes("latte")) return "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=400&h=300&fit=crop"; // Latte art
        if (nameLower.includes("cappuccino")) return "https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&h=300&fit=crop"; // Cappuccino
        if (nameLower.includes("americano") || nameLower.includes("hitam") || nameLower.includes("black")) return "https://images.unsplash.com/photo-1551030173-122aabc4489c?w=400&h=300&fit=crop"; // Black coffee
        if (nameLower.includes("mocha") || nameLower.includes("moka")) return "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop"; // Mocha
        if (nameLower.includes("v60") || nameLower.includes("filter") || nameLower.includes("drip")) return "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=400&h=300&fit=crop"; // Pour over
        if (nameLower.includes("kopi susu")) return "https://images.unsplash.com/photo-1599321955726-e04842669811?w=400&h=300&fit=crop"; // Es kopi susu

        // Kategori Non-Kopi
        if (nameLower.includes("matcha") || nameLower.includes("green tea")) return "https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=400&h=300&fit=crop"; // Matcha
        if (nameLower.includes("coklat") || nameLower.includes("chocolate")) return "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&h=300&fit=crop"; // Hot chocolate
        if (nameLower.includes("teh") || nameLower.includes("tea")) return "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop"; // Iced tea / Tea
        if (nameLower.includes("jus") || nameLower.includes("juice")) return "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop"; // Orange juice
        if (nameLower.includes("red velvet")) return "https://images.unsplash.com/photo-1626359553755-e8d9105ff7cc?w=400&h=300&fit=crop"; // Red velvet drink
        if (nameLower.includes("taro")) return "https://images.unsplash.com/photo-1617462002347-8321a64161bb?w=400&h=300&fit=crop"; // Taro drink (purple)
        if (nameLower.includes("susu") || nameLower.includes("milk")) return "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop"; // Milk

        // Kategori Makanan
        if (nameLower.includes("kentang") || nameLower.includes("fries")) return "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&h=300&fit=crop"; // French fries
        if (nameLower.includes("burger")) return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop"; // Burger
        if (nameLower.includes("roti") || nameLower.includes("croissant") || nameLower.includes("toast")) return "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop"; // Bread/toast
        if (nameLower.includes("kue") || nameLower.includes("cake") || nameLower.includes("brownies")) return "https://images.unsplash.com/photo-1578985545062-69928b1ea76e?w=400&h=300&fit=crop"; // Cake
        if (nameLower.includes("mie") || nameLower.includes("noodle") || nameLower.includes("spaghetti") || nameLower.includes("pasta")) return "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop"; // Noodles/Pasta
        if (nameLower.includes("nasi")) return "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop"; // Rice dish
        if (nameLower.includes("dimsum") || nameLower.includes("siomay") || nameLower.includes("bakwan") || nameLower.includes("pangsit")) return "https://images.unsplash.com/photo-1582294451075-f215d263901b?w=400&h=300&fit=crop"; // Dimsum/Pangsit

        // Fallback default berdasarkan kategori (jika nama tidak cocok dengan kata kunci di atas)
        const seed = id || Math.random();
        if (category === "Kopi") return `https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400&h=300&fit=crop&q=80&sig=${seed}`;
        if (category === "Non-Kopi") return `https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop&q=80&sig=${seed}`;
        if (category === "Makanan") return `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&q=80&sig=${seed}`;

        if (category === "Snack") return `https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop&q=80&sig=${seed}`;
    };

    const formatRp = (angka) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(angka);

    const handleUangBayarChange = (e) => {
        const val = e.target.value.replace(/\D/g, "");
        if (!val) {
            setUangBayar("");
            return;
        }
        setUangBayar(parseInt(val).toLocaleString("id-ID"));
    };

    const handleUangPas = () => {
        setUangBayar(totalHarga.toLocaleString("id-ID"));
    };

    return (
        <div className="absolute inset-0 flex flex-col lg:flex-row overflow-hidden bg-[#F8F9FA] font-sans selection:bg-amber-200 z-10">

                {/* BAGIAN KIRI: Menu & Pencarian (70%) */}
            <div className={`flex-[7] flex flex-col h-full overflow-hidden ${showCart ? 'hidden md:flex' : ''}`} >
                {/* Header Kiri: Search & Filter (Glassmorphism) */}
                <div className="px-6 py-5 bg-white/70 backdrop-blur-xl border-b border-gray-200/60 z-10 sticky top-0">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-5">
                        <div>
                            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent tracking-tight">
                                Point of Sale
                            </h1>
                            <p className="text-sm text-gray-500 font-medium mt-1">Pilih menu favorit pelanggan hari ini</p>
                        </div>
                        <div className="relative w-full md:w-[22rem]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari menu kopi, makanan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-white/50 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300 shadow-sm"
                            />
                        </div>
                    </div>
                    {/* Category Pills */}
                    <div className="flex gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`whitespace-nowrap px-6 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 ${selectedCategory === cat
                                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105"
                                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Konten Menu */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#F8F9FA]">
                    {loading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
                        </div>
                    ) : filteredProduk.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-gray-400">
                            <div className="p-6 bg-white rounded-full shadow-sm mb-4">
                                <Coffee className="h-16 w-16 text-gray-300" />
                            </div>
                            <p className="text-xl font-semibold text-gray-600">Menu tidak ditemukan</p>
                            <p className="text-sm mt-2">Coba kata kunci atau kategori lain.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredProduk.map((item) => {
                                const isHabis = item.stok <= 0;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => tambahKeKeranjang(item)}
                                        disabled={isHabis}
                                        className={`group relative flex flex-col text-left bg-white rounded-[24px] overflow-hidden transition-all duration-300 ${isHabis
                                            ? "opacity-50 grayscale cursor-not-allowed border border-gray-200"
                                            : "cursor-pointer hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2 border border-gray-100 hover:border-amber-200"
                                            }`}
                                    >
                                        <div className="w-full aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                            <img
                                                src={getProductImage(item.nama_produk, item.kategori, item.id)}
                                                alt={item.nama_produk}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                            {/* Overlay Gradient */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                            <div className={`absolute top-3 right-3 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm border ${isHabis ? 'bg-red-500/90 text-white border-red-400' : 'bg-white/90 text-gray-800 border-white/20'
                                                }`}>
                                                {isHabis ? 'Habis' : `Stok: ${item.stok}`}
                                            </div>
                                        </div>
                                        <div className="p-5 flex flex-col flex-1 justify-between bg-white z-10">
                                            <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 text-[15px] group-hover:text-amber-600 transition-colors">{item.nama_produk}</h3>
                                            <div className="mt-3 flex items-center justify-between">
                                                <p className="text-amber-500 font-extrabold text-lg tracking-tight">
                                                    {formatRp(item.harga)}
                                                </p>
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 ${isHabis ? 'bg-gray-100 text-gray-400' : 'bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white'}`}>
                                                    <Plus className="h-5 w-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Mobile Toggle Cart Button */}
                <button 
                    onClick={() => setShowCart(true)}
                    className="md:hidden fixed bottom-6 right-6 z-40 bg-amber-500 text-white p-4 rounded-full shadow-lg"
                >
                    <ShoppingCart className="h-6 w-6" />
                    {keranjang.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 flex items-center justify-center rounded-full font-bold">
                            {keranjang.length}
                        </span>
                    )}
                </button>
            </div>

            {/* BAGIAN KANAN: Keranjang & Pembayaran (30%) */}
            <div className={`fixed inset-0 w-full max-w-full md:inset-y-0 md:right-0 md:w-full md:max-w-md bg-white z-50 shadow-[-20px_0_40px_rgba(0,0,0,0.04)] transform transition-transform duration-300 flex flex-col h-full ${showCart ? "translate-x-0" : "translate-x-full"} md:relative md:translate-x-0 md:shadow-none`}>
                {/* Header Keranjang */}
                <div className="p-6 border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl shadow-inner border border-amber-100/50">
                            <ShoppingCart className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Pesanan Baru</h2>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">{keranjang.length} item di keranjang</p>
                        </div>
                        {/* Mobile close button */}
                        {showCart && (
                            <button onClick={() => setShowCart(false)} className="md:hidden text-gray-500 hover:text-gray-700 text-2xl font-bold">✕</button>
                        )}
                    </div>
                </div>

                {/* Daftar Keranjang */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                    {keranjang.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-60">
                            <div className="p-6 bg-white rounded-full shadow-sm mb-4">
                                <ShoppingCart className="h-12 w-12 text-gray-300" />
                            </div>
                            <p className="text-base font-bold text-gray-600">Keranjang masih kosong</p>
                            <p className="text-sm text-gray-400 mt-1">Pilih menu untuk mulai pesanan</p>
                        </div>
                    ) : (
                        keranjang.map((item) => (
                            <div key={item.id} className="group flex flex-col p-4 bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:border-amber-200 hover:shadow-md transition-all duration-300">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="font-bold text-gray-800 text-[15px] pr-4 leading-tight">{item.nama_produk}</span>
                                    <button onClick={() => hapusItem(item.id)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex justify-between items-end">
                                    <p className="text-amber-500 font-bold text-base">
                                        {formatRp(item.harga * item.jumlah)}
                                    </p>
                                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border border-gray-200">
                                        <button onClick={() => kurangiDariKeranjang(item.id)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm hover:text-amber-500 hover:border-amber-200 border border-transparent transition-all">
                                            <Minus className="h-4 w-4" />
                                        </button>
                                        <span className="text-sm font-bold w-6 text-center text-gray-800">{item.jumlah}</span>
                                        <button
                                            onClick={() => tambahKeKeranjang(item)}
                                            disabled={item.jumlah >= item.stok}
                                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm hover:text-amber-500 hover:border-amber-200 border border-transparent transition-all disabled:opacity-50"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Ringkasan & Tombol Bayar */}
                <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-20px_40px_rgba(0,0,0,0.03)] z-10">

                    <button
                        onClick={bukaModalBayar}
                        disabled={keranjang.length === 0}
                        className="group relative w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-5 rounded-2xl transition-all duration-300 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed shadow-[0_10px_20px_-10px_rgba(245,158,11,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(245,158,11,0.6)] active:scale-[0.98] overflow-hidden"
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none"></div>

                        {prosesBayar ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            <span className="text-lg tracking-wider">Proses Pembayaran</span>
                        )}
                    </button>
                </div>

                {/* Notifikasi Sukses Melayang */}
                {/* Success toast (optional) */}
        {notifSukses && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] flex items-center gap-3 animate-bounce z-50 font-medium">
                <CheckCircle2 className="h-6 w-6" />
                <span>Transaksi Berhasil Disimpan!</span>
            </div>
        )}
        {/* Order recap modal */}
        {showRecap && dataStruk && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 print:hidden">
                <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] max-w-sm w-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] border border-white/50 overflow-hidden relative animate-in fade-in zoom-in duration-300">
                    
                    {/* Decorative Background Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-emerald-100/50 to-transparent pointer-events-none"></div>

                    <button onClick={() => setShowRecap(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 bg-white/50 hover:bg-gray-100 rounded-full p-2 backdrop-blur-sm transition-all z-10">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    
                    <div className="p-8 pt-10 flex flex-col items-center relative z-0">
                        {/* Success Icon */}
                        <div className="w-20 h-20 bg-gradient-to-tr from-emerald-400 to-emerald-500 rounded-full shadow-[0_10px_30px_-10px_rgba(16,185,129,0.8)] flex items-center justify-center mb-5 border-4 border-white">
                            <CheckCircle2 className="h-10 w-10 text-white" />
                        </div>
                        
                        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-emerald-200/50 bg-emerald-50 mb-3 shadow-sm">
                            <span className="font-extrabold text-xs tracking-widest text-emerald-600">LUNAS</span>
                        </div>
                        
                        <h3 className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">Terima Kasih</h3>
                        
                        <div className="bg-gray-100/70 border border-gray-200 text-gray-500 font-mono text-[11px] tracking-widest px-4 py-1.5 rounded-full mb-8">
                            {typeof dataStruk.id === 'string' && dataStruk.id.includes('-') ? `KTS${dataStruk.id.split('-')[0].toUpperCase()}` : `KTS${dataStruk.id}`}
                        </div>
                        
                        {/* Detail Card */}
                        <div className="w-full bg-white border border-gray-100 rounded-2xl p-5 mb-8 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden">
                            {/* Watermark/Texture subtle */}
                            <div className="absolute -right-6 -top-6 text-gray-50/50">
                                <Coffee className="h-32 w-32" />
                            </div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium text-gray-500">Tipe Pesanan</span>
                                    <span className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">Regular</span>
                                </div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium text-gray-500">Total Transaksi</span>
                                    <span className="text-base font-black text-amber-600">{formatRp(dataStruk.total)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-5">
                                    <span className="text-sm font-medium text-gray-500">Tunai</span>
                                    <span className="text-sm font-bold text-gray-700">{formatRp(dataStruk.uangBayar)}</span>
                                </div>
                                
                                <div className="border-t border-dashed border-gray-200 pt-4 flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-500">Kembalian</span>
                                    <span className="text-sm font-bold text-emerald-500">{formatRp(dataStruk.kembalian)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="w-full flex gap-3">
                            <button 
                                onClick={() => setShowRecap(false)} 
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 hover:text-gray-900 transition-all"
                            >
                                <Home className="h-5 w-5" />
                                Kembali
                            </button>
                            <button 
                                onClick={() => window.print()}
                                className="flex-[1.5] flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_30px_-15px_rgba(0,0,0,0.6)] hover:-translate-y-0.5"
                            >
                                <Printer className="h-5 w-5" />
                                Cetak
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
            </div>

            {/* MODAL PEMBAYARAN */}
            {showModalBayar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-2xl font-extrabold text-gray-900">Pembayaran</h2>
                            <p className="text-sm text-gray-500 mt-1">Masukkan uang yang diterima dari pelanggan</p>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex justify-between items-center bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <span className="font-bold text-amber-700">Total Tagihan</span>
                                <span className="text-2xl font-black text-amber-600">{formatRp(totalHarga)}</span>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-gray-700">Uang Diterima (Rp)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                                    <input
                                        type="text"
                                        value={uangBayar}
                                        onChange={handleUangBayarChange}
                                        placeholder="0"
                                        autoFocus
                                        className="w-full pl-12 pr-4 py-4 text-xl font-bold rounded-xl border-2 border-gray-200 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all text-gray-900"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleUangPas} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors">Uang Pas</button>
                                    <button onClick={() => setUangBayar((totalHarga + 10000 - (totalHarga % 10000)).toLocaleString("id-ID"))} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors">Bulatkan</button>
                                </div>
                            </div>

                            <div className={`p-4 rounded-xl border ${kembalian < 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'} flex justify-between items-center`}>
                                <span className="font-bold text-gray-600">Kembalian</span>
                                <span className={`text-xl font-black ${kembalian < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                    {kembalian < 0 ? "-" : ""}{formatRp(Math.abs(kembalian))}
                                </span>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setShowModalBayar(false)}
                                className="flex-1 py-4 font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={prosesTransaksi}
                                disabled={kembalian < 0 || prosesBayar || !uangBayar}
                                className="flex-[2] py-4 font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {prosesBayar ? <Loader2 className="h-5 w-5 animate-spin" /> : "Selesaikan & Cetak"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* COMPONENT STRUK (Hanya Tampil Saat Print) */}
            {dataStruk && (
                <div id="printable-receipt" className="hidden print:block bg-white text-black p-2 w-[58mm] mx-auto text-[12px] font-mono leading-tight">
                    <div className="text-center mb-3 border-b border-black pb-2 border-dashed">
                        <h2 className="font-bold text-[18px]">Z COFFEE HENING</h2>
                        <p>Jl. Contoh Alamat No.123</p>
                    </div>

                    <div className="mb-3 text-[10px]">
                        <p>No   : {dataStruk.id}</p>
                        <p>Kasir: {dataStruk.kasir}</p>
                        <p>Waktu: {dataStruk.waktu}</p>
                    </div>

                    <div className="border-t border-b border-black border-dashed py-2 mb-2">
                        {dataStruk.items.map((item, idx) => (
                            <div key={idx} className="mb-2">
                                <p className="font-bold">{item.nama_produk}</p>
                                <div className="flex justify-between pl-2">
                                    <span>{item.jumlah}x {item.harga.toLocaleString("id-ID")}</span>
                                    <span>{(item.jumlah * item.harga).toLocaleString("id-ID")}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between font-bold text-[16px] mt-2 border-t border-black border-dashed pt-2">
                        <span>TOTAL</span>
                        <span>Rp{dataStruk.total.toLocaleString("id-ID")}</span>
                    </div>

                    <div className="flex justify-between text-[14px] mt-1">
                        <span>TUNAI</span>
                        <span>Rp{dataStruk.uangBayar?.toLocaleString("id-ID") || 0}</span>
                    </div>
                    <div className="flex justify-between text-[14px] mt-1 border-b border-black border-dashed pb-2">
                        <span>KEMBALI</span>
                        <span>Rp{dataStruk.kembalian?.toLocaleString("id-ID") || 0}</span>
                    </div>

                    <div className="text-center mt-6 text-[10px]">
                        <p>Terima Kasih Atas Kunjungan Anda</p>
                        <p className="mt-1 font-bold">=== LUNAS ===</p>
                    </div>
                </div>
            )}

        </div>
    );
}