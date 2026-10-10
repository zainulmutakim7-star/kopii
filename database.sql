-- Database Schema for z-coffee-hening

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS produk (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    harga DECIMAL(10, 2) NOT NULL,
    kategori VARCHAR(100),
    stok INT DEFAULT 0,
    gambar TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pelanggan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    no_hp VARCHAR(20),
    email VARCHAR(255),
    alamat TEXT,
    total_order INT DEFAULT 0,
    terakhir_datang DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS karyawan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    posisi VARCHAR(100),
    gaji DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS absensi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    karyawan_id INT,
    tanggal DATE NOT NULL,
    waktu_masuk TIME,
    waktu_keluar TIME,
    status VARCHAR(50),
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (karyawan_id) REFERENCES karyawan(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transaksi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kasir_id INT,
    pelanggan_id INT,
    total_harga DECIMAL(10, 2) NOT NULL,
    metode_pembayaran VARCHAR(50),
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kasir_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (pelanggan_id) REFERENCES pelanggan(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS transaksi_detail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaksi_id INT,
    produk_id INT,
    jumlah INT NOT NULL,
    harga_satuan DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (transaksi_id) REFERENCES transaksi(id) ON DELETE CASCADE,
    FOREIGN KEY (produk_id) REFERENCES produk(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pengaturan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    detail TEXT
);

INSERT INTO pengaturan (title, detail) VALUES 
('Jam Operasional', '08:00 - 22:00'),
('Metode Pembayaran', 'Cash, QRIS')
ON DUPLICATE KEY UPDATE detail=detail;

-- Insert default admin (password: admin123)
-- In a real app, this should be a hashed password. We'll use simple plain text or a hash depending on the backend.
-- Let's use bcrypt hash for 'admin123' -> $2b$10$wOEKFhN63iY06T81aUj5gO05Z2xP2wT/P6bO6gK9Ew9vK3Ew/vYvO (Wait, I'll let backend handle auth or just insert a dummy user).
INSERT INTO users (email, password) VALUES ('admin@admin.com', 'admin123') ON DUPLICATE KEY UPDATE email=email;
