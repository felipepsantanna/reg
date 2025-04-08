'use client';

import { useState } from 'react';
import { AiOutlineInfoCircle, AiOutlineSmile, AiOutlineLoading3Quarters, AiOutlineDrag } from 'react-icons/ai';
import EmojiPicker from 'emoji-picker-react';
import imageCompression from 'browser-image-compression';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { StrictModeDroppable } from './StrictModeDroppable';

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
    });

    const [activeTab, setActiveTab] = useState('editor');
    const [previewImagens, setPreviewImagens] = useState<string[]>([]);
    const [previewVideos, setPreviewVideos] = useState<string[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [redesSociaisExpanded, setRedesSociaisExpanded] = useState(false);
    const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log(formData);
    };

    const processImage = async (file: File): Promise<File> => {
        const fileId = Math.random().toString(36).substring(7);

        try {
            // Opções de compressão
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                onProgress: (progress: number) => {
                    setProcessingFiles(prev =>
                        prev.map(f => f.id === fileId ? { ...f, progress } : f)
                    );
                }
            };

            // Comprimir a imagem
            const compressedFile = await imageCompression(file, options);
            const compressedUrl = URL.createObjectURL(compressedFile);

            // Criar um canvas para adicionar a watermark
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            return new Promise((resolve) => {
                img.onload = () => {
                    // Configurar o tamanho do canvas
                    canvas.width = img.width;
                    canvas.height = img.height;

                    // Desenhar a imagem
                    ctx?.drawImage(img, 0, 0);

                    // Adicionar watermark no centro
                    if (ctx) {
                        const watermark = 'watermark';
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.font = '20px Arial';

                        // Calcular posição central
                        const metrics = ctx.measureText(watermark);
                        const x = (canvas.width - metrics.width) / 2;
                        const y = canvas.height / 2;

                        ctx.fillText(watermark, x, y);
                    }

                    // Converter o canvas de volta para um arquivo
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const processedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            // Limpar recursos
                            URL.revokeObjectURL(compressedUrl);
                            setProcessingFiles(prev => prev.filter(f => f.id !== fileId));
                            resolve(processedFile);
                        }
                    }, 'image/jpeg', 0.8);
                };
                img.src = compressedUrl;
            });
        } catch (error) {
            console.error('Erro ao processar imagem:', error);
            setProcessingFiles(prev => prev.filter(f => f.id !== fileId));
            return file;
        }
    };

    const processVideo = async (file: File): Promise<File> => {
        const fileId = Math.random().toString(36).substring(7);

        try {
            // Criar um elemento de vídeo
            const video = document.createElement('video');
            const videoUrl = URL.createObjectURL(file);
            video.src = videoUrl;

            return new Promise((resolve) => {
                let isProcessing = true;
                let processingTimeout: NodeJS.Timeout;

                const cleanup = () => {
                    if (processingTimeout) clearTimeout(processingTimeout);
                    URL.revokeObjectURL(videoUrl);
                    setProcessingFiles(prev => prev.filter(f => f.id !== fileId));
                };

                // Quando o vídeo estiver pronto
                video.onloadedmetadata = () => {
                    // Criar um canvas para processar os frames
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        console.error('Não foi possível obter o contexto do canvas');
                        cleanup();
                        resolve(file);
                        return;
                    }

                    // Configurar tamanho do canvas
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    // Criar um MediaRecorder para gravar o vídeo processado
                    const stream = canvas.captureStream();
                    const mediaRecorder = new MediaRecorder(stream, {
                        mimeType: 'video/webm;codecs=vp9'
                    });

                    const chunks: Blob[] = [];
                    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

                    // Função para processar um frame
                    const processFrame = () => {
                        if (!isProcessing) return;

                        // Desenhar o frame atual no canvas
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                        // Adicionar watermark
                        const watermark = 'watermark';
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.font = 'bold 24px Arial';

                        // Calcular posição central
                        const metrics = ctx.measureText(watermark);
                        const x = (canvas.width - metrics.width) / 2;
                        const y = canvas.height / 2;

                        // Adicionar sombra para melhor visibilidade
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                        ctx.shadowBlur = 4;
                        ctx.shadowOffsetX = 2;
                        ctx.shadowOffsetY = 2;

                        // Desenhar o texto
                        ctx.fillText(watermark, x, y);

                        // Resetar sombra
                        ctx.shadowColor = 'transparent';
                        ctx.shadowBlur = 0;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;

                        // Atualizar progresso
                        const progress = Math.min((video.currentTime / video.duration) * 100, 99);
                        setProcessingFiles(prev =>
                            prev.map(f => f.id === fileId ? { ...f, progress } : f)
                        );

                        // Continuar processando se o vídeo não terminou
                        if (!video.ended) {
                            requestAnimationFrame(processFrame);
                        } else {
                            isProcessing = false;
                            mediaRecorder.stop();
                        }
                    };

                    // Quando o MediaRecorder parar
                    mediaRecorder.onstop = () => {
                        if (chunks.length > 0) {
                            const blob = new Blob(chunks, { type: 'video/webm' });
                            const processedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webm'), {
                                type: 'video/webm',
                                lastModified: Date.now()
                            });

                            // Atualizar progresso para 100%
                            setProcessingFiles(prev =>
                                prev.map(f => f.id === fileId ? { ...f, progress: 100 } : f)
                            );

                            // Pequeno delay para mostrar 100% antes de limpar
                            setTimeout(() => {
                                cleanup();
                                resolve(processedFile);
                            }, 1000);
                        } else {
                            console.warn('Falha ao processar vídeo, retornando arquivo original');
                            cleanup();
                            resolve(file);
                        }
                    };

                    // Iniciar processamento
                    try {
                        mediaRecorder.start(1000); // Capturar frames a cada 1 segundo
                        video.play().catch(e => {
                            console.error('Erro ao reproduzir vídeo:', e);
                            cleanup();
                            resolve(file);
                        });
                        processFrame();
                    } catch (e) {
                        console.error('Erro ao iniciar processamento:', e);
                        cleanup();
                        resolve(file);
                    }
                };

                // Tratamento de erros
                video.onerror = (error) => {
                    console.error('Erro ao carregar vídeo:', error);
                    isProcessing = false;
                    cleanup();
                    resolve(file);
                };

                // Timeout para evitar travamentos
                processingTimeout = setTimeout(() => {
                    if (isProcessing) {
                        console.error('Timeout ao processar vídeo');
                        isProcessing = false;
                        cleanup();
                        resolve(file);
                    }
                }, 60000); // 60 segundos de timeout
            });
        } catch (error) {
            console.error('Erro ao processar vídeo:', error);
            setProcessingFiles(prev => prev.filter(f => f.id !== fileId));
            return file;
        }
    };

    const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const maxFotos = Number(process.env.NEXT_PUBLIC_MAX_FOTOS) || 7;
        const maxVideos = Number(process.env.NEXT_PUBLIC_MAX_VIDEOS) || 3;
        const maxFotoSize = Number(process.env.NEXT_PUBLIC_MAX_FOTO_SIZE) || 10485760;
        const maxVideoSize = Number(process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE) || 52428800;

        // Separar arquivos por tipo
        const imagens = files.filter(file => file.type.startsWith('image/'));
        const videos = files.filter(file => file.type.startsWith('video/'));

        // Validar e limitar imagens
        const validImagens = imagens
            .filter(file => file.size <= maxFotoSize)
            .slice(0, maxFotos);

        if (validImagens.length < imagens.length) {
            alert(`Algumas imagens foram ignoradas por excederem o tamanho máximo de ${maxFotoSize / 1024 / 1024}MB`);
        }

        // Validar e limitar vídeos
        const validVideos = videos
            .filter(file => file.size <= maxVideoSize)
            .slice(0, maxVideos);

        if (validVideos.length < videos.length) {
            alert(`Alguns vídeos foram ignorados por excederem o tamanho máximo de ${maxVideoSize / 1024 / 1024}MB`);
        }

        try {
            // Criar IDs únicos para cada arquivo
            const imageIds = validImagens.map(() => Math.random().toString(36).substring(7));
            const videoIds = validVideos.map(() => Math.random().toString(36).substring(7));

            // Criar lista inicial de processamento
            const initialProcessingFiles = [
                ...validImagens.map((file, index) => ({
                    id: imageIds[index],
                    name: file.name,
                    progress: 0,
                    type: 'image' as const
                })),
                ...validVideos.map((file, index) => ({
                    id: videoIds[index],
                    name: file.name,
                    progress: 0,
                    type: 'video' as const
                }))
            ];

            // Atualizar estado de processamento
            setProcessingFiles(initialProcessingFiles);

            // Processar arquivos em paralelo
            const processedImagens = await Promise.all(
                validImagens.map((file, index) =>
                    processImage(file).finally(() => {
                        setProcessingFiles(prev => prev.filter(f => f.id !== imageIds[index]));
                    })
                )
            );

            const processedVideos = await Promise.all(
                validVideos.map((file, index) =>
                    processVideo(file).finally(() => {
                        setProcessingFiles(prev => prev.filter(f => f.id !== videoIds[index]));
                    })
                )
            );

            // Criar novos itens de mídia
            const newMediaItems: MediaItem[] = [
                ...processedImagens.map((file, index) => ({
                    id: `img-${Date.now()}-${index}`,
                    type: 'image' as const,
                    url: URL.createObjectURL(file),
                    file
                })),
                ...processedVideos.map((file, index) => ({
                    id: `video-${Date.now()}-${index}`,
                    type: 'video' as const,
                    url: URL.createObjectURL(file),
                    file
                }))
            ];

            // Atualizar estado
            setMediaItems(prev => [...prev, ...newMediaItems]);
            setFormData(prev => ({
                ...prev,
                imagens: [...prev.imagens, ...processedImagens],
                videos: [...prev.videos, ...processedVideos]
            }));
        } catch (error) {
            console.error('Erro ao processar arquivos:', error);
            alert('Ocorreu um erro ao processar os arquivos. Por favor, tente novamente.');
        }
    };

    const handleDragEnd = (result: any) => {
        if (!result.destination) return;

        const items = Array.from(mediaItems);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setMediaItems(items);

        // Atualizar formData com a nova ordem
        const newImagens: File[] = [];
        const newVideos: File[] = [];

        items.forEach(item => {
            if (item.type === 'image') {
                newImagens.push(item.file);
            } else {
                newVideos.push(item.file);
            }
        });

        setFormData(prev => ({
            ...prev,
            imagens: newImagens,
            videos: newVideos
        }));
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

    return (
        <div className="form-container">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-surface-700">Formulário de Cadastro</h1>
                <button className="form-button form-button-secondary">
                    Carregar Dados Exemplo
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="form-section">
                    <h2 className="form-section-title">Informações Pessoais</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="nome" className="form-label">
                                Nome *
                            </label>
                            <input
                                id="nome"
                                type="text"
                                required
                                placeholder="Digite seu nome completo"
                                value={formData.nome}
                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="telefone" className="form-label">
                                Telefone *
                            </label>
                            <input
                                id="telefone"
                                type="tel"
                                required
                                placeholder="(00) 00000-0000"
                                value={formData.telefone}
                                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="sexo" className="form-label">
                                Sexo *
                            </label>
                            <select
                                id="sexo"
                                required
                                value={formData.sexo}
                                onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                                className="form-select"
                            >
                                <option value="">Selecione seu sexo</option>
                                <option value="mulher">Mulher</option>
                                <option value="homem">Homem</option>
                                <option value="travesti">Travesti</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="idade" className="form-label">
                                Idade *
                            </label>
                            <input
                                id="idade"
                                type="number"
                                required
                                placeholder="Sua idade"
                                value={formData.idade}
                                onChange={(e) => setFormData({ ...formData, idade: e.target.value })}
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="altura" className="form-label">
                                Altura (cm) *
                            </label>
                            <input
                                id="altura"
                                type="number"
                                required
                                placeholder="Sua altura em cm"
                                value={formData.altura}
                                onChange={(e) => setFormData({ ...formData, altura: e.target.value })}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="peso" className="form-label">
                                Peso (kg) *
                            </label>
                            <input
                                id="peso"
                                type="number"
                                required
                                placeholder="Seu peso em kg"
                                value={formData.peso}
                                onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                                className="form-input"
                            />
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="form-section-title">Informações de Atendimento</h2>

                    <div className="form-group">
                        <label className="form-label">
                            Local de Atendimento * <AiOutlineInfoCircle size={16} />
                        </label>
                        <select
                            multiple
                            value={formData.localAtendimento}
                            onChange={(e) => {
                                const values = Array.from(e.target.selectedOptions, option => option.value);
                                setFormData({ ...formData, localAtendimento: values });
                            }}
                            className="form-select form-multiselect"
                        >
                            <option value="aceita-viajar">Aceita viajar</option>
                            <option value="domicilio">Domicílio</option>
                            <option value="hoteis">Hotéis</option>
                            <option value="local-proprio">Local próprio</option>
                            <option value="moteis">Motéis</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Atende * <AiOutlineInfoCircle size={16} />
                        </label>
                        <select
                            multiple
                            value={formData.atende}
                            onChange={(e) => {
                                const values = Array.from(e.target.selectedOptions, option => option.value);
                                setFormData({ ...formData, atende: values });
                            }}
                            className="form-select form-multiselect"
                        >
                            <option value="homem">Homem</option>
                            <option value="mulheres">Mulheres</option>
                            <option value="casais">Casais</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Forma de Pagamento * <AiOutlineInfoCircle size={16} />
                        </label>
                        <select
                            multiple
                            value={formData.formaPagamento}
                            onChange={(e) => {
                                const values = Array.from(e.target.selectedOptions, option => option.value);
                                setFormData({ ...formData, formaPagamento: values });
                            }}
                            className="form-select form-multiselect"
                        >
                            <option value="credito">Cartão de crédito</option>
                            <option value="debito">Cartão de débito</option>
                            <option value="dinheiro">Dinheiro</option>
                        </select>
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="form-section-title">Descrição *</h2>
                    <div className="flex space-x-4 mb-4 border-b border-surface-200">
                        <button
                            type="button"
                            className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'editor'
                                ? 'text-surface-700 border-b-2 border-primary-500'
                                : 'text-surface-500 hover:text-surface-700'
                                }`}
                            onClick={() => setActiveTab('editor')}
                        >
                            Editor
                        </button>
                        <button
                            type="button"
                            className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'visualizacao'
                                ? 'text-surface-700 border-b-2 border-primary-500'
                                : 'text-surface-500 hover:text-surface-700'
                                }`}
                            onClick={() => setActiveTab('visualizacao')}
                        >
                            Visualização
                        </button>
                    </div>

                    <div className="form-group">
                        <textarea
                            id="descricao"
                            required
                            value={formData.descricao}
                            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                            className="form-input min-h-[200px] resize-y"
                            placeholder="Descreva seus serviços, experiência, etc..."
                        />
                        <div className="relative">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="form-button-secondary p-2"
                                >
                                    <AiOutlineSmile size={20} />
                                </button>
                                <span className="text-sm text-surface-500">
                                    Você pode usar tags HTML básicas como <b>&lt;b&gt;</b>, <b>&lt;i&gt;</b>, <b>&lt;u&gt;</b>, <b>&lt;p&gt;</b>, <b>&lt;br&gt;</b>, <b>&lt;ul&gt;</b>, <b>&lt;li&gt;</b>, etc. e emojis
                                </span>
                            </div>
                            {showEmojiPicker && (
                                <div className="absolute bottom-full right-0 z-10">
                                    <EmojiPicker onEmojiClick={onEmojiClick} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="form-section-title">Redes Sociais</h2>
                    {formData.redesSociais.length === 0 && !redesSociaisExpanded ? (
                        <div className="text-surface-500 italic mb-4">
                            Nenhuma rede social adicionada. Clique em "Adicionar" para incluir suas redes sociais.
                        </div>
                    ) : (
                        formData.redesSociais.map((rede, index) => (
                            <div key={index} className="flex items-center gap-4 p-3 bg-surface-100 rounded-lg mb-3">
                                <select
                                    value={rede.tipo}
                                    onChange={(e) => handleRedeSocialChange(index, 'tipo', e.target.value)}
                                    className="form-select w-[200px]"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="privacy">Privacy</option>
                                    <option value="twitter">Twitter</option>
                                    <option value="instagram">Instagram</option>
                                    <option value="onlyfans">OnlyFans</option>
                                </select>
                                <input
                                    type="url"
                                    placeholder="URL do perfil"
                                    value={rede.url}
                                    onChange={(e) => handleRedeSocialChange(index, 'url', e.target.value)}
                                    className="form-input flex-1"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeRedeSocial(index)}
                                    className="form-button-destructive p-2"
                                >
                                    Remover
                                </button>
                            </div>
                        ))
                    )}
                    <button
                        type="button"
                        onClick={addRedeSocial}
                        className="form-button-secondary mt-4"
                    >
                        + Adicionar Rede Social
                    </button>
                </div>

                <div className="form-section">
                    <div className="bg-surface-100 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold mb-2 text-surface-700">Limites de upload:</h3>
                        <ul className="space-y-1 text-sm text-surface-500">
                            <li>• Máximo de {process.env.NEXT_PUBLIC_MAX_FOTOS || 7} fotos (até {(Number(process.env.NEXT_PUBLIC_MAX_FOTO_SIZE) / 1024 / 1024) || 10}MB cada)</li>
                            <li>• Máximo de {process.env.NEXT_PUBLIC_MAX_VIDEOS || 3} vídeos (até {(Number(process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE) / 1024 / 1024) || 50}MB cada)</li>
                            <li>• Formatos aceitos: JPG, PNG, GIF, WEBP, MP4, WEBM, MOV</li>
                            <li>• As imagens serão comprimidas e receberão marca d'água automaticamente</li>
                            <li>• Todos os arquivos serão enviados para CDN antes de salvar o cadastro</li>
                        </ul>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Arquivos (Imagens e Vídeos) *
                        </label>
                        <div className="upload-box" onClick={handleUploadClick}>
                            <div>Clique para selecionar ou arraste arquivos aqui</div>
                            <div className="text-sm text-surface-500 mt-2">
                                Imagens (JPG, PNG, GIF, WEBP) • Máximo 7 fotos • Até 10 MB
                            </div>
                            <div className="text-sm text-surface-500">
                                Vídeos (MP4, WEBM, MOV) • Máximo 3 vídeos • Até 50 MB
                            </div>
                            <input
                                id="file-upload"
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                onChange={handleMediaChange}
                                className="hidden"
                            />
                        </div>
                        <div className="flex justify-end gap-6 text-sm text-surface-500 mt-2">
                            <span>Fotos: {formData.imagens.length}/7</span>
                            <span>Vídeos: {formData.videos.length}/3</span>
                        </div>
                    </div>

                    {processingFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {processingFiles.map(file => (
                                <div key={file.id} className="flex items-center gap-2">
                                    <AiOutlineLoading3Quarters className="animate-spin text-primary-500" />
                                    <span className="text-sm text-surface-600">
                                        Processando {file.type === 'image' ? 'imagem' : 'vídeo'}: {file.name}
                                    </span>
                                    <span className="text-sm text-surface-500">
                                        {Math.round(file.progress)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {(mediaItems.length > 0) && (
                        <div className="mt-4">
                            <DragDropContext onDragEnd={handleDragEnd}>
                                <StrictModeDroppable droppableId="media-grid" direction="horizontal">
                                    {(provided) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                                        >
                                            {mediaItems.map((item, index) => (
                                                <Draggable
                                                    key={item.id}
                                                    draggableId={item.id}
                                                    index={index}
                                                >
                                                    {(provided) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            className="relative group cursor-move"
                                                        >
                                                            <div
                                                                {...provided.dragHandleProps}
                                                                className="absolute inset-0 z-10 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                                                            >
                                                                <div className="absolute top-2 left-2">
                                                                    <AiOutlineDrag className="text-white" />
                                                                </div>
                                                                <div className="absolute top-2 right-2">
                                                                    <button
                                                                        onClick={() => removeMedia(item.id)}
                                                                        className="text-white text-sm hover:text-red-500"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {item.type === 'image' ? (
                                                                <img
                                                                    src={item.url}
                                                                    alt={`Preview ${index + 1}`}
                                                                    className="w-full h-48 object-cover rounded-lg"
                                                                />
                                                            ) : (
                                                                <video
                                                                    src={item.url}
                                                                    className="w-full h-48 object-cover rounded-lg"
                                                                    preload="metadata"
                                                                    poster={item.url}
                                                                />
                                                            )}
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
                    )}
                </div>

                <button type="submit" className="form-button form-button-primary w-full">
                    Enviar Cadastro
                </button>
            </form>
        </div>
    );
} 