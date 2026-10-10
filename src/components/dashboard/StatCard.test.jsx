import React from 'react';
import { render, screen } from '@testing-library/react';
import { Wallet } from 'lucide-react';
import StatCard from './StatCard';

describe('StatCard Component', () => {
  it('renders label, value, delta, and comparison label', () => {
    render(
      <StatCard
        label="Income Harian"
        value="Rp1.250.000"
        delta="+4,8%"
        isPositive
        icon={Wallet}
        comparisonLabel="vs kemarin"
      />
    );

    expect(screen.getByText(/Income Harian/i)).toBeInTheDocument();
    expect(screen.getByText(/Rp1.250.000/i)).toBeInTheDocument();
    expect(screen.getByText(/\+4,8%/i)).toBeInTheDocument();
    expect(screen.getByText(/vs kemarin/i)).toBeInTheDocument();
  });

  it('shows a negative delta with the down arrow style', () => {
    render(
      <StatCard
        label="Income Bulanan"
        value="Rp42.300.000"
        delta="-2,3%"
        isPositive={false}
        icon={Wallet}
        comparisonLabel="vs bulan lalu"
      />
    );

    expect(screen.getByText(/Income Bulanan/i)).toBeInTheDocument();
    expect(screen.getByText(/-2,3%/i)).toBeInTheDocument();
  });
});
