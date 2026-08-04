import { useState, useEffect, useCallback, useMemo } from 'react';
import { categoriesApi, type Category } from '../api/client';
import {
  SECTIONS as DEFAULT_SECTIONS,
  SECTION_CATEGORIES as DEFAULT_SECTION_CATEGORIES,
} from './usePosStore';

/**
 * Shared hook that loads categories from the API (cache-first) and derives
 * the sections → subcategories structure used by the POS and Stock Management.
 *
 * Falls back to the static defaults in usePosStore when no data is available.
 */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await categoriesApi.list();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // section → category names[], sorted by category sortOrder
  const sectionCategories = useMemo<Record<string, string[]>>(() => {
    if (categories.length === 0) return DEFAULT_SECTION_CATEGORIES;

    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const map: Record<string, string[]> = {};
    for (const cat of sorted) {
      if (!map[cat.section]) map[cat.section] = [];
      if (!map[cat.section].includes(cat.name)) map[cat.section].push(cat.name);
    }
    return map;
  }, [categories]);

  // All sections with 'All' prepended (for filter pills / tabs)
  const sections = useMemo<string[]>(() => {
    if (categories.length === 0) return [...DEFAULT_SECTIONS];
    return ['All', ...Object.keys(sectionCategories)];
  }, [categories, sectionCategories]);

  // Flat list of all subcategory names
  const allCategories = useMemo<string[]>(() => {
    return Object.values(sectionCategories).flat();
  }, [sectionCategories]);

  return {
    categories,
    sections,
    sectionCategories,
    allCategories,
    loading,
    reload,
  };
}

