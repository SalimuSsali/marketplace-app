"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CategoryGrid } from "../../components/CategoryGrid";
import { DEFAULT_CATEGORY_ID, normalizeCategoryId } from "../../lib/categories";

function CategoriesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = useMemo(
    () => normalizeCategoryId(searchParams.get("cat")),
    [searchParams],
  );
  const [selectedId, setSelectedId] = useState(initial);

  useEffect(() => {
    setSelectedId(initial);
  }, [initial]);

  function applyCategory(id) {
    const next = normalizeCategoryId(id);
    setSelectedId(next);
    router.push(next === DEFAULT_CATEGORY_ID ? "/" : `/?cat=${encodeURIComponent(next)}`);
  }

  return (
    <main className="app-shell">
      <h1 className="app-title">Categories</h1>
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <CategoryGrid
          selectedId={selectedId}
          onSelect={applyCategory}
          columns={2}
          size="lg"
          label="Browse categories"
          helpText="Pick a category to filter the Items feed."
        />
      </div>
    </main>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell">
          <p className="app-empty">Loading…</p>
        </main>
      }
    >
      <CategoriesPageInner />
    </Suspense>
  );
}

