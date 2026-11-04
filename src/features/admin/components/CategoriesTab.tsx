import { useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { CATEGORY_COLORS } from '@/lib/chartTheme'
import { useUIStore } from '@/store/uiStore'
import {
  useCategories,
  useDeleteCategory,
  useSaveCategory,
} from '@/features/transactions/hooks/useTransactions'
import type { Category } from '@/types/database'

function CategoryForm({ category, used, onDone }: {
  category?: Category
  used: string[]
  onDone: () => void
}) {
  const save = useSaveCategory()
  const remove = useDeleteCategory()
  const openConfirm = useUIStore((s) => s.openConfirm)
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(
    category?.color ?? CATEGORY_COLORS.find((c) => !used.includes(c)) ?? CATEGORY_COLORS[0],
  )

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    save.mutate({ id: category?.id, name: name.trim(), color }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} className="px-4 pb-6 space-y-4">
      <Input label="Namn" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!category} />
      <div className="flex flex-wrap gap-3">
        {CATEGORY_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Färg ${c}`}
            aria-pressed={color === c}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: c }}
          >
            {color === c && <Check size={18} className="text-white" />}
          </button>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        {category && (
          <Button
            type="button"
            variant="danger"
            aria-label="Ta bort"
            onClick={() =>
              openConfirm('Ta bort kategori', `Händelser och transaktioner i "${category.name}" blir utan kategori.`, () =>
                remove.mutate(category.id, { onSuccess: onDone }),
              )
            }
          >
            <Trash2 size={18} />
          </Button>
        )}
        <Button type="submit" className="flex-1" loading={save.isPending} disabled={!name.trim()}>
          Spara
        </Button>
      </div>
    </form>
  )
}

export function CategoriesTab() {
  const { data: categories = [] } = useCategories()
  const [editing, setEditing] = useState<{ category?: Category } | null>(null)

  return (
    <div className="p-4">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-[#A0A0A0] text-xs font-semibold uppercase tracking-wider">Kategorier</h3>
        <button
          onClick={() => setEditing({})}
          aria-label="Ny kategori"
          className="w-8 h-8 flex items-center justify-center text-[#A0A0A0] active:text-white"
        >
          <Plus size={18} />
        </button>
      </div>
      <Card padding={false} className="overflow-hidden divide-y divide-[#222222]">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setEditing({ category: c })}
            className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-[#1A1A1A]"
          >
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
            <span className="text-white text-sm">{c.name}</span>
          </button>
        ))}
      </Card>

      <BottomSheet
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.category ? 'Ändra kategori' : 'Ny kategori'}
      >
        {editing && (
          <CategoryForm
            key={editing.category?.id ?? 'new'}
            category={editing.category}
            used={categories.map((c) => c.color)}
            onDone={() => setEditing(null)}
          />
        )}
      </BottomSheet>
    </div>
  )
}
