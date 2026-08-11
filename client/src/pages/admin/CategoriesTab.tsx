import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Reorder, useDragControls } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  FolderTree,
  Loader2,
  CornerDownRight,
} from 'lucide-react';
import type { Category } from './_shared/types';
import { useToast } from '@/hooks/use-toast';
import {
  PageHeader,
  Card,
  EmptyState,
  InlineAlert,
  PrimaryButton,
  IconButton,
} from './_ui/AdminUI';

function CategoryCardSkeleton() {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-stretch animate-pulse">
        <div className="w-9 sm:w-10 bg-neutral-50 border-r border-neutral-200" />
        <div className="w-20 sm:w-24 h-[68px] sm:h-[76px] bg-neutral-100 border-r border-neutral-200" />
        <div className="flex-1 px-3 sm:px-4 py-3 flex items-center gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-[18px] w-6 rounded bg-neutral-100" />
              <div className="h-3 w-32 rounded bg-neutral-100" />
            </div>
            <div className="h-2.5 w-20 rounded bg-neutral-100" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-md bg-neutral-100" />
            <div className="w-7 h-7 rounded-md bg-neutral-100" />
          </div>
        </div>
      </div>
    </Card>
  );
}

interface CategoriesTabProps {
  categories: Category[];
  setEditingCategory: (c: Category | null) => void;
  setShowCategoryModal: (b: boolean) => void;
  deleteCategoryMutation: {
    mutate: (arg: { id: string; promoteChildren?: boolean }) => void;
  };
  categoriesLoading?: boolean;
  categoriesError?: unknown;
}

interface SortableCardProps {
  category: Category;
  index: number;
  childCount?: number;
  isChild?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCommit: () => void;
  isSaving: boolean;
  /** Kartın altında (aynı sürüklenen blok içinde) gösterilecek alt liste. */
  subList?: React.ReactNode;
}

function SortableCategoryCard({
  category,
  index,
  childCount = 0,
  isChild = false,
  onEdit,
  onDelete,
  onCommit,
  isSaving,
  subList,
}: SortableCardProps) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      value={category}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onCommit}
      className="list-none"
      data-testid={`card-category-${category.id}`}
    >
      <Card className="p-0 overflow-hidden group transition-shadow hover:shadow-sm">
        <div className="flex items-stretch">
          <button
            type="button"
            onPointerDown={(e) => dragControls.start(e)}
            className="flex items-center justify-center px-2.5 sm:px-3 bg-neutral-50 border-r border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 cursor-grab active:cursor-grabbing touch-none"
            aria-label="Sırayı değiştirmek için sürükleyin"
            data-testid={`drag-handle-category-${category.id}`}
            disabled={isSaving}
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <div className="relative w-20 sm:w-24 shrink-0 bg-neutral-50 border-r border-neutral-200 overflow-hidden">
            {category.image ? (
              <img
                src={category.image}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-neutral-300" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {isChild && (
                  <CornerDownRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                )}
                <span
                  className="inline-flex items-center justify-center min-w-[22px] h-[18px] px-1.5 rounded bg-neutral-100 border border-neutral-200 text-[10px] font-semibold tabular-nums text-neutral-600"
                  data-testid={`order-category-${category.id}`}
                  title={`Sıra: ${index + 1}`}
                >
                  {index + 1}
                </span>
                <h3
                  className="text-[13px] font-medium text-neutral-900 truncate"
                  data-testid={`text-category-name-${category.id}`}
                >
                  {category.name}
                </h3>
                {childCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 h-[18px] rounded bg-neutral-100 border border-neutral-200 text-[10px] text-neutral-600 shrink-0"
                    data-testid={`badge-child-count-${category.id}`}
                  >
                    <FolderTree className="w-3 h-3" />
                    {childCount} alt kategori
                  </span>
                )}
              </div>
              <p
                className="text-[11px] text-neutral-500 truncate mt-0.5"
                data-testid={`text-category-slug-${category.id}`}
              >
                /{category.slug}
              </p>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <IconButton
                onClick={onEdit}
                aria-label="Düzenle"
                data-testid={`button-edit-category-${category.id}`}
                disabled={isSaving}
              >
                <Pencil className="w-3.5 h-3.5" />
              </IconButton>
              <IconButton
                onClick={onDelete}
                aria-label="Sil"
                tone="danger"
                data-testid={`button-delete-category-${category.id}`}
                disabled={isSaving}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </IconButton>
            </div>
          </div>
        </div>
      </Card>
      {subList}
    </Reorder.Item>
  );
}

const byDisplayOrder = (a: Category, b: Category) =>
  (a.displayOrder ?? 0) - (b.displayOrder ?? 0);

