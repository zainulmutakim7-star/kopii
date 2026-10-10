// src/pages/Transaksi.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import React from 'react';
import Transaksi from './Transaksi';
import { vi } from 'vitest';

// ------------------------------------------------------------------
// Global stubs
// ------------------------------------------------------------------
// Stub global localStorage for the component (Node environment)
vi.stubGlobal('alert', vi.fn());
vi.stubGlobal('print', vi.fn());

// ------------------------------------------------------------------
// Mock data
// ------------------------------------------------------------------
const mockProduk = [
  {
    id: 1,
    nama_produk: 'Kopi Arabika',
    harga: 20000,
    stok: 10,
    kategori: 'Kopi',
  },
];

// ------------------------------------------------------------------
// Mock Supabase client
// ------------------------------------------------------------------
vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue(mockProduk),
    post: vi.fn().mockResolvedValue({ data: { id: 123 } }),
    // Add other methods if needed for future tests
  }
}));

/**
 * Test the full cashier flow:
 * 1. Render the page (user is considered logged‑in via the mocked getUser).
 * 2. Add a product to the cart (the product list is supplied via the mocked Supabase call).
 * 3. Open the payment modal, enter a sufficient amount, submit.
 * 4. Verify the success toast appears.
 */

test('kasir can complete a transaction and see success notification', async () => {
  // Make the component think there is cached product data
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => JSON.stringify(mockProduk)),
    setItem: vi.fn(),
    clear: vi.fn(),
  });

  render(
    <BrowserRouter>
      <AuthProvider>
        <Transaksi />
      </AuthProvider>
    </BrowserRouter>
  );

  // Wait for the product card and click the '+' button to add one item
  // Find the product card button by product name and click to add to cart
  const addBtn = await screen.findByRole('button', { name: /Kopi Arabika/i });
  await userEvent.click(addBtn);

  // Click the main "Bayar" button to open the payment modal
  const bayarBtn = screen.getByRole('button', { name: /bayar/i });
  await userEvent.click(bayarBtn);

  // Fill the amount input (make it larger than total)
  const uangInput = await screen.findByPlaceholderText('0');
  await userEvent.clear(uangInput);
  await userEvent.type(uangInput, '50000');

  // Submit payment
  const submitBtn = screen.getByRole('button', { name: /Selesaikan/i });
  await userEvent.click(submitBtn);

  // Success toast should appear
  const successMessage = await screen.findByText(/Transaksi Berhasil Disimpan!/i, {}, { timeout: 15000 });
  expect(successMessage).toBeInTheDocument();
}, { timeout: 20000 });
