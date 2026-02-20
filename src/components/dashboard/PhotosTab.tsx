'use client';

import { useState, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MediaItem } from '@/types/MediaItem';
import { FaCloudUploadAlt, FaTrash } from 'react-icons/fa';

export const PhotosTab = ({ initialPhotos }: { initialPhotos: MediaItem[] }) => {
    const [photos, setPhotos] = useState<MediaItem[]>(initialPhotos || []);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const file = files[0];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'image');

            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok) throw new Error(uploadData.error || 'Erro no upload');

            const dbRes = await fetch('/api/user/media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'image',
                    url: uploadData.url,
                    thumbnail: uploadData.thumbnail,
                    position: photos.length
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
        } catch (err: any) {
            alert(err.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id: number | string) => {
        if (!confirm('Tem certeza que deseja excluir esta foto?')) return;

        try {
            const res = await fetch(`/api/upload/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Erro ao excluir arquivo');

            // Remove do estado local
            setPhotos(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            alert(err.message);
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
            await fetch('/api/user/media', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mediaPositions }),
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
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:bg-gray-400"
                >
                    <FaCloudUploadAlt />
                    {uploading ? 'Enviando...' : 'Adicionar Foto'}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" className="hidden" />
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={photos.filter(p => p?.id).map(p => String(p.id))} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {photos.map((photo) => (
                            <SortablePhoto key={photo.id} photo={photo} onDelete={handleDelete} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};

function SortablePhoto({ photo, onDelete }: { photo: MediaItem, onDelete: (id: number | string) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(photo.id) });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 0 }}
            {...attributes}
            {...listeners}
            className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 cursor-grab border border-gray-50"
        >
            <img src={photo.url} className="w-full h-full object-cover" alt="" draggable={false} />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-start justify-end p-2 transition-opacity">
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Evita ativar o drag ao clicar no delete
                        onDelete(photo.id);
                    }}
                    className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 shadow-lg active:scale-90 transition-transform"
                >
                    <FaTrash size={12} />
                </button>
            </div>
        </div>
    );
}