// @/components/dashboard/PhotosTab.tsx
'use client';
import { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MediaItem } from '@/types/MediaItem';

export const PhotosTab = ({ initialPhotos }: { initialPhotos: MediaItem[] }) => {
    const [photos, setPhotos] = useState<MediaItem[]>(initialPhotos || []);
    const sensors = useSensors(useSensor(PointerSensor));

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = photos.findIndex((p) => p.id === active.id);
            const newIndex = photos.findIndex((p) => p.id === over.id);
            const newOrder = arrayMove(photos, oldIndex, newIndex);

            setPhotos(newOrder);

            // Preparar dados para sua API PUT api/user/media
            const mediaPositions = newOrder.map((item, index) => ({
                id: item.id,
                position: index
            }));

            try {
                await fetch('/api/user/media', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mediaPositions }),
                });
            } catch (err) {
                console.error("Erro ao salvar nova ordem das fotos");
            }
        }
    }

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-black mb-6 text-gray-800">Minhas Fotos</h2>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={photos.map(p => p.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {photos.map((photo) => (
                            <SortableItem key={photo.id} photo={photo} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};

// Componente de Item (Simplificado para o exemplo)
function SortableItem({ photo }: { photo: MediaItem }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: photo.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 cursor-grab">
            <img src={photo.url} className="w-full h-full object-cover" alt="Foto" />
        </div>
    );
}