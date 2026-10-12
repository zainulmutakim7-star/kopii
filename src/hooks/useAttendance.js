import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../lib/apiClient";

export default function useAttendance() {
  const [employees, setEmployees] = useState([]);
  const [report, setReport] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [lastAction, setLastAction] = useState(null);

  // 1. Tarik data awal dari API
  const loadInitialData = useCallback(async () => {
    setIsInitializing(true);
    setError(null);
    try {
      // Tarik data Karyawan
      const dataKaryawan = await apiClient.get('/karyawan');
      setEmployees(dataKaryawan || []);

      // Tarik data Absensi
      const dataAbsensi = await apiClient.get('/absensi');

      // Format data absensi agar cocok dengan desain UI Dashboard
      const formattedReport = (dataAbsensi || []).map((item) => {
        const tone =
          item.status === "Hadir"
            ? "bg-emerald-50 text-emerald-700"
            : item.status === "Telat"
              ? "bg-amber-50 text-amber-700"
              : "bg-slate-50 text-slate-700";

        return {
          id: item.id,
          employeeId: item.karyawan?.id,
          name: item.karyawan?.name || "Karyawan Terhapus",
          role: item.karyawan?.role || "-",
          status: item.status,
          time: item.waktu,
          date: item.tanggal,
          tone,
        };
      });

      setReport(formattedReport);
    } catch (err) {
      console.error("Gagal memuat data:", err.message);
      setError("Gagal memuat data dari database.");
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Verifikasi PIN untuk Absensi
  const verifyPin = useCallback(
    async ({ employeeId, pin }) => {
      setIsSubmitting(true);
      setError(null);
      setLastAction(null);

      const employee = employees.find((item) => String(item.id) === String(employeeId));

      if (!employee) {
        setIsSubmitting(false);
        setError("Karyawan tidak ditemukan.");
        return { ok: false, message: "Karyawan tidak ditemukan.", employee: null };
      }

      if (String(employee.pin) !== String(pin)) {
        setIsSubmitting(false);
        setError("PIN tidak valid. Silakan cek kembali.");
        return { ok: false, message: "PIN tidak valid.", employee: null };
      }

      const now = new Date();
      const timeLabel = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

      const result = {
        ok: true,
        message: `PIN valid untuk ${employee.name}.`,
        employee,
        type: "masuk",
        time: timeLabel,
      };

      setLastAction(result);
      setIsSubmitting(false);
      return result;
    },
    [employees]
  );

  // 3. Simpan Absensi Baru ke API
  const recordAttendance = useCallback(
    async ({ employeeId, type = "masuk" }) => {
      setIsSubmitting(true);
      setError(null);

      const employee = employees.find((item) => String(item.id) === String(employeeId));
      if (!employee) {
        setIsSubmitting(false);
        return { ok: false, message: "Karyawan tidak ditemukan." };
      }

      const now = new Date();
      const timeLabel = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const date = now.toISOString().slice(0, 10);

      // Logika Keterlambatan (Batas jam 08:00)
      const status = type === "masuk" ? (timeLabel > "08:00" ? "Telat" : "Hadir") : "Pulang";

      try {
        await apiClient.post('/absensi', {
          karyawan_id: employee.id,
          status,
          waktu: timeLabel,
          tanggal: date,
        });

        // Tarik ulang data terbaru dari database
        await loadInitialData();

        const result = {
          ok: true,
          message: `${employee.name} tercatat ${type} pukul ${timeLabel}.`,
          employee,
          type,
          time: timeLabel,
        };

        setLastAction(result);
        setIsSubmitting(false);
        return result;
      } catch (err) {
        setIsSubmitting(false);
        setError("Gagal mencatat absensi.");
        return { ok: false, message: "Gagal mencatat absensi." };
      }
    },
    [employees, loadInitialData]
  );

  // 4. Tambah Karyawan Baru ke API
  const addEmployee = useCallback(async ({ name, role, pin }) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const data = await apiClient.post('/karyawan', {
        name: name.trim(),
        role: role.trim(),
        pin: String(pin).trim(),
      });

      setEmployees((current) => [...current, data]);

      const result = { ok: true, message: `Karyawan ${data.name} berhasil ditambahkan.` };
      setLastAction(result);
      setIsSubmitting(false);
      return result;
    } catch (err) {
      setIsSubmitting(false);
      setError("Gagal menambah karyawan.");
      return { ok: false };
    }
  }, []);

  // 5. Update Karyawan di API
  const updateEmployee = useCallback(async ({ id, name, role, pin }) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const data = await apiClient.put(`/karyawan/${id}`, {
        name: name.trim(),
        role: role.trim(),
        pin: String(pin).trim(),
      });

      setEmployees((current) => current.map((emp) => (String(emp.id) === String(id) ? data : emp)));

      const result = { ok: true, message: `Data ${data.name} berhasil diperbarui.` };
      setLastAction(result);
      setIsSubmitting(false);
      return result;
    } catch (err) {
      setIsSubmitting(false);
      setError("Gagal memperbarui karyawan.");
      return { ok: false };
    }
  }, []);

  // 6. Hapus Karyawan dari API
  const deleteEmployee = useCallback(async (employeeId) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.delete(`/karyawan/${employeeId}`);

      setEmployees((current) => current.filter((emp) => String(emp.id) !== String(employeeId)));

      const result = { ok: true, message: `Karyawan berhasil dihapus.` };
      setLastAction(result);
      setIsSubmitting(false);
      return result;
    } catch (err) {
      setIsSubmitting(false);
      setError("Gagal menghapus karyawan.");
      return { ok: false };
    }
  }, []);

  const refreshReport = useCallback(() => {
    loadInitialData();
  }, [loadInitialData]);

  return {
    employees,
    report,
    isInitializing,
    isSubmitting,
    error,
    lastAction,
    verifyPin,
    recordAttendance,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refreshReport,
  };
}