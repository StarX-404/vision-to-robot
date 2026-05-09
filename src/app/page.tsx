'use client';

import { useMemo, useState } from 'react';

type OptimizeResult = {
  kp: number;
  ki: number;
  kd: number;
  base_speed: number;
  explanation: string;
  optimized_code: string;
};

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizeResult | null>(null);

  const filename = useMemo(() => file?.name ?? 'No file selected', [file]);

  async function processImage() {
    if (!file) {
      setError('Please choose an image first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/optimize', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.detail ?? 'Failed to optimize track image.');
      }

      const data: OptimizeResult = await response.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12">
      <h1 className="text-3xl font-bold">Line-Following Robot Optimizer</h1>
      <p className="text-slate-300">
        Upload a track photo and generate optimized PID values with a ready-to-use Python snippet.
      </p>

      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        <label
          htmlFor="upload"
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-600 p-10 text-center hover:border-cyan-400"
        >
          <span className="text-lg font-medium">Drop image or click to upload</span>
          <span className="mt-2 text-sm text-slate-400">{filename}</span>
          <input
            id="upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <button
          onClick={processImage}
          disabled={loading}
          className="mt-6 rounded-md bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Processing...' : 'Process'}
        </button>

        {error && <p className="mt-4 text-red-400">{error}</p>}
      </section>

      {result && (
        <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold">Optimization Result</h2>
          <p className="text-sm text-slate-300">{result.explanation}</p>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Stat label="KP" value={result.kp} />
            <Stat label="KI" value={result.ki} />
            <Stat label="KD" value={result.kd} />
            <Stat label="Base Speed" value={result.base_speed} />
          </div>
          <div>
            <h3 className="mb-2 text-sm uppercase tracking-wide text-slate-400">Optimized Code</h3>
            <pre className="overflow-x-auto rounded-md bg-black/40 p-4 text-sm text-green-300">
              <code>{result.optimized_code}</code>
            </pre>
          </div>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-950 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
