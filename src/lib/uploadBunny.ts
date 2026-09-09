export interface MediaApiResponse {
    thumbnail: string;
    url: string;
}

export async function uploadToBunnyCDN(file: File, _contentType?: string): Promise<MediaApiResponse> {

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
                'Content-Type': 'application/octet-stream'
            },
            body: file
        });

        if (!uploadResponse.ok) {
            throw new Error(`Erro ao fazer upload do vídeo: ${uploadResponse.statusText}`);
        }
        const response = {
            thumbnail: `https://vz-ddb4a7c6-db0.b-cdn.net/${videoId}/thumbnail.jpg`,
            url: `${videoId}`
        };

        return response;
    } catch (error) {
        console.error('Erro ao fazer upload para Bunny CDN:', error);
        throw error;
    }
};