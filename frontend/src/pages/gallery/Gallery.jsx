import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { galleryAPI } from '../../services/api';
import { toast } from 'react-toastify';

const CATEGORIES = [
  'All',
  'Sports',
  'Science & Academics',
  'Cultural & Arts',
  'Campus & Facilities',
  'Celebrations',
];

const PRESET_TAGS = [
  'Athletics',
  'Robotics',
  'Cultural Fest',
  'Republic Day',
  'Annual Day',
  'STEM',
  'Championship',
  'Art & Craft',
  'Smart Classroom',
  'Laboratory',
];

const Gallery = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const { confirmAction } = useConfirm();
  const canManage = isAdmin() || hasPermission('manage-gallery');

  // State
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Modals state
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState(null);

  // Upload/Edit Form state
  const [formData, setFormData] = useState({
    title: '',
    category: 'Sports',
    customCategory: '',
    description: '',
    imageUrl: '',
    eventDate: new Date().toISOString().split('T')[0],
    tags: '',
    featured: false,
  });
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'url'
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch images
  const loadGallery = useCallback(async () => {
    try {
      setLoading(true);
      const res = await galleryAPI.getAll({
        category: selectedCategory,
        search: searchQuery,
        sort: sortBy,
      });
      if (res.success) {
        setImages(res.data);
      }
    } catch (err) {
      toast.error('Failed to load gallery images');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, sortBy]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  // Featured Hero Image (first featured item or the very first image)
  const featuredImage = useMemo(() => {
    return images.find(img => img.featured) || (images.length > 0 ? images[0] : null);
  }, [images]);

  // Filtered list without duplicating hero in the main grid if hero is shown prominently
  const displayImages = useMemo(() => {
    return images;
  }, [images]);

  // Open Lightbox by item ID
  const openLightbox = (image) => {
    const idx = displayImages.findIndex(img => img.id === image.id);
    if (idx !== -1) {
      setLightboxIndex(idx);
    }
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextLightboxImage = useCallback(() => {
    if (lightboxIndex !== null && displayImages.length > 0) {
      setLightboxIndex((lightboxIndex + 1) % displayImages.length);
    }
  }, [lightboxIndex, displayImages.length]);

  const prevLightboxImage = useCallback(() => {
    if (lightboxIndex !== null && displayImages.length > 0) {
      setLightboxIndex((lightboxIndex - 1 + displayImages.length) % displayImages.length);
    }
  }, [lightboxIndex, displayImages.length]);

  // Lightbox keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextLightboxImage();
      if (e.key === 'ArrowLeft') prevLightboxImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, nextLightboxImage, prevLightboxImage]);

  // Handle like toggle
  const handleLike = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await galleryAPI.toggleLike(id);
      if (res.success) {
        setImages(prev => prev.map(img => (img.id === id ? res.data : img)));
      }
    } catch (err) {
      console.error('Like toggle failed', err);
    }
  };

  // Image File Compression / Helper to keep localStorage compact
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPEG, PNG, WebP)');
      return;
    }

    // Limit original file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image file too large. Please select an image under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to scale down image to max width/height of 1280px for performance & localStorage fit
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 960;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setImagePreview(dataUrl);
        setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Open Upload Modal
  const handleOpenUpload = () => {
    setFormData({
      title: '',
      category: 'Sports',
      customCategory: '',
      description: '',
      imageUrl: '',
      eventDate: new Date().toISOString().split('T')[0],
      tags: '',
      featured: false,
    });
    setImagePreview('');
    setUploadMode('file');
    setIsUploadModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (image, e) => {
    if (e) e.stopPropagation();
    setEditingImage(image);
    const isPresetCat = CATEGORIES.slice(1).includes(image.category);
    setFormData({
      title: image.title || '',
      category: isPresetCat ? image.category : 'Other',
      customCategory: isPresetCat ? '' : image.category || '',
      description: image.description || '',
      imageUrl: image.imageUrl || '',
      eventDate: image.eventDate || new Date().toISOString().split('T')[0],
      tags: Array.isArray(image.tags) ? image.tags.join(', ') : (image.tags || ''),
      featured: !!image.featured,
    });
    setImagePreview(image.imageUrl || '');
    setIsEditModalOpen(true);
  };

  // Submit Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter an event or photo title');
      return;
    }
    const finalImageUrl = uploadMode === 'url' ? formData.imageUrl.trim() : imagePreview;
    if (!finalImageUrl) {
      toast.error('Please select an image file or provide an image URL');
      return;
    }

    const resolvedCategory = formData.category === 'Other' && formData.customCategory.trim()
      ? formData.customCategory.trim()
      : formData.category;

    try {
      setIsSubmitting(true);
      const res = await galleryAPI.create({
        title: formData.title,
        category: resolvedCategory,
        description: formData.description,
        imageUrl: finalImageUrl,
        eventDate: formData.eventDate,
        tags: formData.tags,
        featured: formData.featured,
        uploadedBy: user?.name || user?.email || 'School Admin',
      });

      if (res.success) {
        toast.success(res.message || 'Photo successfully added to gallery!');
        setIsUploadModalOpen(false);
        loadGallery();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save gallery item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingImage) return;
    if (!formData.title.trim()) {
      toast.error('Please enter an image title');
      return;
    }

    const resolvedCategory = formData.category === 'Other' && formData.customCategory.trim()
      ? formData.customCategory.trim()
      : formData.category;

    try {
      setIsSubmitting(true);
      const res = await galleryAPI.update(editingImage.id, {
        title: formData.title,
        category: resolvedCategory,
        description: formData.description,
        imageUrl: formData.imageUrl || editingImage.imageUrl,
        eventDate: formData.eventDate,
        tags: formData.tags,
        featured: formData.featured,
      });

      if (res.success) {
        toast.success(res.message || 'Gallery image updated!');
        setIsEditModalOpen(false);
        setEditingImage(null);
        loadGallery();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update image');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Image
  const handleDeleteImage = (image, e) => {
    if (e) e.stopPropagation();
    confirmAction(
      async () => {
        try {
          const res = await galleryAPI.delete(image.id);
          if (res.success) {
            toast.success('Image removed from gallery');
            if (lightboxIndex !== null) closeLightbox();
            loadGallery();
          }
        } catch (err) {
          toast.error(err.message || 'Failed to delete photo');
        }
      },
      {
        title: 'Delete Gallery Image',
        message: `Are you sure you want to permanently delete "${image.title}"?`,
        confirmText: 'Delete Image',
        type: 'danger',
      }
    );
  };

  // Reset to default gallery sample images
  const handleResetDefaults = () => {
    confirmAction(
      async () => {
        try {
          await galleryAPI.resetDefaults();
          toast.success('Gallery reset to default school event memories!');
          loadGallery();
        } catch (err) {
          toast.error('Failed to reset gallery');
        }
      },
      {
        title: 'Reset to Sample Gallery',
        message: 'This will restore the original curated school event photos. Proceed?',
        confirmText: 'Restore Defaults',
        type: 'info',
      }
    );
  };

  return (
    <div className="px-[15px] py-6 space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">🖼️</span>
            <h1 className="text-2xl font-bold text-gray-900">School Memories & Event Gallery</h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Explore athletic meets, science exhibitions, cultural fests, and milestones across our vibrant campus.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManage && (
            <>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3.5 py-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition shadow-sm"
                title="Restore default sample event photos"
              >
                🔄 Restore Defaults
              </button>
              <button
                type="button"
                onClick={handleOpenUpload}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <span className="text-base font-bold">+</span>
                <span>Upload Photo</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hero / Featured Image Section (Compliant with Modern Web Guidance optimize-image-priority: fetchpriority="high", no loading="lazy") */}
      {featuredImage && !searchQuery && selectedCategory === 'All' && (
        <section
          aria-label="Featured School Memory"
          className="relative overflow-hidden rounded-2xl bg-gray-950 text-white shadow-xl border border-gray-800"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
            {/* Visual Media Column */}
            <div className="relative lg:col-span-7 h-64 sm:h-80 lg:h-auto overflow-hidden bg-gray-900">
              <img
                src={featuredImage.imageUrl}
                alt={featuredImage.title}
                /* MODERN WEB GUIDANCE: fetchpriority="high" strictly on hero/LCP image; never combined with loading="lazy" */
                fetchpriority="high"
                decoding="async"
                className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700 cursor-pointer"
                onClick={() => openLightbox(featuredImage)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-gray-950 pointer-events-none" />
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/90 text-white shadow backdrop-blur-sm">
                  ⭐ Featured Milestone
                </span>
              </div>
            </div>

            {/* Content Column */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-gradient-to-br from-gray-900 to-gray-950">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-blue-400 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-950/70 border border-blue-800">
                    {featuredImage.category}
                  </span>
                  <span>•</span>
                  <span>📅 {featuredImage.eventDate}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-3">
                  {featuredImage.title}
                </h2>
                <p className="text-sm text-gray-300 leading-relaxed line-clamp-3 mb-4">
                  {featuredImage.description}
                </p>

                {featuredImage.tags && featuredImage.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {featuredImage.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-xs rounded-md bg-gray-800/80 text-gray-300 border border-gray-700/60"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => openLightbox(featuredImage)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition"
                >
                  <span>🔍 View Fullscreen</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleLike(e, featuredImage.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-pink-400 transition"
                    title="Cheer this milestone"
                  >
                    <span>❤️</span>
                    <span className="font-semibold">{featuredImage.likes || 0}</span>
                  </button>

                  {canManage && (
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(featuredImage, e)}
                      className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
                      title="Edit Photo"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Landmark (Semantic <search> element per Modern Web Guidance) */}
          <search className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-sm">
                🔍
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events, tags, dates..."
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">🕒 Newest Events</option>
              <option value="oldest">🗓️ Oldest First</option>
              <option value="popular">❤️ Most Popular</option>
            </select>
          </search>
        </div>

        {/* Results summary */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span>
            Showing <strong className="text-gray-800">{displayImages.length}</strong> photo
            {displayImages.length === 1 ? '' : 's'}
            {selectedCategory !== 'All' && ` in "${selectedCategory}"`}
            {searchQuery && ` matching "${searchQuery}"`}
          </span>

          {(selectedCategory !== 'All' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="aspect-[4/3] bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : displayImages.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-3">📷</div>
          <h3 className="text-lg font-semibold text-gray-800">No photos found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'All'
              ? 'Try adjusting your category filter or search terms.'
              : 'The school gallery is currently empty.'}
          </p>
          {canManage && (
            <button
              type="button"
              onClick={handleOpenUpload}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              Upload First Photo
            </button>
          )}
        </div>
      ) : (
        /* Semantic <figure> & <figcaption> grid with explicit aspect ratios per Modern Web Guidance */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayImages.map((image) => (
            <figure
              key={image.id}
              className="group relative bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 overflow-hidden transition-all duration-300 flex flex-col cursor-pointer"
              onClick={() => openLightbox(image)}
            >
              {/* Image Frame with strict aspect ratio to prevent CLS */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                <img
                  src={image.imageUrl}
                  alt={image.title}
                  /* MODERN WEB GUIDANCE: Below-the-fold images use loading="lazy" and decoding="async" */
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Top overlay badges */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                  <span className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-gray-900/70 text-white backdrop-blur-sm">
                    {image.category}
                  </span>

                  {image.featured && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500 text-white shadow">
                      ⭐ Featured
                    </span>
                  )}
                </div>

                {/* Hover overlay with quick actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                  <span className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600/90 rounded-lg backdrop-blur-sm">
                    🔍 View Full
                  </span>
                </div>
              </div>

              {/* Semantic <figcaption> */}
              <figcaption className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5">
                    <span>📅 {image.eventDate}</span>
                    <button
                      type="button"
                      onClick={(e) => handleLike(e, image.id)}
                      className="inline-flex items-center gap-1 text-gray-500 hover:text-pink-600 transition"
                      title="Cheer milestone"
                    >
                      <span>❤️</span>
                      <span className="font-semibold text-xs">{image.likes || 0}</span>
                    </button>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {image.title}
                  </h3>
                  {image.description && (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {image.description}
                    </p>
                  )}
                </div>

                {/* Admin Management Buttons */}
                {canManage && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(image, e)}
                      className="px-2.5 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 rounded transition"
                      title="Edit photo details"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteImage(image, e)}
                      className="px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 rounded transition"
                      title="Delete photo"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {/* Accessible Lightbox Modal (role="dialog", aria-modal="true") */}
      {lightboxIndex !== null && displayImages[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image Preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
          onClick={closeLightbox}
        >
          {/* Main Container */}
          <div
            className="relative max-w-5xl w-full h-[90vh] flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div className="flex items-center justify-between text-white p-3 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-600 rounded">
                  {displayImages[lightboxIndex].category}
                </span>
                <span className="text-xs text-gray-400">
                  {lightboxIndex + 1} of {displayImages.length}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={displayImages[lightboxIndex].imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition"
                  title="Open high resolution original"
                >
                  ↗️ Open Original
                </a>
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition text-lg"
                  title="Close viewer (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Central Stage with Next / Prev Controls */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden my-2">
              {/* Prev Button */}
              {displayImages.length > 1 && (
                <button
                  type="button"
                  onClick={prevLightboxImage}
                  className="absolute left-2 z-10 p-3 rounded-full bg-black/60 hover:bg-blue-600 text-white transition backdrop-blur-sm shadow-lg text-lg"
                  aria-label="Previous image"
                >
                  ‹
                </button>
              )}

              {/* High-res Image */}
              <img
                src={displayImages[lightboxIndex].imageUrl}
                alt={displayImages[lightboxIndex].title}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-all"
              />

              {/* Next Button */}
              {displayImages.length > 1 && (
                <button
                  type="button"
                  onClick={nextLightboxImage}
                  className="absolute right-2 z-10 p-3 rounded-full bg-black/60 hover:bg-blue-600 text-white transition backdrop-blur-sm shadow-lg text-lg"
                  aria-label="Next image"
                >
                  ›
                </button>
              )}
            </div>

            {/* Bottom Caption & Metadata */}
            <div className="bg-gray-900/90 text-white p-4 rounded-xl border border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                  <span>📅 {displayImages[lightboxIndex].eventDate}</span>
                  {displayImages[lightboxIndex].uploadedBy && (
                    <>
                      <span>•</span>
                      <span>By {displayImages[lightboxIndex].uploadedBy}</span>
                    </>
                  )}
                </div>
                <h2 className="text-base font-bold text-white truncate">
                  {displayImages[lightboxIndex].title}
                </h2>
                {displayImages[lightboxIndex].description && (
                  <p className="text-xs text-gray-300 mt-0.5 line-clamp-2">
                    {displayImages[lightboxIndex].description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleLike(e, displayImages[lightboxIndex].id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-pink-950/60 border border-pink-700/50 text-pink-400 hover:bg-pink-900/70 transition"
                >
                  <span>❤️</span>
                  <span className="font-semibold">{displayImages[lightboxIndex].likes || 0}</span>
                </button>

                {canManage && (
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(displayImages[lightboxIndex], e)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-blue-400 transition"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Upload Modal */}
      {isUploadModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Upload New Photo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>📸</span>
                <span>Upload School Event Photo</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              {/* Mode switch */}
              <div className="flex rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                    uploadMode === 'file' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                  }`}
                >
                  📁 Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('url')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                    uploadMode === 'url' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                  }`}
                >
                  🔗 Image URL
                </button>
              </div>

              {/* Image Picker */}
              {uploadMode === 'file' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select Image File *
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition bg-gray-50 hover:bg-blue-50/30"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {imagePreview ? (
                      <div className="relative aspect-video max-h-48 rounded-lg overflow-hidden mx-auto bg-gray-950">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute bottom-2 right-2 px-2 py-1 text-[10px] bg-black/70 text-white rounded">
                          Click to replace
                        </span>
                      </div>
                    ) : (
                      <div className="py-6">
                        <div className="text-3xl mb-1">🖼️</div>
                        <p className="text-xs font-medium text-gray-700">
                          Click to select a photo from your computer
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          PNG, JPG, WebP (auto-optimized for web)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Image Direct URL *
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, imageUrl: e.target.value }));
                      setImagePreview(e.target.value);
                    }}
                    placeholder="https://images.unsplash.com/photo-..."
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.imageUrl && (
                    <div className="mt-2 aspect-video max-h-40 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <img
                        src={formData.imageUrl}
                        alt="URL Preview"
                        className="w-full h-full object-contain"
                        onError={() => toast.warn('Failed to load image preview from this URL')}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Event / Photo Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Annual Athletic Meet 2026 100m Sprint"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Album / Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.slice(1).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Other">Other (Custom category)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, eventDate: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {formData.category === 'Other' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Custom Category Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customCategory}
                    onChange={(e) => setFormData(prev => ({ ...prev, customCategory: e.target.value }))}
                    placeholder="e.g. Alumni Homecoming"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description / Caption
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell the story or context behind this photo..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="Sports, Trophy, House Match"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {PRESET_TAGS.slice(0, 5).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const existing = formData.tags ? formData.tags.split(',').map(s => s.trim()) : [];
                        if (!existing.includes(tag)) {
                          setFormData(prev => ({
                            ...prev,
                            tags: existing.length > 0 ? `${existing.join(', ')}, ${tag}` : tag,
                          }));
                        }
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Featured toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="featuredToggle"
                  checked={formData.featured}
                  onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="featuredToggle" className="text-xs font-medium text-gray-700">
                  ⭐ Set as Featured Cover Photo (Shown prominently at the top)
                </label>
              </div>

              {/* Form buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition"
                >
                  {isSubmitting ? 'Uploading...' : 'Save & Publish Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Edit Modal */}
      {isEditModalOpen && editingImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit Photo Details"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>✏️</span>
                <span>Edit Photo Information</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              {/* Preview */}
              <div className="aspect-video max-h-36 rounded-lg overflow-hidden border border-gray-200 bg-gray-900">
                <img
                  src={imagePreview || editingImage.imageUrl}
                  alt={formData.title}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.slice(1).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, eventDate: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Featured toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editFeaturedToggle"
                  checked={formData.featured}
                  onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="editFeaturedToggle" className="text-xs font-medium text-gray-700">
                  ⭐ Mark as Featured Cover Photo
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition"
                >
                  {isSubmitting ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;

