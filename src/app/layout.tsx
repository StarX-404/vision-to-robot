import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Line-Following Robot Optimizer',
  description: 'Upload a track image and get optimized PID constants and Python code.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
