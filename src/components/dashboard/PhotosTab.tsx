'use client';

import { useState, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MediaItem } from '@/types/MediaItem';
import { FaCloudUploadAlt, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'sonner';

export const PhotosTab = ({ initialPhotos, viewAs }: { initialPhotos: MediaItem[]; viewAs?: string | null }) => {
    const [photos, setPhotos] = useState<MediaItem[]>(initialPhotos || []);
    const [uploading, setUploading] = useState(false);
    const [uploadingCount, setUploadingCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const query = viewAs ? `?viewAs=${encodeURIComponent(viewAs)}` : '';

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(TouchSensor, {
            // iOS/Safari: delay ajuda a não conflitar com scroll/toque
            activationConstraint: {
                delay: 120,
                tolerance: 8,
            },
        })
    );

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
                const formData = new FormData();
                formData.append('file', file);
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

    async function handleDragEnd(event: DragEndEvent) {
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
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-gray-800">Minhas Fotos</h2>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
                >
                    <FaCloudUploadAlt />
                    {uploading ? `Enviando...` : 'Adicionar Fotos'}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" multiple className="hidden" />
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={photos.filter(p => p?.id).map(p => String(p.id))} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {photos.map((photo) => (
                            <SortablePhoto key={photo.id} photo={photo} onDelete={handleDelete} />
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
        </div>
    );
};
function SortablePhoto({ photo, onDelete }: { photo: MediaItem, onDelete: (id: number | string) => void }) {
    const [hasError, setHasError] = useState(false);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: String(photo.id) });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                zIndex: isDragging ? 50 : 0,
                touchAction: 'none', // ✅ essencial no mobile
            }}
            {...attributes}
            {...listeners}
            className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 cursor-grab border border-gray-100 flex items-center justify-center"
        >
            {hasError ? (
                <div className="flex flex-col items-center justify-center p-3 text-center gap-1.5 bg-gray-50 w-full h-full text-gray-400 select-none">
                    <FaExclamationTriangle className="text-amber-500/80" size={22} />
                    <span className="text-[11px] font-semibold text-gray-500">Foto ausente</span>
                    <span className="text-[10px] text-gray-400">Clique na lixeira para excluir</span>
                </div>
            ) : (
                <img
                    src={photo.url}
                    className="w-full h-full object-cover"
                    alt=""
                    draggable={false}
                    onError={() => setHasError(true)}
                />
            )}
            <div className={`absolute inset-0 bg-black/20 ${hasError ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} flex items-start justify-end p-2 transition-opacity pointer-events-none`}>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(photo.id); }}
                    className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 pointer-events-auto transition-transform active:scale-95 shadow-sm"
                    title="Excluir foto"
                >
                    <FaTrash size={12} />
                </button>
            </div>
        </div>
    );
}