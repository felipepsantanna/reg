'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd';
import StrictModeDroppable from '../StrictModeDroppable';
import { useRouter } from 'next/navigation';
import { uploadToBunnyCDN } from '@/lib/uploadBunny';

interface ProcessingFile {
    id: string;
    file: File;
    progress: number;
    type: 'image' | 'video';
    name: string;
    status: 'uploading' | 'completed' | 'error';
}

interface MediaItem {
    id: string;
    type: 'image' | 'video';
    url: string;
    thumbnail: string;
    position: number;
}

export interface MediaUploadResponse {
    thumbnail: string;
    url: string;
}


const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function DashboardPage() {

    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
    const router = useRouter();


    useEffect(() => {
        // Carregar mídias do usuário
        const fetchMedia = async () => {
            try {
                const response = await fetch('/api/user/media');

                if (response.ok) {
                    const data = await response.json();
                    setMediaItems(data.media || []);
                }
            } catch (error) {
                console.error('Erro ao carregar mídias:', error);
            }
        };

        fetchMedia();
    }, []);



    const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newProcessingFiles: ProcessingFile[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');

            if (!isImage && !isVideo) {
                alert('Tipo de arquivo não suportado. Apenas imagens e vídeos são permitidos.');
                continue;
            }

            const maxSize = isImage ? Number(process.env.NEXT_PUBLIC_MAX_FOTO_SIZE) : Number(process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE);
            if (file.size > maxSize) {
                alert(`Arquivo muito grande. O tamanho máximo permitido é ${formatFileSize(maxSize)}`);
                continue;
            }

            const maxCount = isImage ? Number(process.env.NEXT_PUBLIC_MAX_FOTOS) : Number(process.env.NEXT_PUBLIC_MAX_VIDEOS);
            const currentCount = mediaItems.filter(item => item.type === (isImage ? 'image' : 'video')).length;
            if (currentCount >= maxCount) {
                alert(`Limite de ${maxCount} ${isImage ? 'fotos' : 'vídeos'} atingido`);
                continue;
            }

            const newProcessingFile: ProcessingFile = {
                id: `${Date.now()}-${i}`,
                file,
                progress: 0,
                type: isImage ? 'image' : 'video',
                name: file.name,
                status: 'uploading'
            };
            newProcessingFiles.push(newProcessingFile);
            setProcessingFiles(prev => [...prev, newProcessingFile]);

            try {

                let objectMediaUpload: MediaUploadResponse;
                if (isImage) {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('fileType', file.type);

                    const uploadResponse = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });

                    if (!uploadResponse.ok) {
                        throw new Error('Erro ao salvar mídia no banco de dados');
                    }
                    objectMediaUpload = await uploadResponse.json() as MediaUploadResponse;
                }
                else {
                    objectMediaUpload = await uploadToBunnyCDN(file, file.type);
                }
                // Salvar mídia no banco de dados
                const response = await fetch('/api/user/media', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: isImage ? 'image' : 'video',
                        url: objectMediaUpload.url,
                        thumbnail: objectMediaUpload.thumbnail,
                        position: mediaItems.length
                    })
                });

                if (!response.ok) {
                    throw new Error('Erro ao salvar mídia no banco de dados');
                }

                const { data } = await response.json();

                setProcessingFiles(prev => prev.map(pf =>
                    pf.id === newProcessingFile.id
                        ? { ...pf, progress: 100, status: 'completed' }
                        : pf
                ));

                setMediaItems(prev => [...prev, {
                    id: data.id,
                    type: isImage ? 'image' : 'video',
                    url: data.url,
                    thumbnail: data.thumbnail,
                    position: mediaItems.length + 1
                }]);



                setProcessingFiles((prev: ProcessingFile[]) => prev.filter(item => item.id !== newProcessingFile.id));

            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                setProcessingFiles(prev => prev.map(pf =>
                    pf.id === newProcessingFile.id
                        ? { ...pf, status: 'error' }
                        : pf
                ));
            }
        }
    };

    const handleDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(mediaItems);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Atualizar posições localmente primeiro
        const updatedItems = items.map((item, index) => ({
            ...item,
            position: index
        }));

        setMediaItems(updatedItems);

        try {
            const response = await fetch('/api/user/media', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mediaPositions: updatedItems.map((item, index) => ({
                        id: item.id,
                        position: index
                    }))
                })
            });

            if (!response.ok) {
                throw new Error('Erro ao atualizar posições');
            }
        } catch (error) {
            console.error('Erro ao salvar nova ordem:', error);

        }
    };

    const removeMedia = async (id: string) => {

        try {
            const response = await fetch(`/api/upload/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setMediaItems((prev: MediaItem[]) => prev.filter(item => item.id !== id));
            }
        } catch (error) {
            console.error('Erro ao carregar mídias:', error);
        }
    };


    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Uploads</h1>
                    <button
                        onClick={async () => {
                            try {
                                const response = await fetch('/api/auth/logout', {
                                    method: 'POST',
                                });
                                if (response.ok) {
                                    router.push('/login');
                                }
                            } catch (error) {
                                console.error('Erro ao fazer logout:', error);
                            }
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                    >
                        Sair
                    </button>
                </div>

                <ul className="flex flex-wrap text-sm font-medium text-center border-b border-indigo-200 dark:border-indigo-700">
                    <li className="me-2">
                        <a href="/dashboard" className="inline-block p-4 border border-transparent text-sm font-medium rounded-md hover:bg-indigo-700 hover:text-white dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Profile</a>
                    </li>
                    <li className="me-2">
                        <a href="#" aria-current="page" className="inline-block p-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Uploads</a>
                    </li>
                </ul>

                {/* Upload de mídia */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-2xl font-bold mb-4">Suas Mídias</h2>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Adicionar Imagens ou Vídeos
                        </label>
                        <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={handleMediaChange}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                            Imagens até 10MB, vídeos até 100MB
                        </p>
                    </div>

                    {/* Lista de processamento */}
                    {processingFiles.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-medium mb-2">Processando arquivos...</h3>
                            <div className="space-y-2">
                                {processingFiles.map(item => (
                                    <div key={item.id} className="flex items-center">
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className="bg-blue-600 h-2.5 rounded-full"
                                                style={{ width: `${item.progress}%` }}
                                            ></div>
                                        </div>
                                        <span className="ml-2 text-sm text-gray-600">{item.name}</span>
                                        <span className="ml-2 text-sm text-gray-600">{item.progress}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Galeria de mídias */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-sm text-gray-600">
                                <p>Fotos: {mediaItems.filter(item => item.type === 'image').length}/{process.env.NEXT_PUBLIC_MAX_FOTOS}</p>
                                <p>Vídeos: {mediaItems.filter(item => item.type === 'video').length}/{process.env.NEXT_PUBLIC_MAX_VIDEOS}</p>
                            </div>
                            <div className="text-sm text-gray-600">
                                <p>Limite de fotos: {Number(process.env.NEXT_PUBLIC_MAX_FOTO_SIZE) / 1024 / 1024}MB</p>
                                <p>Limite de vídeos: {Number(process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE) / 1024 / 1024}MB</p>
                            </div>
                        </div>

                        <DragDropContext onDragEnd={handleDragEnd}>
                            <StrictModeDroppable droppableId="media-gallery">
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                                    >
                                        {mediaItems.map((item, index) => (
                                            <Draggable
                                                key={item.id.toString()}
                                                draggableId={item.id.toString()}
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`relative aspect-square ${snapshot.isDragging ? 'z-50' : ''}`}
                                                    >
                                                        <div className="aspect-square w-full">
                                                            {item.type === 'image' ? (
                                                                <img
                                                                    src={item.url}
                                                                    alt="Mídia"
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        console.error('Erro ao carregar imagem:', e);
                                                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150x150?text=Erro+ao+carregar';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="relative w-full h-full">
                                                                    <video
                                                                        src={`https://vz-ddb4a7c6-db0.b-cdn.net/${item.url}/preview.webp`}
                                                                        poster={item.thumbnail}
                                                                        className="w-full h-full object-cover"

                                                                    />
                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                            </svg>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="absolute top-2 left-2 z-20 bg-black/70 text-white px-2 py-1 rounded text-sm">
                                                            {index + 1}
                                                        </div>
                                                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                                                            <div className="bg-black/70 text-white px-2 py-1 rounded text-sm">
                                                                {item.type === 'image' ? 'Imagem' : 'Vídeo'}
                                                            </div>
                                                            <button
                                                                onClick={() => removeMedia(item.id)}
                                                                className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </StrictModeDroppable>
                        </DragDropContext>
                    </div>
                </div>
            </div>
        </div>
    );
}