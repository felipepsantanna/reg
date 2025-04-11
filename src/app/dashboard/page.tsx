'use client';

import { useState, useEffect } from 'react';
import { AiOutlineInfoCircle, AiOutlineSmile, AiOutlineLoading3Quarters, AiOutlineDrag } from 'react-icons/ai';
import EmojiPicker from 'emoji-picker-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { S3Client, PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import CryptoJS from 'crypto-js';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import UserProfileForm, { UserProfileData } from './UserProfileForm';
import StrictModeDroppable from './StrictModeDroppable';

interface FormData {
    nome: string;
    telefone: string;
    sexo: string;
    tamanhoDote?: string;
    idade: string;
    altura: string;
    peso: string;
    localAtendimento: string[];
    atende: string[];
    formaPagamento: string[];
    redesSociais: { tipo: 'privacy' | 'twitter' | 'instagram' | 'onlyfans' | ''; url: string }[];
    descricao: string;
    imagens: File[];
    videos: File[];
    imagensUrls: string[]; // URLs dos arquivos no Bunny CDN
    videosUrls: string[]; // URLs dos arquivos no Bunny CDN
}

interface ProcessingFile {
    id: string;
    name: string;
    progress: number;
    type: 'image' | 'video';
}

interface MediaItem {
    id: string;
    type: 'image' | 'video';
    url: string;
    file: File;
    poster?: string;
}

// Função para gerar assinatura AWS v4
function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string) {
    const kDate = CryptoJS.HmacSHA256(dateStamp, "AWS4" + key);
    const kRegion = CryptoJS.HmacSHA256(regionName, kDate);
    const kService = CryptoJS.HmacSHA256(serviceName, kRegion);
    const kSigning = CryptoJS.HmacSHA256("aws4_request", kService);
    return kSigning;
}

