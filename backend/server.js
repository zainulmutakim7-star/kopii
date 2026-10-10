require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'zcoffee',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Auth (Mock for now to replace Supabase auth)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (rows.length > 0) {
      res.json({ user: rows[0], session: { access_token: 'dummy-token' } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/user', (req, res) => {
  // Mock getUser
  res.json({ user: { id: 1, email: 'admin@admin.com' } });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out' });
});

// Produk
app.get('/api/produk', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM produk');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/produk', async (req, res) => {
  try {
    const { nama, harga, kategori, stok, gambar } = req.body;
    const [result] = await pool.query('INSERT INTO produk (nama, harga, kategori, stok, gambar) VALUES (?, ?, ?, ?, ?)', [nama, harga, kategori, stok, gambar]);
    res.json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/produk/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM produk WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pelanggan
app.get('/api/pelanggan', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pelanggan');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pelanggan', async (req, res) => {
  try {
    const { nama, no_hp, email, alamat, total_order, terakhir_datang } = req.body;
    const [result] = await pool.query(
      'INSERT INTO pelanggan (nama, no_hp, email, alamat, total_order, terakhir_datang) VALUES (?, ?, ?, ?, ?, ?)',
      [nama, no_hp, email, alamat, total_order || 0, terakhir_datang || null]
    );
    res.json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pelanggan/:id', async (req, res) => {
  try {
    const { total_order, terakhir_datang } = req.body;
    await pool.query(
      'UPDATE pelanggan SET total_order = ?, terakhir_datang = ? WHERE id = ?',
      [total_order, terakhir_datang, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/pelanggan/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM pelanggan WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transaksi
app.get('/api/transaksi', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.*, u.email as nama_kasir, 
             COALESCE((SELECT SUM(jumlah) FROM transaksi_detail td WHERE td.transaksi_id = t.id), 0) as total_items
      FROM transaksi t
      LEFT JOIN users u ON t.kasir_id = u.id
      ORDER BY t.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transaksi', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { total_harga, metode_pembayaran, pelanggan_id, items } = req.body;
    
    // Insert transaksi
    const [trxResult] = await connection.query(
      'INSERT INTO transaksi (kasir_id, pelanggan_id, total_harga, metode_pembayaran) VALUES (?, ?, ?, ?)',
      [1, pelanggan_id || null, total_harga, metode_pembayaran] // Mock kasir_id = 1
    );
    const transaksi_id = trxResult.insertId;

    // Insert detail
    for (const item of items) {
      await connection.query(
        'INSERT INTO transaksi_detail (transaksi_id, produk_id, jumlah, harga_satuan, subtotal) VALUES (?, ?, ?, ?, ?)',
        [transaksi_id, item.id, item.quantity, item.harga, item.harga * item.quantity]
      );
    }

    await connection.commit();
    res.json({ id: transaksi_id });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Karyawan
app.get('/api/karyawan', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM karyawan');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/karyawan', async (req, res) => {
  try {
    const { nama, posisi, gaji } = req.body;
    const [result] = await pool.query('INSERT INTO karyawan (nama, posisi, gaji) VALUES (?, ?, ?)', [nama, posisi, gaji]);
    res.json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/karyawan/:id', async (req, res) => {
  try {
    const { nama, posisi, gaji } = req.body;
    await pool.query('UPDATE karyawan SET nama = ?, posisi = ?, gaji = ? WHERE id = ?', [nama, posisi, gaji, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/karyawan/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM karyawan WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Absensi
app.get('/api/absensi', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM absensi');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/absensi', async (req, res) => {
  try {
    const { karyawan_id, tanggal, waktu_masuk, waktu_keluar, status, keterangan } = req.body;
    const [result] = await pool.query(
      'INSERT INTO absensi (karyawan_id, tanggal, waktu_masuk, waktu_keluar, status, keterangan) VALUES (?, ?, ?, ?, ?, ?)',
      [karyawan_id, tanggal, waktu_masuk, waktu_keluar, status, keterangan]
    );
    res.json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pengaturan
app.get('/api/pengaturan', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pengaturan ORDER BY id ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pengaturan/:id', async (req, res) => {
  try {
    const { detail } = req.body;
    await pool.query('UPDATE pengaturan SET detail = ? WHERE id = ?', [detail, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
