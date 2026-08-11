import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { AppLayout } from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'PDF417 Studio | Enterprise Barcode Generator & Reader',
  description:
    'High precision, production-ready PDF417 barcode generator, decoder, employee credential engine, and batch processor. 100% browser local and private.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
