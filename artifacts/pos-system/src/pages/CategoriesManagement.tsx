import { useState, useCallback, useEffect } from 'react';
import { categoriesApi, type Category } from '../api/client';
import {
  RefreshCw,
  Plus,
  Search,
  Layers,
  Layout,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Topbar } from '../components/Topbar';
/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

export type CategoryFormData = {
  section: string;
  name: string;
  description: string;
  sortOrder: number;
};

/* -------------------------------------------------------------------------- */
/*                                Constants                                   */
/* -------------------------------------------------------------------------- */

export const AVAILABLE_SECTIONS = [
  'Bakery',
  'Fast Food',
  'Snacks & Pastries',
  'Drinks',
];

/* -------------------------------------------------------------------------- */
/*                         Category Form Dialog                               */
/* -------------------------------------------------------------------------- */

interface CategoryFormDialogProps {
  initial?: Partial<Category>;
  onClose: () => void;
  onSave: (data: CategoryFormData) => Promise<void>;
  availableSections?: string[];
}

export function CategoryFormDialog({
  initial,
  onClose,
  onSave,
  availableSections = AVAILABLE_SECTIONS,
}: CategoryFormDialogProps) {
  const [form, setForm] = useState<CategoryFormData>({
    section: initial?.section ?? availableSections[0],
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    sortOrder: initial?.sortOrder ?? 0,
  });

  const [saving, setSaving] = useState(false);

  const updateField = <K extends keyof CategoryFormData>(
    key: K,
    value: CategoryFormData[K]
  ) => {
    setForm(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!form.section.trim() || !form.name.trim()) {
      return;
    }

    try {
      setSaving(true);
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const isValid =
    form.section.trim().length > 0 &&
    form.name.trim().length > 0;

  const isEditing = Boolean(initial?.name);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="text-base font-bold">
            {isEditing ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEditing ? 'Edit category details' : 'Add a new category'}
          </DialogDescription>
        </DialogHeader>

        {/* Form */}
        <div className="space-y-4">

          {/* Section */}
          <div>
            <label className="mb-1 block text-xs font-semibold">
              Section *
            </label>

            <select
              value={form.section}
              onChange={e =>
                updateField('section', e.target.value)
              }
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {availableSections.map(section => (
                <option
                  key={section}
                  value={section}
                >
                  {section}
                </option>
              ))}
            </select>
          </div>

          {/* Category Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold">
              Category Name *
            </label>

            <input
              type="text"
              value={form.name}
              onChange={e =>
                updateField('name', e.target.value)
              }
              placeholder="e.g. Bread, Shawarma, Samosa"
              className="h-10 w-full rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-semibold">
              Description
            </label>

            <textarea
              value={form.description}
              onChange={e =>
                updateField('description', e.target.value)
              }
              placeholder="Brief description of this category..."
              className="h-24 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Sort Order */}
          <div>
            <label className="mb-1 block text-xs font-semibold">
              Sort Order
            </label>

            <input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={e =>
                updateField(
                  'sortOrder',
                  Number(e.target.value) || 0
                )
              }
              placeholder="0"
              className="h-10 w-full rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving
              ? 'Saving...'
              : isEditing
              ? 'Save Changes'
              : 'Add Category'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
/* -------------------------------------------------------------------------- */
/*                         Categories Management                              */
/* -------------------------------------------------------------------------- */

export default function CategoriesManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { toast } = useToast();

  /* ------------------------------------------------------------------------ */
  /*                                Load Data                                 */
  /* ------------------------------------------------------------------------ */

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);

      const data = await categoriesApi.list();
      setCategories(data);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load categories.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  /* ------------------------------------------------------------------------ */
  /*                             Create Category                              */
  /* ------------------------------------------------------------------------ */

  const handleCreateCategory = async (
    data: CategoryFormData
  ) => {
    try {
      await categoriesApi.create(data);

      await loadCategories();

      setShowAddForm(false);

      toast({
        title: 'Category Created',
        description: `${data.name} was added successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description:
          error?.message ?? 'Failed to create category.',
        variant: 'destructive',
      });
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                              Update Category                             */
  /* ------------------------------------------------------------------------ */

  const handleUpdateCategory = async (
    data: CategoryFormData
  ) => {
    if (!editCategory) return;

    try {
      await categoriesApi.update(editCategory.id, data);

      await loadCategories();

      setEditCategory(null);

      toast({
        title: 'Category Updated',
        description: 'Changes saved successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description:
          error?.message ?? 'Failed to update category.',
        variant: 'destructive',
      });
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                              Delete Category                             */
  /* ------------------------------------------------------------------------ */

  const handleDeleteCategory = async (
    categoryId: string
  ) => {
    try {
      await categoriesApi.delete(categoryId);

      await loadCategories();

      setConfirmDelete(null);

      toast({
        title: 'Category Deleted',
        description:
          'Category removed successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description:
          error?.message ?? 'Failed to delete category.',
        variant: 'destructive',
      });
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                              Derived Data                                */
  /* ------------------------------------------------------------------------ */

  const sections = [
    ...new Set(
      categories.map(category => category.section)
    ),
  ].sort();

  // Sections available in the category form: defaults + any sections already in use
  const formSections = [
    ...AVAILABLE_SECTIONS,
    ...sections.filter(s => !AVAILABLE_SECTIONS.includes(s)),
  ];

  const filteredCategories = categories.filter(
    category => {
      const query = search.toLowerCase();

      const matchesSearch =
        category.name.toLowerCase().includes(query) ||
        category.section.toLowerCase().includes(query);

      const matchesSection =
        !filterSection ||
        category.section === filterSection;

      return matchesSearch && matchesSection;
    }
  );

  const groupedCategories =
    filteredCategories.reduce<
      Record<string, Category[]>
    >((groups, category) => {
      if (!groups[category.section]) {
        groups[category.section] = [];
      }

      groups[category.section].push(category);

      return groups;
    }, {});

      return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <Topbar />

      <div className="flex flex-1 flex-col overflow-hidden">

        {/* ------------------------------------------------------------------ */}
        {/* Header                                                             */}
        {/* ------------------------------------------------------------------ */}

        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center justify-between">

            <div>
              <h1 className="text-xl font-bold">
                Category Management
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Manage product categories and sections
              </p>
            </div>

            <div className="flex items-center gap-2">

              <button
                onClick={loadCategories}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-muted/50"
              >
                <RefreshCw
                  size={15}
                  className={loading ? 'animate-spin' : ''}
                />
              </button>

              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Plus size={15} />
                Add Category
              </button>
            </div>
          </div>

          {/* Stats */}

          <div className="mt-5 grid grid-cols-2 gap-3">

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-2xl font-bold">
                {categories.length}
              </div>

              <div className="text-xs text-muted-foreground">
                Total Categories
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-2xl font-bold">
                {sections.length}
              </div>

              <div className="text-xs text-muted-foreground">
                Sections
              </div>
            </div>

          </div>

          {/* Search */}

          <div className="relative mt-4 max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search categories..."
              className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Section Filters                                                    */}
        {/* ------------------------------------------------------------------ */}

        <div className="border-b border-border bg-card/30 px-6 py-3">
          <div className="flex gap-2 overflow-x-auto">

            <button
              onClick={() =>
                setFilterSection(null)
              }
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                !filterSection
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              All
            </button>

            {sections.map((section) => (
              <button
                key={section}
                onClick={() =>
                  setFilterSection(section)
                }
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                  filterSection === section
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                {section} (
                {
                  categories.filter(
                    c => c.section === section
                  ).length
                }
                )
              </button>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Categories List                                                    */}
        {/* ------------------------------------------------------------------ */}

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {loading ? (
            <div className="flex h-48 items-center justify-center gap-3 text-muted-foreground">
              <RefreshCw
                size={20}
                className="animate-spin"
              />
              <span>Loading categories...</span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Layers
                size={40}
                className="opacity-30"
              />
              <p>No categories found</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Plus size={15} />
                Add Category
              </button>
            </div>
          ) : (
            <div className="space-y-6">

              {Object.entries(
                groupedCategories
              ).map(([section, cats]) => (
                <div key={section}>

                  <div className="mb-3 flex items-center gap-2">
                    <Layout
                      size={15}
                      className="text-primary"
                    />

                    <h2 className="font-bold">
                      {section}
                    </h2>

                    <span className="text-xs text-muted-foreground">
                      ({cats.length} categories)
                    </span>
                  </div>

                  <div className="space-y-2">

                    {cats.map(category => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:bg-muted/20"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">

                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                            {category.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">

                            <h3 className="truncate text-sm font-semibold">
                              {category.name}
                            </h3>

                            <p className="truncate text-xs text-muted-foreground">
                              {category.description ||
                                'No description'}
                            </p>
                          </div>
                        </div>

                        <div className="ml-4 flex items-center gap-3">

                          <span className="text-xs text-muted-foreground">
                            Order:
                            {' '}
                            {category.sortOrder}
                          </span>

                          <button
                            onClick={() =>
                              setEditCategory(
                                category
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted/50"
                          >
                            <Pencil size={13} />
                          </button>

                          {confirmDelete ===
                          category.id ? (
                            <div className="flex items-center gap-1">

                              <button
                                onClick={() =>
                                  handleDeleteCategory(
                                    category.id
                                  )
                                }
                                className="rounded-md bg-destructive px-2 py-1 text-xs font-semibold text-white"
                              >
                                Yes
                              </button>

                              <button
                                onClick={() =>
                                  setConfirmDelete(
                                    null
                                  )
                                }
                                className="rounded-md border border-border px-2 py-1 text-xs"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                setConfirmDelete(
                                  category.id
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Dialogs                                                            */}
        {/* ------------------------------------------------------------------ */}

        {showAddForm && (
          <CategoryFormDialog
            availableSections={formSections}
            onClose={() =>
              setShowAddForm(false)
            }
            onSave={handleCreateCategory}
          />
        )}

        {editCategory && (
          <CategoryFormDialog
            initial={editCategory}
            availableSections={formSections}
            onClose={() =>
              setEditCategory(null)
            }
            onSave={handleUpdateCategory}
          />
        )}

      </div>
    </div>
  );
}