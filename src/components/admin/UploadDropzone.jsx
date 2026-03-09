'use client';
import { useState } from 'react';
import { Upload, FileText, X, Check } from 'lucide-react';
import Button from '@/components/ui/Button';

const mockAllowlist = [
  { address: '0xA3f1...8c2D', allocation: 3 },
  { address: '0x7B2e...4f1A', allocation: 2 },
  { address: '0xC9d3...2e7F', allocation: 5 },
  { address: '0x1D4a...9b3E', allocation: 1 },
  { address: '0x8E7f...2c1B', allocation: 3 },
];

export default function UploadDropzone() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    setFile({ name: 'allowlist.csv', size: '2.4 KB', rows: 847 });
  };

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => setFile({ name: 'allowlist.csv', size: '2.4 KB', rows: 847 })}
        className={`
          border-2 border-dashed rounded-card p-10 text-center cursor-pointer transition-all duration-200
          ${dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/30 hover:bg-white/[0.02]'}
        `}
      >
        <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-accent' : 'text-muted-dim'}`} />
        <p className="text-sm text-text font-medium">Drop your CSV file here</p>
        <p className="text-xs text-muted mt-1">or click to browse (max 10,000 rows)</p>
      </div>

      {/* File preview */}
      {file && (
        <div className="glass-card rounded-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border-light">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                <FileText size={16} className="text-success" />
              </div>
              <div>
                <p className="text-sm text-text font-medium">{file.name}</p>
                <p className="text-[11px] text-muted-dim">{file.size} · {file.rows} addresses</p>
              </div>
            </div>
            <button onClick={() => setFile(null)} className="p-1.5 text-muted hover:text-text transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Table preview */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="text-left text-[11px] text-muted-dim font-medium px-4 py-2.5 uppercase tracking-wider">Address</th>
                  <th className="text-left text-[11px] text-muted-dim font-medium px-4 py-2.5 uppercase tracking-wider">Allocation</th>
                  <th className="text-left text-[11px] text-muted-dim font-medium px-4 py-2.5 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockAllowlist.map((row, i) => (
                  <tr key={i} className="border-b border-border-light last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-mono text-text">{row.address}</td>
                    <td className="px-4 py-2.5 font-mono text-muted">{row.allocation}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <Check size={12} /> Valid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-border-light flex justify-end">
            <Button variant="primary" size="sm">Upload Allowlist</Button>
          </div>
        </div>
      )}
    </div>
  );
}
