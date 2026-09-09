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

export const VideosTab = ({ initialVideos, viewAs }: { initialVideos: MediaItem[]; viewAs?: string | null }) => {
    const [videos, setVideos] = useState<MediaItem[]>(initialVideos || []);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const query = viewAs ? `?viewAs=${encodeURIComponent(viewAs)}` : '';

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

                const dbRes = await fetch(`/api/user/media${query}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'video',
                        url: videoData.url,
                        thumbnail: videoData.thumbnail || videoData.url,
                        position: videos.length,
                        viewAs: viewAs || undefined
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
            const res = await fetch(`/api/upload/${id}${query}`, { method: 'DELETE' });
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

        fetch(`/api/user/media${query}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mediaPositions, viewAs: viewAs || undefined }),
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
    const [posterError, setPosterError] = useState(false);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: String(video.id),
    });

    const cdnHost = 'https://vz-ddb4a7c6-db0.b-cdn.net';

    // Determina a URL da capa (poster)
    const posterUrl = video.thumbnail?.startsWith('http')
        ? video.thumbnail
        : video.url?.startsWith('http')
            ? video.thumbnail
            : `${cdnHost}/${video.url}/thumbnail.jpg`;

    // Determina as URLs de reprodução do vídeo
    const isExternal = video.url?.startsWith('http');
    const videoSources = isExternal
        ? [{ src: video.url, type: 'video/mp4' }]
        : [
            { src: `${cdnHost}/${video.url}/play_720p.mp4`, type: 'video/mp4' },
            { src: `${cdnHost}/${video.url}/play_480p.mp4`, type: 'video/mp4' },
            { src: `${cdnHost}/${video.url}/play_360p.mp4`, type: 'video/mp4' },
        ];

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
            className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-900 cursor-grab border border-gray-100"
        >
            {/* Pré-validação da thumbnail para detectar se ainda está em processamento no CDN */}
            <img
                src={posterUrl}
                alt=""
                className="hidden"
                onError={() => setPosterError(true)}
                onLoad={() => setPosterError(false)}
            />

            <video
                poster={posterError ? undefined : posterUrl}
                className="w-full h-full object-cover"
                controls
                playsInline
                preload="metadata"
            >
                {videoSources.map((source, index) => (
                    <source key={index} src={source.src} type={source.type} />
                ))}
                Seu navegador não suporta a reprodução deste vídeo.
            </video>

            {/* Aviso visual caso o vídeo ainda esteja em processamento no Bunny CDN */}
            {posterError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white p-3 text-center pointer-events-none">
                    <FaVideo className="text-indigo-400 text-2xl mb-2 animate-pulse" />
                    <span className="text-xs font-bold text-gray-200">Processando vídeo...</span>
                    <span className="text-[10px] text-gray-400 mt-1 leading-tight">A capa e a reprodução estarão disponíveis assim que a Bunny concluir o processamento.</span>
                </div>
            )}

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
                    className="pointer-events-auto bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                    aria-label="Excluir vídeo"
                    title="Excluir"
                >
                    <FaTrash size={12} />
                </button>
            </div>
        </div>
    );
}