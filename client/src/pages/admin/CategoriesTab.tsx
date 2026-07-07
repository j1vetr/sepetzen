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
  deleteCategoryMutation: { mutate: (id: string) => void };
  categoriesLoading?: boolean;
  categoriesError?: unknown;
}

interface SortableCardProps {
  category: Category;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onCommit: () => void;
  isSaving: boolean;
}

function SortableCategoryCard({
  category,
  index,
  onEdit,
  onDelete,
  onCommit,
  isSaving,
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
    </Reorder.Item>
  );
}

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
  const [items, setItems] = useState<Category[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const itemsRef = useRef<Category[]>([]);

  const sortedFromProps = useMemo(
    () => [...categories].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [categories],
  );

  useEffect(() => {
    if (!isSavingOrder) {
      setItems(sortedFromProps);
      itemsRef.current = sortedFromProps;
    }
  }, [sortedFromProps, isSavingOrder]);

  const handleReorder = (newOrder: Category[]) => {
    setItems(newOrder);
    itemsRef.current = newOrder;
  };

  const persistOrder = async () => {
    const newOrder = itemsRef.current;
    const changed = newOrder
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
    if (confirm(`"${cat.name}" kategorisini silmek istediğinize emin misiniz?`)) {
      deleteCategoryMutation.mutate(cat.id);
    }
  };

  return (
    <div data-testid="tab-categories" className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Kategoriler"
        description={`${categories.length.toLocaleString('tr-TR')} kategori - sürükleyerek sıralayın`}
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
      ) : items.length === 0 ? (
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
          values={items}
          onReorder={handleReorder}
          className={`space-y-2 transition-opacity ${
            isSavingOrder ? 'opacity-70 pointer-events-none' : ''
          }`}
          data-testid="list-categories"
        >
          {items.map((cat, index) => (
            <SortableCategoryCard
              key={cat.id}
              category={cat}
              index={index}
              onEdit={() => handleEdit(cat)}
              onDelete={() => handleDelete(cat)}
              onCommit={persistOrder}
              isSaving={isSavingOrder}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}
