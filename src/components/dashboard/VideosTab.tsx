'use client';

import { useState, useRef, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MediaItem } from '@/types/MediaItem';
import { FaVideo, FaTrash, FaCheck, FaCheckSquare } from 'react-icons/fa';
import { uploadToBunnyCDN } from '@/lib/uploadBunny';
import { toast } from 'sonner';

export const VideosTab = ({ initialVideos, viewAs }: { initialVideos: MediaItem[]; viewAs?: string | null }) => {
    const [videos, setVideos] = useState<MediaItem[]>(initialVideos || []);
    const [uploading, setUploading] = useState(false);
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

    // Se a lista de vídeos ficar vazia, encerra automaticamente o modo de seleção
    useEffect(() => {
        if (videos.length === 0 && isSelectionMode) {
            setIsSelectionMode(false);
            setSelectedIds(new Set());
        }
    }, [videos.length, isSelectionMode]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        const fileArray = Array.from(files);
        const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

        for (const file of fileArray) {
            if (file.size > MAX_VIDEO_SIZE) {
                toast.error(`O vídeo ${file.name} ultrapassa o limite de 100MB.`);
                continue;
            }

            const toastId = toast.loading(`Enviando vídeo ${file.name}...`);
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
                toast.success(`Vídeo ${file.name} enviado!`, { id: toastId });
            } catch (err: any) {
                console.error(`Erro no vídeo ${file.name}:`, err?.message);
                toast.error(`Falha ao enviar ${file.name}`, { id: toastId, description: err?.message });
            }
        }

        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDelete = async (id: number | string) => {
        if (!confirm('Excluir este vídeo?')) return;
        const toastId = toast.loading('Excluindo vídeo...');
        try {
            const res = await fetch(`/api/upload/${id}${query}`, { method: 'DELETE' });
            if (res.ok) {
                setVideos((prev) => prev.filter((v) => String(v.id) !== String(id)));
                toast.success('Vídeo excluído com sucesso!', { id: toastId });
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || data.message || 'Erro ao excluir vídeo', { id: toastId });
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao excluir vídeo', { id: toastId });
        }
    };

    const toggleSelect = (id: number | string) => {
        setSelectedIds((prev) => {
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
        if (selectedIds.size === videos.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(videos.map((v) => String(v.id))));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        const count = selectedIds.size;
        if (!confirm(`Tem certeza que deseja excluir ${count} vídeo${count > 1 ? 's' : ''} permanentemente?`)) return;

        setIsBulkDeleting(true);
        const toastId = toast.loading(`Excluindo ${count} vídeo${count > 1 ? 's' : ''}...`);

        try {
            const res = await fetch(`/api/upload/bulk-delete${query}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: Array.from(selectedIds),
                    viewAs: viewAs || undefined,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setVideos((prev) => prev.filter((v) => !selectedIds.has(String(v.id))));
                setSelectedIds(new Set());
                setIsSelectionMode(false);
                toast.success(`${count} vídeo${count > 1 ? 's' : ''} excluído${count > 1 ? 's' : ''} com sucesso!`, { id: toastId });
            } else {
                toast.error(data.message || data.error || 'Erro ao excluir vídeos', { id: toastId });
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao excluir vídeos', { id: toastId });
        } finally {
            setIsBulkDeleting(false);
        }
    };

    async function handleDragEnd(event: DragEndEvent) {
        if (isSelectionMode) return;
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
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-gray-800">Meus Vídeos</h2>
                    {videos.length > 0 && (
                        <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                            {videos.length}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {videos.length > 0 && (
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
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                    items={videos.filter((v) => v?.id).map((v) => String(v.id))}
                    strategy={rectSortingStrategy}
                >
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {videos.map((video) => (
                            <SortableVideo
                                key={video.id}
                                video={video}
                                onDelete={handleDelete}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedIds.has(String(video.id))}
                                onToggleSelect={toggleSelect}
                            />
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
                            {selectedIds.size === videos.length ? 'Desmarcar todos' : 'Selecionar todos'}
                        </button>
                        <span className="text-xs font-semibold text-gray-600">
                            {selectedIds.size === 0
                                ? 'Nenhum'
                                : `${selectedIds.size} de ${videos.length}`}
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

function SortableVideo({
    video,
    onDelete,
    isSelectionMode,
    isSelected,
    onToggleSelect,
}: {
    video: MediaItem;
    onDelete: (id: number | string) => void;
    isSelectionMode: boolean;
    isSelected: boolean;
    onToggleSelect: (id: number | string) => void;
}) {
    const [posterError, setPosterError] = useState(false);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: String(video.id),
        disabled: isSelectionMode,
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
                // Permite scroll vertical livre (pan-y) quando não está ativamente arrastando
                touchAction: isSelectionMode ? 'auto' : (isDragging ? 'none' : 'pan-y'),
            }}
            {...(isSelectionMode ? {} : attributes)}
            {...(isSelectionMode ? {} : listeners)}
            onClick={() => {
                if (isSelectionMode) {
                    onToggleSelect(video.id);
                }
            }}
            className={`group relative aspect-square rounded-2xl overflow-hidden bg-gray-900 border transition-all select-none ${
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
                className={`w-full h-full object-cover transition-opacity ${
                    isSelectionMode && isSelected ? 'opacity-85' : 'opacity-100'
                }`}
                controls={!isSelectionMode}
                playsInline
                preload="metadata"
                // Impede que toques nos botões do player iniciem o drag and drop acidentalmente
                onPointerDown={(e) => {
                    if (!isSelectionMode) e.stopPropagation();
                }}
                onTouchStart={(e) => {
                    if (!isSelectionMode) e.stopPropagation();
                }}
            >
                {videoSources.map((source, index) => (
                    <source key={index} src={source.src} type={source.type} />
                ))}
                Seu navegador não suporta a reprodução deste vídeo.
            </video>

            {/* Aviso visual caso o vídeo ainda esteja em processamento no Bunny CDN */}
            {posterError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white p-3 text-center pointer-events-none z-10">
                    <FaVideo className="text-indigo-400 text-2xl mb-2 animate-pulse" />
                    <span className="text-xs font-bold text-gray-200">Processando vídeo...</span>
                    <span className="text-[10px] text-gray-400 mt-1 leading-tight">A capa e a reprodução estarão disponíveis assim que a Bunny concluir o processamento.</span>
                </div>
            )}

            {/* Overlay sutil de seleção para evitar toques no player durante a seleção */}
            {isSelectionMode && (
                <div
                    className={`absolute inset-0 z-10 transition-colors pointer-events-none ${
                        isSelected ? 'bg-indigo-950/25' : 'bg-transparent'
                    }`}
                />
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

            {/* No modo normal: No mobile (touch), a lixeira fica sempre visível (opacity-100). No desktop, surge no hover */}
            {!isSelectionMode && (
                <div
                    className="
                        absolute inset-0
                        z-10
                        md:bg-black/20
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
                        className="w-9 h-9 flex items-center justify-center pointer-events-auto bg-red-500 text-white rounded-xl hover:bg-red-600 transition-transform active:scale-95 shadow-md"
                        aria-label="Excluir vídeo"
                        title="Excluir"
                    >
                        <FaTrash size={13} />
                    </button>
                </div>
            )}
        </div>
    );
}