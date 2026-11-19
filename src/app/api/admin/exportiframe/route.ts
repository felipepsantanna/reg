import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import sharp from 'sharp';
import pool from '@/lib/db';
import { getUserProfile } from '@/lib/db-operations';
import { RowDataPacket } from 'mysql2';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

interface MediaItem extends RowDataPacket {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail: string;
  position: number;
  poster?: string;
}

/**
 * Executa tarefas assíncronas com limite de concorrência para reutilizar conexões
 * keep-alive e evitar saturar handshakes TLS simultâneos (ConnectTimeoutError).
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = currentIndex++;
      if (index >= items.length) break;
      results[index] = await fn(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Fetch com timeout curto e retry automático para evitar travamentos de 10s do undici.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 2,
  timeoutMs = 3500
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs),
      });
      return res;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function POST(request: Request) {

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token');

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token.value, new TextEncoder().encode(JWT_SECRET));

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const { userId } = await request.json();

    // Busca perfil e mídias diretamente no banco em paralelo (evita 2.5s de overhead HTTP local)
    const [profile, [mediaRows]] = await Promise.all([
      getUserProfile(Number(userId)),
      pool.execute<MediaItem[]>(
        `SELECT * FROM media
         WHERE user_id = ? AND deleted_at IS NULL
         ORDER BY type, position ASC`,
        [userId]
      ),
    ]);

    if (!profile) {
      throw new Error('Erro ao buscar perfil');
    }

    /*Header*/
    let content = '';

    if (profile.classe_especial === 'sim') {
      content += `<script>
  document.querySelector('.px-item-jobTitle').innerHTML = " ";
</script>
`;
    }

    /*Galeria*/
    if (mediaRows.length > 0) {
      const imageItems = mediaRows.filter((item: MediaItem) => item.type === 'image');
      const videoItems = mediaRows.filter((midia: MediaItem) => midia.type === 'video');

      const libraryId = process.env.BUNNY_LIBRARY_ID || process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || '299184';
      const accessKey = process.env.BUNNY_ACCESS_KEY || process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;

      // Processa dimensões de fotos e vídeos simultaneamente com concorrência controlada
      const [imagesHtmlArray, videosWithOrientation] = await Promise.all([
        mapWithConcurrency(imageItems, 6, async (item: MediaItem) => {
          let isVertical = false;
          try {
            const imgRes = await fetchWithRetry(item.url);
            if (imgRes.ok) {
              const buffer = Buffer.from(await imgRes.arrayBuffer());
              const metadata = await sharp(buffer).metadata();
              isVertical = (metadata.height ?? 0) > (metadata.width ?? 0);
            }
          } catch (err) {
            console.error(`Erro ao verificar dimensões da imagem ${item.url}:`, err);
          }

          const figureOpenTag = isVertical ? '<figure class="px-img-dupla">' : '<figure>';

          return `
              ${figureOpenTag}
                    <a href="${item.url}" title="Acompanhantes em Brasília">
                        <img
                                      loading="lazy"
                                      src="${item.url}"
                                      alt="${profile.nome}"
                                      itemprop="image" />
                    </a>
              </figure>`;
        }),

        mapWithConcurrency(videoItems, 6, async (item: MediaItem) => {
          let isVertical = false;
          let resolvedOrientation = false;

          try {
            if (libraryId && accessKey) {
              const videoRes = await fetchWithRetry(
                `https://video.bunnycdn.com/library/${libraryId}/videos/${item.url}`,
                { headers: { AccessKey: accessKey, Accept: 'application/json' } }
              );
              if (videoRes.ok) {
                const videoMeta = await videoRes.json();
                if (videoMeta.width && videoMeta.height) {
                  isVertical = videoMeta.height > videoMeta.width;
                  resolvedOrientation = true;
                }
              }
            }

            if (!resolvedOrientation && item.thumbnail) {
              const thumbUrl = item.thumbnail.startsWith('http')
                ? item.thumbnail
                : `https://vz-ddb4a7c6-db0.b-cdn.net/${item.url}/thumbnail.jpg`;
              const thumbRes = await fetchWithRetry(thumbUrl);
              if (thumbRes.ok) {
                const buffer = Buffer.from(await thumbRes.arrayBuffer());
                const metadata = await sharp(buffer).metadata();
                isVertical = (metadata.height ?? 0) > (metadata.width ?? 0);
              }
            }
          } catch (err) {
            console.error(`Erro ao verificar dimensões do vídeo ${item.url}:`, err);
          }

          return { item, isVertical };
        }),
      ]);

      const imagesHtml = imagesHtmlArray.join('');

      if (imagesHtml) {
        content += `<div class="px-item-imglista">${imagesHtml}
          </div>`;
      }

      //////////////////////////////////////////////////////////////////
      ////////////     CRIANDO O IFRAMES COM OS VÍDEOS       ///////////
      //////////////////////////////////////////////////////////////////

      if (videosWithOrientation.length > 0) {
        let verticalCountInCurrentRow = 0;
        const videosHtmlArray = videosWithOrientation.map((current, index) => {
          if (!current.isVertical) {
            verticalCountInCurrentRow = 0;
            return `
  <div>
    <div style="position:relative;padding-top:56.25%;">
      <iframe src="https://iframe.mediadelivery.net/embed/299184/${current.item.url}?autoplay=true&amp;loop=false&amp;muted=false&amp;preload=false&amp;responsive=true"
        loading="lazy" style="border:0;position:absolute;top:0;height:100%;width:100%;"
        allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
        allowfullscreen="true"></iframe>
    </div>
  </div>`;
          }

          const next = videosWithOrientation[index + 1];
          let wrapperClass = 'px-video-duplo';

          if (verticalCountInCurrentRow === 1) {
            verticalCountInCurrentRow = 0;
            wrapperClass = 'px-video-duplo';
          } else {
            if (next && next.isVertical) {
              verticalCountInCurrentRow = 1;
              wrapperClass = 'px-video-duplo';
            } else {
              verticalCountInCurrentRow = 0;
              wrapperClass = 'px-video-duplo--desativado';
            }
          }

          return `
  <div class="${wrapperClass}">
    <div style="position:relative;padding-top:177.78%;">
      <iframe src="https://iframe.mediadelivery.net/embed/299184/${current.item.url}?autoplay=true&amp;loop=false&amp;muted=false&amp;preload=false&amp;responsive=true"
        loading="lazy" style="border:0;position:absolute;top:0;height:100%;width:100%;"
        allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
        allowfullscreen="true"></iframe>
    </div>
  </div>`;
        });

        content += `<h5 class="fw-semibold">Galeria de vídeos</h5>\n<div class="px-item-videolista">${videosHtmlArray.join('')}
</div>`;
      }

    }

    return NextResponse.json({ success: true, text: content });
  }
  catch (error) {
    console.error('Erro ao exportar o iframe:', error);
    return NextResponse.json(
      { error: 'Erro ao exportar o iframe' },
      { status: 500 }
    );
  }
}