export default function DashboardPage() {
    const [formData, setFormData] = useState<FormData>({
        nome: '',
        telefone: '',
        sexo: '',
        idade: '',
        altura: '',
        peso: '',
        localAtendimento: [],
        atende: [],
        formaPagamento: [],
        redesSociais: [],
        descricao: '',
        imagens: [],
        videos: [],
        imagensUrls: [],
        videosUrls: [],
    });

    const [activeTab, setActiveTab] = useState('editor');
    const [previewImagens, setPreviewImagens] = useState<string[]>([]);
    const [previewVideos, setPreviewVideos] = useState<string[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [redesSociaisExpanded, setRedesSociaisExpanded] = useState(false);
    const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [processingList, setProcessingList] = useState<{ id: string; name: string; progress: number }[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log(formData);
    };

    const processImage = async (file: File): Promise<File> => {
        const fileId = Math.random().toString(36).substring(7);

        try {
            // Atualizar progresso para 20% - Iniciando processamento
            setProcessingFiles(prev =>
                prev.map(f => f.id === fileId ? { ...f, progress: 20 } : f)
            );

            // Criar um elemento de imagem para processar
            const img = new Image();
            const imageUrl = URL.createObjectURL(file);
            img.src = imageUrl;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            // Atualizar progresso para 40% - Imagem carregada
            setProcessingFiles(prev =>
                prev.map(f => f.id === fileId ? { ...f, progress: 40 } : f)
            );

            // Criar canvas para adicionar marca d'água
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Não foi possível obter o contexto do canvas');
            }

            // Configurar tamanho do canvas
            canvas.width = img.width;
            canvas.height = img.height;

            // Desenhar imagem original
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Atualizar progresso para 60% - Imagem desenhada no canvas
            setProcessingFiles(prev =>
                prev.map(f => f.id === fileId ? { ...f, progress: 60 } : f)
            );

            // Configurar marca d'água
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '20px Arial';
            const watermarkText = 'Acompanhantes Top';
            const textMetrics = ctx.measureText(watermarkText);

            // Adicionar marca d'água em várias posições
            for (let y = 50; y < canvas.height; y += 150) {
                for (let x = 50; x < canvas.width; x += textMetrics.width + 100) {
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(-Math.PI / 6);
                    ctx.fillText(watermarkText, 0, 0);
                    ctx.restore();
                }
            }

            // Atualizar progresso para 80% - Marca d'água adicionada
            setProcessingFiles(prev =>
                prev.map(f => f.id === fileId ? { ...f, progress: 80 } : f)
            );

            // Converter canvas para blob
            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
            });

            // Criar novo arquivo com marca d'água
            const processedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
            });

            // Atualizar progresso para 100% - Processamento concluído
            setProcessingFiles(prev =>
                prev.map(f => f.id === fileId ? { ...f, progress: 100 } : f)
            );

            // Limpar recursos
            URL.revokeObjectURL(imageUrl);
            await new Promise(resolve => setTimeout(resolve, 1000));
            setProcessingFiles(prev => prev.filter(f => f.id !== fileId));

            return processedFile;
        } catch (error) {
            console.error('Erro ao processar imagem:', error);
            setProcessingFiles(prev => prev.filter(f => f.id !== fileId));
            return file;
        }
    };

    const processVideo = async (file: File): Promise<File> => {
        const fileId = Math.random().toString(36).substring(7);

        try {
            // Atualizar progresso para 20% - Iniciando processamento
            setProcessingFiles(prev =>
                prev.map(f => f.id === fileId ? { ...f, progress: 20 } : f)
            );

            // Criar elementos de vídeo e canvas
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Não foi possível obter o contexto do canvas');
            }

            // Configurar vídeo
            video.src = URL.createObjectURL(file);
            await new Promise((resolve) => {
                video.onloadedmetadata = resolve;
            });

            // Atualizar progresso para 40% - Vídeo carregado
            setProcessingFiles(prev =>
                prev.map(f => f.id === fileId ? { ...f, progress: 40 } : f)
            );

            // Configurar canvas com dimensões do vídeo
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Configurar gravação
            const stream = canvas.captureStream();
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            const chunks: Blob[] = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

            // Configurar marca d'água
            const watermarkText = 'Acompanhantes Top';
            ctx.font = '20px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';

            // Atualizar progresso para 60% - Configurações iniciais concluídas
            setProcessingFiles(prev =>
                prev.map(f => f.id === fileId ? { ...f, progress: 60 } : f)
            );

            // Iniciar gravação
            mediaRecorder.start(1000);
            video.play();

            let frameCount = 0;
            const totalFrames = video.duration * 30; // Estimativa de 30 fps

            const processFrame = () => {
                if (video.ended || video.paused) {
                    mediaRecorder.stop();
                    return;
                }

                // Desenhar frame atual
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Adicionar marca d'água
                for (let y = 50; y < canvas.height; y += 150) {
                    for (let x = 50; x < canvas.width; x += 200) {
                        ctx.save();
                        ctx.translate(x, y);
                        ctx.rotate(-Math.PI / 6);
                        ctx.fillText(watermarkText, 0, 0);
                        ctx.restore();
                    }
                }

                frameCount++;
                // Calcular progresso com base nos frames processados
                const progress = Math.min(60 + (frameCount / totalFrames) * 40, 99);
                setProcessingFiles(prev =>
                    prev.map(f => f.id === fileId ? { ...f, progress: Math.round(progress) } : f)
                );

                requestAnimationFrame(processFrame);
            };

            video.requestVideoFrameCallback(processFrame);

            // Aguardar processamento completo
            return new Promise((resolve) => {
                mediaRecorder.onstop = async () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    const processedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webm'), {
                        type: 'video/webm',
                        lastModified: Date.now()
                    });

                    // Atualizar progresso para 100% - Processamento concluído
                    setProcessingFiles(prev =>
                        prev.map(f => f.id === fileId ? { ...f, progress: 100 } : f)
                    );

                    // Limpar recursos
                    URL.revokeObjectURL(video.src);
                    setProcessingFiles(prev => prev.filter(f => f.id !== fileId));

                    resolve(processedFile);
                };
            });
        } catch (error) {
            console.error('Erro ao processar vídeo:', error);
            setProcessingFiles(prev => prev.filter(f => f.id !== fileId));
            return file;
        }
    };

    const uploadToBunnyCDN = async (file: File): Promise<string> => {
        const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
        const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;

        if (!libraryId || !accessKey) {
            throw new Error('Configurações do Bunny CDN não encontradas');
        }

        try {
            // Primeiro, criar o vídeo na biblioteca
            const createEndpoint = `https://video.bunnycdn.com/library/${libraryId}/videos`;
            const createResponse = await fetch(createEndpoint, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'AccessKey': accessKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: file.name,
                    collectionId: null,
                    length: 0,
                    status: 'uploading'
                })
            });

            if (!createResponse.ok) {
                throw new Error(`Erro ao criar vídeo: ${createResponse.statusText}`);
            }

            const createData = await createResponse.json();
            const videoId = createData.guid;

            // Agora, fazer o upload do arquivo
            const uploadEndpoint = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`;
            const uploadResponse = await fetch(uploadEndpoint, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/json',
                    'AccessKey': accessKey,
                    'Content-Type': file.type,
                },
                body: file
            });

            if (!uploadResponse.ok) {
                throw new Error(`Erro ao fazer upload do vídeo: ${uploadResponse.statusText}`);
            }

            // URL da thumbnail
            const thumbnailUrl = `https://vz-ddb4a7c6-db0.b-cdn.net/${videoId}/thumbnail.jpg`;
            return thumbnailUrl; // Retornar a URL da thumbnail
        } catch (error) {
            console.error('Erro ao fazer upload para Bunny CDN:', error);
            throw error;
        }
    };

    const uploadToCloudflare = async (file: File, fileType: 'image' | 'video'): Promise<string> => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileType', fileType);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao fazer upload');
            }

            const data = await response.json();
            return data.url;
        } catch (error) {
            console.error('Erro ao fazer upload para Cloudflare:', error);
            throw error;
        }
    };

    const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const maxFotos = Number(process.env.NEXT_PUBLIC_MAX_FOTOS) || 7;
        const maxVideos = Number(process.env.NEXT_PUBLIC_MAX_VIDEOS) || 3;
        const maxFotoSize = Number(process.env.NEXT_PUBLIC_MAX_FOTO_SIZE) || 10485760; // 10MB
        const maxVideoSize = Number(process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE) || 52428800; // 50MB

        // Separar arquivos por tipo
        const imagens = files.filter(file => file.type.startsWith('image/'));
        const videos = files.filter(file => file.type.startsWith('video/'));

        // Validar limites de quantidade
        if (imagens.length + mediaItems.filter(item => item.type === 'image').length > maxFotos) {
            alert(`Limite de ${maxFotos} fotos atingido`);
            return;
        }

        if (videos.length + mediaItems.filter(item => item.type === 'video').length > maxVideos) {
            alert(`Limite de ${maxVideos} vídeos atingido`);
            return;
        }

        // Validar tamanhos
        const imagensValidas = imagens.filter(file => {
            if (file.size > maxFotoSize) {
                alert(`A imagem ${file.name} excede o limite de ${maxFotoSize / 1024 / 1024}MB`);
                return false;
            }
            return true;
        });

        const videosValidos = videos.filter(file => {
            if (file.size > maxVideoSize) {
                alert(`O vídeo ${file.name} excede o limite de ${maxVideoSize / 1024 / 1024}MB`);
                return false;
            }
            return true;
        });

        // Adicionar arquivos à lista de processamento
        const newProcessingFiles = [...imagensValidas, ...videosValidos].map(file => ({
            id: Math.random().toString(36).substring(7),
            name: file.name,
            progress: 0
        }));

        setProcessingList(prev => [...prev, ...newProcessingFiles]);

        // Processar e fazer upload dos arquivos
        for (const file of [...imagensValidas, ...videosValidos]) {
            const fileId = newProcessingFiles.find(f => f.name === file.name)?.id;
            if (!fileId) continue;

            try {
                setProcessingList(prev => prev.map(item =>
                    item.id === fileId ? { ...item, progress: 20 } : item
                ));

                const processedFile = file.type.startsWith('image/')
                    ? await processImage(file)
                    : await processVideo(file);

                setProcessingList(prev => prev.map(item =>
                    item.id === fileId ? { ...item, progress: 60 } : item
                ));

                const cdnUrl = file.type.startsWith('image/')
                    ? await uploadToCloudflare(processedFile, 'image')
                    : await uploadToBunnyCDN(processedFile);

                setProcessingList(prev => prev.map(item =>
                    item.id === fileId ? { ...item, progress: 100 } : item
                ));

                setMediaItems(prev => [...prev, {
                    id: fileId,
                    type: file.type.startsWith('image/') ? 'image' : 'video',
                    url: cdnUrl,
                    file: processedFile
                }]);

                // Remover da lista de processamento após 1 segundo
                setTimeout(() => {
                    setProcessingList(prev => prev.filter(item => item.id !== fileId));
                }, 1000);

            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                setProcessingList(prev => prev.map(item =>
                    item.id === fileId ? { ...item, progress: -1 } : item
                ));
            }
        }
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const { source, destination } = result;

        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        setMediaItems((items) => {
            const newItems = arrayMove(items, source.index, destination.index);

            // Atualizar formData com a nova ordem
            const newImagens: File[] = [];
            const newVideos: File[] = [];
            const newImagensUrls: string[] = [];
            const newVideosUrls: string[] = [];

            newItems.forEach(item => {
                if (item.type === 'image') {
                    newImagens.push(item.file);
                    newImagensUrls.push(item.url);
                } else {
                    newVideos.push(item.file);
                    newVideosUrls.push(item.url);
                }
            });

            setFormData(prev => ({
                ...prev,
                imagens: newImagens,
                videos: newVideos,
                imagensUrls: newImagensUrls,
                videosUrls: newVideosUrls
            }));

            return newItems;
        });
    };

    const removeMedia = (id: string) => {
        const item = mediaItems.find(item => item.id === id);
        if (!item) return;

        // Revogar URL do objeto
        URL.revokeObjectURL(item.url);

        // Remover do estado
        setMediaItems(prev => prev.filter(item => item.id !== id));

        // Atualizar formData
        setFormData(prev => ({
            ...prev,
            imagens: prev.imagens.filter(file => file !== item.file),
            videos: prev.videos.filter(file => file !== item.file)
        }));
    };

    const onEmojiClick = (emojiObject: any) => {
        const textarea = document.getElementById('descricao') as HTMLTextAreaElement;
        const cursor = textarea?.selectionStart || 0;
        const text = formData.descricao;
        const newText = text.slice(0, cursor) + emojiObject.emoji + text.slice(cursor);
        setFormData({ ...formData, descricao: newText });
        setShowEmojiPicker(false);
    };

    const handleRedeSocialChange = (index: number, field: 'tipo' | 'url', value: string) => {
        const newRedesSociais = [...formData.redesSociais];
        newRedesSociais[index] = { ...newRedesSociais[index], [field]: value };
        setFormData({ ...formData, redesSociais: newRedesSociais });
    };

    const addRedeSocial = () => {
        setFormData(prev => ({
            ...prev,
            redesSociais: [...prev.redesSociais, { tipo: '', url: '' }]
        }));
        setRedesSociaisExpanded(true);
    };

    const removeRedeSocial = (index: number) => {
        setFormData(prev => ({
            ...prev,
            redesSociais: prev.redesSociais.filter((_, i) => i !== index)
        }));
    };

    const handleUploadClick = () => {
        document.getElementById('file-upload')?.click();
    };

    const handleProfileSave = (profileData: UserProfileData) => {
        setUserProfile(profileData);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

                {/* Formulário de cadastro */}
                <div className="mb-8">
                    <UserProfileForm onSave={handleProfileSave} />
                </div>

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
                    {processingList.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-medium mb-2">Processando arquivos...</h3>
                            <div className="space-y-2">
                                {processingList.map(item => (
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
                                {(provided: any) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2"
                                    >
                                        {mediaItems.map((item, index) => (
                                            <Draggable key={item.id} draggableId={item.id} index={index}>
                                                {(provided: any) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className="relative bg-gray-100 rounded-lg overflow-hidden group"
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
                                                                        src={item.url}
                                                                        poster={item.poster}
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            console.error('Erro ao carregar vídeo:', e);
                                                                            (e.target as HTMLVideoElement).poster = 'https://via.placeholder.com/150x150?text=Erro+ao+carregar';
                                                                        }}
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

                                        {/* Espaços reservados para arquivos em processamento */}
                                        {processingList.map((item) => (
                                            <div key={item.id} className="relative bg-gray-100 rounded-lg overflow-hidden">
                                                <div className="aspect-square w-full flex items-center justify-center">
                                                    {item.progress === -1 ? (
                                                        <div className="text-center p-4">
                                                            <p className="text-red-500 mb-2">Erro no processamento</p>
                                                            <button
                                                                onClick={() => setProcessingList(prev => prev.filter(i => i.id !== item.id))}
                                                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                                            >
                                                                Remover
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center">
                                                            <div className="w-16 h-16 mx-auto mb-2 relative">
                                                                <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
                                                                <div className="absolute inset-0 flex items-center justify-center text-blue-500 text-sm">
                                                                    {item.progress}%
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-gray-600 truncate max-w-full px-2">
                                                                {item.name}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
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

// Componente para item arrastável
function SortableMediaItem({
    item,
    index,
    onRemove
}: {
    item: MediaItem;
    index: number;
    onRemove: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });
    let retryCount = 0;
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    console.log(item)

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative group bg-surface-100 rounded-lg overflow-hidden"
        >
            <div className="absolute top-2 left-2 z-20 bg-black/70 text-white px-2 py-1 rounded text-sm">
                {index + 1}
            </div>

            {/* Container principal da mídia */}
            <div className="relative w-full h-48">

                {item.type === 'image' ? (
                    <img
                        src={item.url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            console.error('Erro ao carregar imagem:', e);
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Erro+ao+carregar+imagem';
                        }}
                    />
                ) : (
                    <div className="w-full h-full">
                        <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            preload="metadata"
                            poster={item.poster}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
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

            {/* Barra inferior com informações e controles */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div {...attributes} {...listeners} className="cursor-move">
                        <AiOutlineDrag className="text-white text-lg" />
                    </div>
                    <span className="text-sm">
                        {item.type === 'image' ? 'Imagem' : 'Vídeo'}
                    </span>
                </div>
                <button
                    onClick={() => onRemove(item.id)}
                    className="text-white hover:text-red-500 text-lg"
                >
                    ×
                </button>
            </div>
        </div>
    );
} 