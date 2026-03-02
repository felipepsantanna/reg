'use client';

import { useState, useRef } from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MediaItem } from '@/types/MediaItem';
import { FaVideo, FaTrash } from 'react-icons/fa';
import { uploadToBunnyCDN } from '@/lib/uploadBunny';

export const VideosTab = ({ initialVideos }: { initialVideos: MediaItem[] }) => {
    const [videos, setVideos] = useState<MediaItem[]>(initialVideos || []);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(TouchSensor, {
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

        for (const file of fileArray) {
            try {
                const videoData = await uploadToBunnyCDN(file, file.type);
                if (!videoData?.url) throw new Error('Erro no upload');

                const dbRes = await fetch('/api/user/media', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'video',
                        url: videoData.url,
                        thumbnail: videoData.thumbnail || videoData.url,
                        position: videos.length, // mantendo sua lógica atual
                    }),
                });

                const dbData = await dbRes.json();
                if (!dbRes.ok) throw new Error('Erro ao salvar');

                const newVideo: MediaItem = {
                    id: dbData.data.id,
                    url: dbData.data.url,
                    type: 'video',
                    position: dbData.data.position,
                    thumbnail: dbData.data.thumbnail,
                };

                setVideos((prev) => [...prev, newVideo]);
            } catch (err: any) {
                console.error(`Erro no vídeo ${file.name}:`, err?.message);
            }
        }

        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDelete = async (id: number | string) => {
        if (!confirm('Excluir este vídeo?')) return;

        try {
            const res = await fetch(`/api/upload/${id}`, { method: 'DELETE' });
            if (res.ok) setVideos((prev) => prev.filter((v) => String(v.id) !== String(id)));
        } catch (err) {
            alert('Erro ao excluir');
        }
    };

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = videos.findIndex((v) => String(v.id) === String(active.id));
        const newIndex = videos.findIndex((v) => String(v.id) === String(over.id));
        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = arrayMove(videos, oldIndex, newIndex);
        setVideos(newOrder);

        const mediaPositions = newOrder.map((item, index) => ({ id: item.id, position: index }));

        fetch('/api/user/media', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mediaPositions }),
        });
    }

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-gray-800">Meus Vídeos</h2>

                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:bg-gray-400"
                >
                    <FaVideo size={14} />
                    {uploading ? 'Processando...' : 'Adicionar Vídeos'}
                </button>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUpload}
                    accept="video/*"
                    multiple
                    className="hidden"
                />
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                    items={videos.filter((v) => v?.id).map((v) => String(v.id))}
                    strategy={rectSortingStrategy}
                >
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {videos.map((video) => (
                            <SortableVideo key={video.id} video={video} onDelete={handleDelete} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};

function SortableVideo({
    video,
    onDelete,
}: {
    video: MediaItem;
    onDelete: (id: number | string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: String(video.id),
    });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                zIndex: isDragging ? 50 : 0,
                touchAction: 'none', // ✅ essencial no mobile para o DnD funcionar
            }}
            {...attributes}
            {...listeners}
            className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 cursor-grab border border-gray-50"
        >
            <video
                src={video.url}
                className="w-full h-full object-cover"
                controls
                playsInline
                preload="metadata"
            />

            {/* ✅ No mobile não existe hover: deixamos sempre visível; no desktop aparece no hover */}
            <div
                className="
          absolute inset-0
          bg-black/20
          opacity-100 md:opacity-0 md:group-hover:opacity-100
          flex items-start justify-end p-2
          transition-opacity
          pointer-events-none
        "
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(video.id);
                    }}
                    className="pointer-events-auto bg-red-500 text-white p-2 rounded-lg hover:bg-red-600"
                    aria-label="Excluir vídeo"
                    title="Excluir"
                >
                    <FaTrash size={12} />
                </button>
            </div>
        </div>
    );
}