'use client';

import { useState, useRef, useEffect } from 'react';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MediaItem } from '@/types/MediaItem';
import { FaCloudUploadAlt, FaTrash, FaExclamationTriangle, FaCheck, FaCheckSquare } from 'react-icons/fa';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

export const PhotosTab = ({ initialPhotos, viewAs }: { initialPhotos: MediaItem[]; viewAs?: string | null }) => {
    const [photos, setPhotos] = useState<MediaItem[]>(initialPhotos || []);
    const [uploading, setUploading] = useState(false);
    const [uploadingCount, setUploadingCount] = useState(0);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const query = viewAs ? `?viewAs=${encodeURIComponent(viewAs)}` : '';

    // Separação de sensores: Mouse instantâneo (desktop) e Touch com delay (mobile)
    // Permite que o scroll vertical nativo funcione sem conflito de drag acidental
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 10 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    // Se a lista de fotos ficar vazia, encerra automaticamente o modo de seleção
    useEffect(() => {
        if (photos.length === 0 && isSelectionMode) {
            setIsSelectionMode(false);
            setSelectedIds(new Set());
        }
    }, [photos.length, isSelectionMode]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        const fileArray = Array.from(files);
        setUploadingCount(fileArray.length);

        let successCount = 0;
        let errorCount = 0;

        for (const file of fileArray) {
            const toastId = toast.loading(`Enviando ${file.name}...`);
            try {
                // Compressão prévia no navegador para dispositivos móveis
                let fileToUpload = file;
                if (file.type.startsWith('image/')) {
                    try {
                        fileToUpload = await imageCompression(file, {
                            maxSizeMB: 1.5,
                            maxWidthOrHeight: 1920,
                            useWebWorker: true,
                            initialQuality: 0.85,
                        });
                    } catch (compErr) {
                        console.warn(`Compressão falhou para ${file.name}, usando original:`, compErr);
                        fileToUpload = file;
                    }
                }

                const formData = new FormData();
                formData.append('file', fileToUpload, file.name);
                formData.append('type', 'image');
                if (viewAs) formData.append('viewAs', viewAs);

                const uploadRes = await fetch(`/api/upload${query}`, { method: 'POST', body: formData });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) throw new Error(uploadData.error || 'Erro no upload');

                const dbRes = await fetch(`/api/user/media${query}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'image',
                        url: uploadData.url,
                        thumbnail: uploadData.thumbnail,
                        position: photos.length,
                        viewAs: viewAs || undefined
                    })
                });

                const dbData = await dbRes.json();
                if (!dbRes.ok) throw new Error('Erro ao salvar no banco');

                const newPhoto: MediaItem = {
                    id: dbData.data.id,
                    url: dbData.data.url,
                    type: 'image',
                    position: dbData.data.position,
                    thumbnail: dbData.data.thumbnail
                };

                setPhotos(prev => [...prev, newPhoto]);
                setUploadingCount(prev => Math.max(0, prev - 1));
                successCount++;
                toast.success('Foto enviada!', { id: toastId });
            } catch (err: any) {
                errorCount++;
                setUploadingCount(prev => Math.max(0, prev - 1));
                console.error(`Erro ao enviar ${file.name}:`, err.message);
                toast.error(`Falha ao enviar ${file.name}`, {
                    id: toastId,
                    description: err.message,
                });
            }
        }

        setUploading(false);
        setUploadingCount(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDelete = async (id: number | string) => {
        if (!confirm('Excluir esta foto?')) return;
        const toastId = toast.loading('Excluindo foto...');
        try {
            const res = await fetch(`/api/upload/${id}${query}`, { method: 'DELETE' });
            if (res.ok) {
                setPhotos(prev => prev.filter(p => String(p.id) !== String(id)));
                toast.success('Foto excluída com sucesso!', { id: toastId });
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || data.message || 'Erro ao excluir', { id: toastId });
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao excluir', { id: toastId });
        }
    };

    const toggleSelect = (id: number | string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            const key = String(id);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handleSelectAllToggle = () => {
        if (selectedIds.size === photos.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(photos.map(p => String(p.id))));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        const count = selectedIds.size;
        if (!confirm(`Tem certeza que deseja excluir ${count} foto${count > 1 ? 's' : ''} permanentemente?`)) return;

        setIsBulkDeleting(true);
        const toastId = toast.loading(`Excluindo ${count} foto${count > 1 ? 's' : ''}...`);

        try {
            const res = await fetch(`/api/upload/bulk-delete${query}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: Array.from(selectedIds),
                    viewAs: viewAs || undefined
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setPhotos(prev => prev.filter(p => !selectedIds.has(String(p.id))));
                setSelectedIds(new Set());
                setIsSelectionMode(false);
                toast.success(`${count} foto${count > 1 ? 's' : ''} excluída${count > 1 ? 's' : ''} com sucesso!`, { id: toastId });
            } else {
                toast.error(data.message || data.error || 'Erro ao excluir fotos', { id: toastId });
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao excluir fotos', { id: toastId });
        } finally {
            setIsBulkDeleting(false);
        }
    };

    async function handleDragEnd(event: DragEndEvent) {
        if (isSelectionMode) return;
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = photos.findIndex((p) => String(p.id) === String(active.id));
            const newIndex = photos.findIndex((p) => String(p.id) === String(over.id));
            const newOrder = arrayMove(photos, oldIndex, newIndex);
            setPhotos(newOrder);
            const mediaPositions = newOrder.map((item, index) => ({ id: item.id, position: index }));
            fetch(`/api/user/media${query}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mediaPositions, viewAs: viewAs || undefined })
            });
        }
    }

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-gray-800">Minhas Fotos</h2>
                    {photos.length > 0 && (
                        <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                            {photos.length}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {photos.length > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                if (isSelectionMode) {
                                    setIsSelectionMode(false);
                                    setSelectedIds(new Set());
                                } else {
                                    setIsSelectionMode(true);
                                }
                            }}
                            disabled={uploading || isBulkDeleting}
                            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                                isSelectionMode
                                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <FaCheckSquare size={13} className={isSelectionMode ? 'text-indigo-600' : 'text-gray-500'} />
                            {isSelectionMode ? 'Cancelar Seleção' : 'Selecionar'}
                        </button>
                    )}

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || isBulkDeleting}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
                    >
                        <FaCloudUploadAlt />
                        {uploading ? `Enviando...` : 'Adicionar Fotos'}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" multiple className="hidden" />
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={photos.filter(p => p?.id).map(p => String(p.id))} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {photos.map((photo) => (
                            <SortablePhoto
                                key={photo.id}
                                photo={photo}
                                onDelete={handleDelete}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedIds.has(String(photo.id))}
                                onToggleSelect={toggleSelect}
                            />
                        ))}
                        {/* Skeletons de loading para cada foto em envio */}
                        {Array.from({ length: uploadingCount }).map((_, i) => (
                            <div
                                key={`skeleton-${i}`}
                                className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-50 animate-pulse"
                            >
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                    <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                                    <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Enviando</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Barra de Ações Flutuante (Bottom Thumb Zone no mobile / Barra de rodapé no desktop) */}
            {isSelectionMode && (
                <div className="fixed bottom-5 inset-x-4 md:inset-x-auto md:right-8 md:min-w-[400px] bg-white/95 backdrop-blur-md border border-gray-200 shadow-2xl rounded-2xl p-3.5 z-50 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5">
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={handleSelectAllToggle}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            {selectedIds.size === photos.length ? 'Desmarcar todas' : 'Selecionar todas'}
                        </button>
                        <span className="text-xs font-semibold text-gray-600">
                            {selectedIds.size === 0
                                ? 'Nenhuma'
                                : `${selectedIds.size} de ${photos.length}`}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsSelectionMode(false);
                                setSelectedIds(new Set());
                            }}
                            disabled={isBulkDeleting}
                            className="text-xs font-bold text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkDelete}
                            disabled={selectedIds.size === 0 || isBulkDeleting}
                            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm active:scale-95 disabled:active:scale-100 transition-all"
                        >
                            <FaTrash size={12} />
                            {isBulkDeleting ? 'Excluindo...' : `Excluir (${selectedIds.size})`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

function SortablePhoto({
    photo,
    onDelete,
    isSelectionMode,
    isSelected,
    onToggleSelect,
}: {
    photo: MediaItem;
    onDelete: (id: number | string) => void;
    isSelectionMode: boolean;
    isSelected: boolean;
    onToggleSelect: (id: number | string) => void;
}) {
    const [hasError, setHasError] = useState(false);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({
            id: String(photo.id),
            disabled: isSelectionMode,
        });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                zIndex: isDragging ? 50 : 0,
                // Permite scroll livre no mobile em modo de seleção ou quando não está arrastando
                touchAction: isSelectionMode ? 'auto' : (isDragging ? 'none' : 'pan-y'),
            }}
            {...(isSelectionMode ? {} : attributes)}
            {...(isSelectionMode ? {} : listeners)}
            onClick={() => {
                if (isSelectionMode) {
                    onToggleSelect(photo.id);
                }
            }}
            className={`group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border transition-all select-none ${
                isSelectionMode
                    ? `cursor-pointer ${
                          isSelected
                              ? 'ring-2 ring-indigo-600 shadow-md border-transparent scale-[0.98]'
                              : 'border-gray-200 hover:border-gray-300'
                      }`
                    : isDragging
                    ? 'scale-105 shadow-xl ring-2 ring-indigo-500 z-50 border-gray-100'
                    : 'cursor-grab border-gray-100'
            }`}
        >
            {hasError ? (
                <div className="flex flex-col items-center justify-center p-3 text-center gap-1.5 bg-gray-50 w-full h-full text-gray-400 select-none">
                    <FaExclamationTriangle className="text-amber-500/80" size={22} />
                    <span className="text-[11px] font-semibold text-gray-500">Foto ausente</span>
                    {!isSelectionMode && (
                        <span className="text-[10px] text-gray-400">Toque na lixeira para excluir</span>
                    )}
                </div>
            ) : (
                <img
                    src={photo.url}
                    className={`w-full h-full object-cover pointer-events-none transition-opacity ${
                        isSelectionMode && isSelected ? 'opacity-90' : 'opacity-100'
                    }`}
                    alt=""
                    draggable={false}
                    onError={() => setHasError(true)}
                />
            )}

            {/* Overlay sutil de seleção */}
            {isSelectionMode && isSelected && (
                <div className="absolute inset-0 bg-indigo-950/15 pointer-events-none" />
            )}

            {/* Checkbox Circular no modo de seleção (Mobile-friendly e touch target claro) */}
            {isSelectionMode && (
                <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
                    <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                            isSelected
                                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-white scale-100'
                                : 'bg-black/35 backdrop-blur-sm border-2 border-white/90 text-transparent scale-95'
                        }`}
                    >
                        <FaCheck size={11} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                    </div>
                </div>
            )}

            {/* No modo normal: No mobile (touch), a lixeira fica sempre visível. No desktop, surge no hover */}
            {!isSelectionMode && (
                <div
                    className={`absolute inset-0 z-10 md:bg-black/20 ${
                        hasError ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'
                    } flex items-start justify-end p-2 transition-opacity pointer-events-none`}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(photo.id);
                        }}
                        className="w-9 h-9 flex items-center justify-center bg-red-500 text-white rounded-xl hover:bg-red-600 pointer-events-auto transition-transform active:scale-95 shadow-md"
                        title="Excluir foto"
                        aria-label="Excluir foto"
                    >
                        <FaTrash size={13} />
                    </button>
                </div>
            )}
        </div>
    );
}