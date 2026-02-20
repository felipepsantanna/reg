// src/components/dashboard/VideosTab.tsx
'use client';
import { useState } from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaPlay, FaTrash } from 'react-icons/fa';
import { MediaItem } from '@/types/MediaItem';

export const VideosTab = ({ initialVideos }: { initialVideos: MediaItem[] }) => {
    const [videos, setVideos] = useState<MediaItem[]>(initialVideos || []);
    const sensors = useSensors(useSensor(PointerSensor));

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = videos.findIndex((v) => v.id === active.id);
            const newIndex = videos.findIndex((v) => v.id === over.id);
            const newOrder = arrayMove(videos, oldIndex, newIndex);

            setVideos(newOrder);

            // Enviar nova ordem para a API PUT
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
                console.error("Erro ao salvar ordem dos vídeos:", err);
            }
        }
    }

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-gray-800">Meus Vídeos</h2>
                <button className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors">
                    + Adicionar Vídeo
                </button>
            </div>

            {videos.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-3xl">
                    <p className="text-gray-400 font-medium">Você ainda não possui vídeos.</p>
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={videos.map(v => v.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {videos.map((video) => (
                                <SortableVideo key={video.id} video={video} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
};

function SortableVideo({ video }: { video: MediaItem }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: video.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="group relative aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing border border-gray-100"
        >
            {/* Thumbnail ou Vídeo */}
            <img
                src={video.thumbnail || video.url}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                alt="Thumbnail do vídeo"
            />

            {/* Overlay de Play */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-md p-4 rounded-full text-white">
                    <FaPlay size={20} />
                </div>
            </div>

            {/* Botão Deletar (opcional) */}
            <button className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                <FaTrash size={12} />
            </button>
        </div>
    );
}