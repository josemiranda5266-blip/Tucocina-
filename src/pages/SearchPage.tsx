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

  // Filter state
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

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);

    api.getVideos({
      page: currentPage,
      limit: 12,
      searchQuery,
      categoryId: selectedCategory,
      platform: selectedPlatform || undefined,
      sortBy: selectedSort,
    })
      .then((res) => {
        if (active) {
          setVideos(res.items);
          setHasMore(res.hasMore);
        }
      })
      .catch((err) => {
        console.error('Error al realizar búsqueda:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [searchQuery, selectedCategory, selectedPlatform, selectedSort, currentPage]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedPlatform('');
    setSelectedSort('recent');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 pb-12">
      
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold font-serif text-stone-900">
          Buscador de Videos de Cocina
        </h1>
        <p className="text-stone-600 text-sm">
          Explorá miles de recetas filtradas por ingredientes, plataforma o tipo de plato.
        </p>
      </div>

      <SearchBar
        initialValue={searchQuery}
        onSearch={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
      />

      <FilterBar
        categories={categories}
        selectedCategory={selectedCategory}
        selectedPlatform={selectedPlatform}
        selectedSort={selectedSort}
        onCategoryChange={(cat) => { setSelectedCategory(cat); setCurrentPage(1); }}
        onPlatformChange={(plat) => { setSelectedPlatform(plat); setCurrentPage(1); }}
        onSortChange={(sort) => { setSelectedSort(sort); setCurrentPage(1); }}
        onReset={handleResetFilters}
      />

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
