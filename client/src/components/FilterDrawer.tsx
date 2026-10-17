import { useEffect, useState, type ReactNode } from 'react';
import { SlidersHorizontal, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

export type FilterDrawerGroup = {
  id: string;
  label: string;
  /** Bu gruptaki seçili filtre sayısı */
  badge?: number;
  content: ReactNode;
};

/**
 * Sağdan açılan filtre paneli. Solda grup listesi (Sıralama, Kategori, Marka...),
 * sağda seçili grubun seçenekleri, altta sonuç düğmesi.
 */
export function FilterDrawer({
  open,
  onOpenChange,
  groups,
  hasActive,
  onClear,
  resultCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: FilterDrawerGroup[];
  hasActive: boolean;
  onClear: () => void;
  resultCount: number;
}) {
  const [activeId, setActiveId] = useState(groups[0]?.id);

  useEffect(() => {
    if (!groups.some(g => g.id === activeId)) setActiveId(groups[0]?.id);
  }, [groups, activeId]);

  const active = groups.find(g => g.id === activeId) ?? groups[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full sm:max-w-[560px] flex-col gap-0 overflow-hidden bg-[#141414] border-l border-white/12 p-0 text-white [&>button]:text-white"
        data-testid="filter-drawer"
      >
        <SheetHeader className="shrink-0 flex-row items-center justify-between space-y-0 border-b border-white/10 py-4 pl-5 pr-14">
          <SheetTitle className="text-[14px] font-bold tracking-[0.18em] uppercase text-white flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" strokeWidth={2} />
            Filtrele
          </SheetTitle>
          <SheetDescription className="sr-only">Ürünleri filtrelemek için bir grup seçin</SheetDescription>
          {hasActive && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/15 px-2.5 py-1.5 text-[10px] font-bold tracking-[0.14em] uppercase text-white transition-colors"
              data-testid="button-drawer-clear"
            >
              <Trash2 className="w-3 h-3" />
              Temizle
            </button>
          )}
        </SheetHeader>

        <div className="flex min-h-0 flex-1">
          {/* Sol: gruplar */}
          <nav className="w-[132px] sm:w-[160px] shrink-0 overflow-y-auto no-scrollbar border-r border-white/10 bg-black/20" aria-label="Filtre grupları">
            {groups.map(g => {
              const on = g.id === active?.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveId(g.id)}
                  aria-current={on}
                  data-testid={`drawer-group-${g.id}`}
                  className={`flex w-full items-center justify-between gap-2 border-b border-white/10 px-3.5 py-3.5 text-left text-[12.5px] font-semibold transition-colors ${
                    on ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="truncate">{g.label}</span>
                  {!!g.badge && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-white text-black text-[9px] font-bold flex items-center justify-center shrink-0">
                      {g.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sağ: seçenekler */}
          <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar p-4" data-testid="drawer-panel">
            {active?.content}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 p-4 pb-[calc(var(--mobile-nav-total,0px)+1rem)]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-12 w-full rounded-md bg-white text-black text-[12px] tracking-[0.16em] uppercase font-bold hover:bg-white/90 transition-colors"
            data-testid="button-drawer-apply"
          >
            {resultCount} Ürünü Göster
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
