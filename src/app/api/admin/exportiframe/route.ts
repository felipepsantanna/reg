import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail: string;
  position: number;
  poster?: string;
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

    console.log(`${process.env.URL_BASE}/api/profiles/${userId}`);
    const fetchProfile = await fetch(`${process.env.URL_BASE}/api/profiles/${userId}`);
    if (!fetchProfile.ok) {
      throw new Error('Erro ao buscar perfil');
    }
    const profile = await fetchProfile.json();

    const fetchMedia = await fetch(`${process.env.URL_BASE}/api/profiles/${userId}/media`);
    if (!fetchMedia.ok) {
      throw new Error('Erro ao buscar mídias');
    }
    const medias = await fetchMedia.json();


    /*Header*/
    let content = `<style type="text/css">
.px-item-extrahtml {
    text-align: initial;
}
</style>`;


    /*Galeria*/
    if (medias.data.length > 0) {
      content += medias.data
        .filter((item: MediaItem) => item.type === 'image')
        .map((item: MediaItem) => {
          return `<div class="px-item-imglista">
              <figure class="px-img-dupla">
                    <a href="${item.url}" title="Acompanhantes em Brasília">
                        <img
                                      loading="lazy"
                                      src="${item.url}"
                                      alt="${profile.nome}"
                                      itemprop="image" />
                    </a>
              </figure>
          </div>`;
        }).join('');

      //////////////////////////////////////////////////////////////////
      ////////////     CRIANDO O IFRAMES COM OS VÍDEOS       ///////////
      //////////////////////////////////////////////////////////////////

      const temVideo = medias.data.some((midia: MediaItem) => midia.type === 'video');
      let videos = '';

      if (temVideo) {
        videos = '<h5 class="fw-semibold">Galeria de vídeos</h5>'
        videos += medias.data.map((item: MediaItem) => {
          if (item.type === 'video') {
            return `<div class="px-item-extrahtml">
          <div style="position:relative;padding-top:100%;">
                    <iframe src="https://iframe.mediadelivery.net/embed/299184/${item.url}?autoplay=true&amp;loop=false&amp;muted=false&amp;preload=false&amp;responsive=true" 
                      loading="lazy" style="border:0;position:absolute;top:0;height:100%;width:100%;" 
                      allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;" 
                      allowfullscreen="true">
                    </iframe>
                </div>
                </div><br />`
          } else { return '' }
        }).join('');
      }
      content += videos;

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


