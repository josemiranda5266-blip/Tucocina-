import React, { useState, useEffect } from 'react';
import { SearchBar } from '../components/SearchBar';
import { FilterBar } from '../components/FilterBar';
import { VideoGrid } from '../components/VideoGrid';
import { Pagination } from '../components/Pagination';
import { Video, Category, VideoPlatform } from '../types';
import { api } from '../services/api';

interface SearchPageProps {
  initialQuery?: string;
  onVideoSelect: (video: Video) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ initialQuery = '', onVideoSelect }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  let parsedCategory = '';
  let parsedSearch = initialQuery;

  if (initialQuery.startsWith('cat:')) {
    parsedCategory = initialQuery.replace('cat:', '');
    parsedSearch = '';
  }

  const [searchQuery, setSearchQuery] = useState(parsedSearch);
  const [selectedCategory, setSelectedCategory] = useState(parsedCategory);
  const [selectedPlatform, setSelectedPlatform] = useState<VideoPlatform | ''>('');
  const [selectedSort, setSelectedSort] = useState<'recent' | 'views'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [pageCursors, setPageCursors] = useState<Record<number, string>>({});

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {
      setCategories([]);
    });
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api.getVideos({
      cursor: pageCursors[currentPage],
      limit: 12,
      searchQuery,
      categoryId: selectedCategory || undefined,
      platform: selectedPlatform || undefined,
      sortBy: selectedSort,
    })
      .then((res) => {
        if (!active) return;
        setVideos(res.items);
        setHasMore(res.hasMore);
        if (res.nextCursor) {
          setPageCursors((previous) => ({ ...previous, [currentPage + 1]: res.nextCursor! }));
        }
      })
      .catch((err) => {
        if (active) {
          setVideos([]);
          setHasMore(false);
          setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [searchQuery, selectedCategory, selectedPlatform, selectedSort, currentPage, pageCursors]);

  const resetPagination = () => {
    setCurrentPage(1);
    setPageCursors({});
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedPlatform('');
    setSelectedSort('recent');
    resetPagination();
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold font-serif text-stone-900">
          Buscador de Videos de Cocina
        </h1>
        <p className="text-stone-600 text-sm">
          Explorá videos de cocina filtrados por ingredientes, plataforma o tipo de plato.
        </p>
      </div>

      <SearchBar
        initialValue={searchQuery}
        onSearch={(q) => {
          setSearchQuery(q);
          resetPagination();
        }}
      />

      <FilterBar
        categories={categories}
        selectedCategory={selectedCategory}
        selectedPlatform={selectedPlatform}
        selectedSort={selectedSort}
        onCategoryChange={(cat) => { setSelectedCategory(cat); resetPagination(); }}
        onPlatformChange={(plat) => { setSelectedPlatform(plat); resetPagination(); }}
        onSortChange={(sort) => { setSelectedSort(sort); resetPagination(); }}
        onReset={handleResetFilters}
      />

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <VideoGrid
        videos={videos}
        loading={loading}
        onVideoSelect={onVideoSelect}
      />

      <Pagination
        currentPage={currentPage}
        hasMore={hasMore}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};
