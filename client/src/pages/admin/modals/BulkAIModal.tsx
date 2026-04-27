import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import type { BulkAIResult, Category } from '../_shared/types';
import AdminModal from '../_ui/AdminModal';
import {
  PrimaryButton,
  GhostButton,
  SectionHeading,
  SelectInput,
  InlineAlert,
} from '../_ui/AdminUI';

interface BulkAIModalProps {
  categories: Category[];
  onClose: () => void;
  preselectedProductIds?: string[];
}

const STYLES = [
  { value: 'professional', label: 'Profesyonel', desc: 'Kurumsal ve güvenilir ton' },
  { value: 'energetic', label: 'Enerjik', desc: 'Dinamik ve motive edici' },
  { value: 'minimal', label: 'Minimal', desc: 'Kısa ve öz' },
  { value: 'luxury', label: 'Lüks', desc: 'Premium ve sofistike' },
  { value: 'natural', label: 'Doğal', desc: 'Anadolu mirası ve el işçiliği vurgusu' },
];

export default function BulkAIModal({
  categories,
  onClose,
  preselectedProductIds,
}: BulkAIModalProps) {
  const queryClient = useQueryClient();
  const [style, setStyle] = useState('natural');
  const [categoryId, setCategoryId] = useState('');
  const [mode, setMode] = useState<'empty' | 'overwrite'>('empty');
  const hasPreselection = !!preselectedProductIds && preselectedProductIds.length > 0;
  const [progress, setProgress] = useState<{
    running: boolean;
    done: boolean;
    message: string;
    results?: BulkAIResult[];
  }>({ running: false, done: false, message: '' });

  const handleClose = () => {
    if (!progress.running) {
      onClose();
      setProgress({ running: false, done: false, message: '' });
    }
  };

  const start = async () => {
    setProgress({ running: true, done: false, message: 'Başlatılıyor…' });
    try {
      const res = await fetch('/api/admin/products/bulk-ai-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          style,
          categoryId: hasPreselection ? undefined : categoryId || undefined,
          productIds: hasPreselection ? preselectedProductIds : undefined,
          onlyEmpty: mode === 'empty',
          overwrite: mode === 'overwrite',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProgress({ running: false, done: true, message: data.error || 'Hata oluştu' });
      } else {
        setProgress({
          running: false,
          done: true,
          message: data.message,
          results: data.results,
        });
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      }
    } catch {
      setProgress({ running: false, done: true, message: 'Bağlantı hatası' });
    }
  };

  const successCount = progress.results?.filter((r) => r.success).length ?? 0;
  const errorCount = progress.results?.filter((r) => !r.success).length ?? 0;

  return (
    <AdminModal
      open
      onClose={handleClose}
      closeOnOutsideClick={!progress.running}
      title={
        <>
          <Sparkles className="w-4 h-4 text-neutral-500" />
          Toplu AI Açıklama
        </>
      }
      description="Seçili ürünlerin açıklamalarını seçtiğiniz stilde otomatik oluşturun."
      size="md"
      testId="modal-bulk-ai"
      footer={
        !progress.running && !progress.done ? (
          <>
            <GhostButton onClick={handleClose}>İptal</GhostButton>
            <PrimaryButton onClick={start} data-testid="button-start-bulk-ai">
              <Sparkles className="w-3.5 h-3.5" />
              Açıklamaları Oluştur
            </PrimaryButton>
          </>
        ) : !progress.running && progress.done ? (
          <PrimaryButton onClick={handleClose} data-testid="button-close-bulk-ai">
            Kapat
          </PrimaryButton>
        ) : null
      }
    >
      {!progress.running && !progress.done ? (
        <div className="space-y-5">
          <section>
            <SectionHeading number={1} title="Yazım Stili" />
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
              data-testid="select-bulk-ai-style"
            >
              {STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStyle(s.value)}
                  title={s.desc}
                  className={`px-2.5 py-2 rounded-md text-[12px] font-medium transition-colors border text-center ${
                    style === s.value
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                  }`}
                  data-testid={`button-bulk-ai-style-${s.value}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1.5">
              {STYLES.find((s) => s.value === style)?.desc}
            </p>
          </section>

          <section>
            <SectionHeading number={2} title="Kategori Filtresi" description="Boş bırakırsanız tüm kategoriler dahil edilir." />
            <SelectInput
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full"
              data-testid="select-bulk-ai-category"
            >
              <option value="">Tüm kategoriler</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectInput>
          </section>

          <section>
            <SectionHeading number={3} title="Hangi ürünlere uygulansın?" />
            <div className="space-y-1.5">
              <label className="flex items-start gap-2.5 px-3 py-2.5 rounded-md border border-neutral-200 cursor-pointer hover:bg-neutral-50">
                <input
                  type="radio"
                  name="bulkAIMode"
                  checked={mode === 'empty'}
                  onChange={() => setMode('empty')}
                  className="mt-0.5 w-3.5 h-3.5 accent-neutral-900 shrink-0"
                  data-testid="radio-bulk-ai-empty-only"
                />
                <span className="text-[13px] text-neutral-900">
                  Sadece açıklaması boş ürünler
                  <span className="block text-[11px] text-neutral-500 mt-0.5">
                    Mevcut açıklamalar korunur
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2.5 px-3 py-2.5 rounded-md border border-neutral-200 cursor-pointer hover:bg-neutral-50">
                <input
                  type="radio"
                  name="bulkAIMode"
                  checked={mode === 'overwrite'}
                  onChange={() => setMode('overwrite')}
                  className="mt-0.5 w-3.5 h-3.5 accent-neutral-900 shrink-0"
                  data-testid="radio-bulk-ai-overwrite"
                />
                <span className="text-[13px] text-neutral-900">
                  Tüm ürünler
                  <span className="block text-[11px] text-neutral-500 mt-0.5">
                    Mevcut açıklamalar silinir, yenileri yazılır
                  </span>
                </span>
              </label>
            </div>
          </section>

          <InlineAlert tone="warning">
            Her ürün için yaklaşık 2-3 saniye sürer. Pencereyi kapatmayın.
          </InlineAlert>
        </div>
      ) : progress.running ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mx-auto mb-3" />
          <p className="text-[13px] text-neutral-900">{progress.message}</p>
          <p className="text-[12px] text-neutral-500 mt-1">
            Bu işlem biraz zaman alabilir…
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <InlineAlert tone={progress.results ? 'success' : 'error'}>
            {progress.message}
          </InlineAlert>

          {progress.results && progress.results.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-[12px] text-neutral-700">
                <span className="inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="tabular-nums">{successCount}</span> başarılı
                </span>
                {errorCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    <span className="tabular-nums">{errorCount}</span> başarısız
                  </span>
                )}
              </div>
              <div className="border border-neutral-200 rounded-md overflow-hidden">
                <div className="max-h-60 overflow-y-auto divide-y divide-neutral-100">
                  {progress.results.map((r, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <span className="text-[12px] text-neutral-700 truncate flex-1">
                        {r.productName || r.productId}
                      </span>
                      {r.success ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <span
                          className="text-[11px] text-red-600 truncate max-w-[180px]"
                          title={r.error}
                        >
                          {r.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </AdminModal>
  );
}