export default function CategoriesTab({
  categories,
  setEditingCategory,
  setShowCategoryModal,
  deleteCategoryMutation,
  categoriesLoading,
  categoriesError,
}: CategoriesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Hiyerarşik durum: ana kategoriler + her ana kategorinin alt listesi.
  // Sürükle-bırak yalnızca kendi seviyesinde çalışır.
  const [parents, setParents] = useState<Category[]>([]);
  const [childMap, setChildMap] = useState<Record<string, Category[]>>({});
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const parentsRef = useRef<Category[]>([]);
  const childMapRef = useRef<Record<string, Category[]>>({});

  const { parentsFromProps, childMapFromProps } = useMemo(() => {
    const tops = categories.filter((c) => !c.parentId).sort(byDisplayOrder);
    const map: Record<string, Category[]> = {};
    for (const c of categories) {
      if (c.parentId) {
        (map[c.parentId] = map[c.parentId] || []).push(c);
      }
    }
    Object.keys(map).forEach((k) => map[k].sort(byDisplayOrder));
    // Üst kategorisi listede olmayan (yetim) alt kategoriler kaybolmasın:
    // ana seviyede göster.
    const topIds = new Set(tops.map((c) => c.id));
    const orphans = Object.keys(map)
      .filter((pid) => !topIds.has(pid))
      .flatMap((pid) => {
        const list = map[pid];
        delete map[pid];
        return list;
      });
    return {
      parentsFromProps: [...tops, ...orphans],
      childMapFromProps: map,
    };
  }, [categories]);

  useEffect(() => {
    if (!isSavingOrder) {
      setParents(parentsFromProps);
      setChildMap(childMapFromProps);
      parentsRef.current = parentsFromProps;
      childMapRef.current = childMapFromProps;
    }
  }, [parentsFromProps, childMapFromProps, isSavingOrder]);

  const persistOrder = async (list: Category[]) => {
    const changed = list
      .map((cat, idx) => ({ cat, newOrder: idx + 1 }))
      .filter(({ cat, newOrder }) => (cat.displayOrder ?? 0) !== newOrder);

    if (changed.length === 0) return;

    setIsSavingOrder(true);
    try {
      const results = await Promise.all(
        changed.map(({ cat, newOrder }) =>
          fetch(`/api/admin/categories/${cat.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayOrder: newOrder }),
          }),
        ),
      );
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) {
        toast({
          title: 'Sıralama kısmen kaydedildi',
          description: `${failed} kategori güncellenemedi.`,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Sıralama güncellendi' });
      }
    } catch {
      toast({
        title: 'Sıralama kaydedilemedi',
        description: 'Bağlantınızı kontrol edin.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingOrder(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    }
  };

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setShowCategoryModal(true);
  };

  const handleDelete = (cat: Category) => {
    const children = childMap[cat.id] || [];
    if (children.length > 0) {
      const names = children.map((c) => `"${c.name}"`).join(', ');
      const ok = confirm(
        `"${cat.name}" kategorisinin ${children.length} alt kategorisi var: ${names}.\n\n` +
          `Silerseniz bu alt kategoriler silinmez, ana kategori seviyesine taşınır. Devam edilsin mi?`,
      );
      if (ok) {
        deleteCategoryMutation.mutate({ id: cat.id, promoteChildren: true });
      }
      return;
    }
    if (confirm(`"${cat.name}" kategorisini silmek istediğinize emin misiniz?`)) {
      deleteCategoryMutation.mutate({ id: cat.id });
    }
  };

  const totalCount = categories.length;

  return (
    <div data-testid="tab-categories" className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Kategoriler"
        description={`${totalCount.toLocaleString('tr-TR')} kategori - sürükleyerek kendi seviyesinde sıralayın`}
        actions={
          <PrimaryButton
            onClick={() => {
              setEditingCategory(null);
              setShowCategoryModal(true);
            }}
            data-testid="button-add-category"
          >
            <Plus className="w-3.5 h-3.5" />
            Yeni Kategori
          </PrimaryButton>
        }
      />

      {isSavingOrder && (
        <div
          className="flex items-center gap-2 text-[12px] text-neutral-600"
          data-testid="status-saving-order"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Sıralama kaydediliyor…
        </div>
      )}

      {categoriesError ? (
        <InlineAlert tone="error">
          <span className="font-medium">Kategoriler yüklenemedi.</span> Bağlantınızı kontrol edip
          sayfayı yenileyin.
        </InlineAlert>
      ) : categoriesLoading && categories.length === 0 ? (
        <div className="space-y-2" data-testid="loading-categories">
          {Array.from({ length: 5 }).map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      ) : parents.length === 0 ? (
        <Card className="py-2">
          <EmptyState
            icon={FolderTree}
            title="Henüz kategori yok"
            description="İlk kategoriyi ekleyerek mağaza navigasyonunu kurmaya başlayın."
            action={
              <PrimaryButton
                onClick={() => {
                  setEditingCategory(null);
                  setShowCategoryModal(true);
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Yeni Kategori
              </PrimaryButton>
            }
          />
        </Card>
      ) : (
        <Reorder.Group
          axis="y"
          values={parents}
          onReorder={(newOrder: Category[]) => {
            setParents(newOrder);
            parentsRef.current = newOrder;
          }}
          className={`space-y-2 transition-opacity ${
            isSavingOrder ? 'opacity-70 pointer-events-none' : ''
          }`}
          data-testid="list-categories"
        >
          {parents.map((cat, index) => {
            const children = childMap[cat.id] || [];
            return (
              <SortableCategoryCard
                key={cat.id}
                category={cat}
                index={index}
                childCount={children.length}
                onEdit={() => handleEdit(cat)}
                onDelete={() => handleDelete(cat)}
                onCommit={() => persistOrder(parentsRef.current)}
                isSaving={isSavingOrder}
                subList={
                  children.length > 0 ? (
                    <Reorder.Group
                      axis="y"
                      values={children}
                      onReorder={(newOrder: Category[]) => {
                        const next = { ...childMapRef.current, [cat.id]: newOrder };
                        setChildMap(next);
                        childMapRef.current = next;
                      }}
                      className="space-y-2 pl-6 sm:pl-10 mt-2"
                      data-testid={`list-subcategories-${cat.id}`}
                    >
                      {children.map((child, childIndex) => (
                        <SortableCategoryCard
                          key={child.id}
                          category={child}
                          index={childIndex}
                          isChild
                          onEdit={() => handleEdit(child)}
                          onDelete={() => handleDelete(child)}
                          onCommit={() => persistOrder(childMapRef.current[cat.id] || [])}
                          isSaving={isSavingOrder}
                        />
                      ))}
                    </Reorder.Group>
                  ) : null
                }
              />
            );
          })}
        </Reorder.Group>
      )}
    </div>
  );
}
