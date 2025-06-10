import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { stringToSlug } from '@/lib/string-operations';

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
    const token = cookies().get('admin_token');

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token.value, new TextEncoder().encode(JWT_SECRET));

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const { userId } = await request.json();


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
    let content = ` <div class="section-border">
          <h1 class="fw-bold">${profile.nome}</h1>
          <small class="fst-italic text-warning opacity-75">Última atualização: ${format(new Date(profile.updated_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</small>
        </div>`;


    /*Informações Básicas + Contato*/
    content += `<div class="row section-border">
          <div class="col-md-6">
            <h5 class="fw-semibold">Informações Básicas</h5>
            <ul class="list-unstyled small">
              <li><strong>Idade:</strong> ${profile.idade} anos</li>
              <li><strong>Altura:</strong> ${profile.altura}cm</li>
              <li><strong>Peso:</strong> ${profile.peso}kg</li>
              <li><strong>Sexo:</strong> ${profile.sexo}</li>`;

    if (profile.tamanhoDote) {
      content += `<li><strong>Tamanho do Dote:</strong> ${profile.tamanhoDote}</li>`;
    }

    content += `</ul>
          </div>
          <div class="col-md-6">
            <h5 class="fw-semibold">Contato</h5>
            <p class="small"><strong>Telefone:</strong>${profile.telefone}</p>
          </div>
        </div>`;

    /*Locais e Serviços */
    content += ` <div class="section-border">
              <h5 class="fw-semibold">Locais e Serviços</h5>
              <ul class="list-unstyled small">`;

    if (profile.localAtendimento) {
      content += `<li><strong>Locais de Atendimento:</strong> ${profile.localAtendimento}</li>`;
    }
    if (profile.atende) {
      content += `<li><strong>Atende:</strong> ${profile.atende.replace("[\"", '').replace("\"]", '')}</li>`;
    }

    if (profile.formaPagamento) {
      content += `<li><strong>Formas de Pagamento:</strong> ${profile.formaPagamento}</li>`;
    }

    content += `</ul>
            </div>`;

    /* Descrição */
    if (profile.descricao) {
      content += `<div class="section-border">
                     <h5 class="fw-semibold">Descrição</h5>
                        <p class= "text-gray-600 whitespace-pre-line" > ${profile.descricao} </p>
                            </div>`;
    }



    /*Galeria*/
    if (medias.data.length > 0) {
      content += `<br />`;
      content += medias.data.map((item: MediaItem) => {
        let i = `<figure class="px-img-dupla">
              <a href="${item.url}" title="Acompanhantes em Brasília">`
        if (item.type === 'image') {
          i += `<img
                            loading="lazy"
                            src="${item.url}"
                            alt="${profile.nome}"
                            alt=""
                            itemprop="image" />`
        }
        i += `</a>
    </figure>`;
        return i;
      }).join('');

      //////////////////////////////////////////////////////////////////
      ////////////     CRIANDO O IFRAMES COM OS VÍDEOS       ///////////
      //////////////////////////////////////////////////////////////////

      let videos = '';
      videos += medias.data.map((item: MediaItem) => {
        let i = `<figure class="px-img-dupla">`
        if (item.type === 'video') {
          i += `<iframe
                            src="https://iframe.mediadelivery.net/embed/299184/${item.url}?autoplay=true&loop=false&muted=false&preload=false&responsive=true"
                            allow = "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                            allowFullScreen ="true"
                            class = "absolute top-0 left-0 w-full h-full rounded-lg">
                        </iframe>`
        }
        i += `</figure>`;
        return i;
      }).join('');
      content += videos;
      /*
  
        const iframe = `<!DOCTYPE html>
      <html lang="pt-br">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Anunciante 01</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          body {
            color: #FFCC00!important;
            background-color: transparent !important;
          }
          .section-border {
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 1rem;
            margin-bottom: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="container py-4">${videos}</div>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>`;
  
        const path = `${await stringToSlug(profile.sexo)}/${await stringToSlug(profile.nome)}/videos.html`;
        var iframeUrl = await uploadToBunnyStorage(iframe, path);
  
        if (iframeUrl !== '') {
          content += `<iframe
                        src="${iframeUrl}"
                        allow = "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                        allowFullScreen ="true"
                        class= "absolute top-0 left-0 w-full h-full rounded-lg">
                      </iframe>`
        }*/
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
//!! o path deve incluir já o nome do arquivo e a extensão !!
const uploadToBunnyStorage = async (htmlContent: string, path: string): Promise<String> => {

  const storageHost = process.env.BUNNY_STORAGE_HOST!;
  const storageName = process.env.BUNNY_STORAGE_NAME!;
  const accessKey = process.env.BUNNY_STORAGE_ACCESS!;
  const pullZoneUrl = "capitalsexy.b-cdn.net";
  const uploadUrl = `${storageHost}/${storageName}/${path}`;

  try {
    const uploadResponse = await fetch(`${uploadUrl}`, {
      method: 'PUT',
      headers: {
        'AccessKey': accessKey,
        'Content-Type': 'application/octet-stream',
        'accept': 'application/json'
      },
      body: htmlContent,
    });

    console.log(uploadResponse)

    if (!uploadResponse.ok) {
      throw new Error(`Erro no upload: ${uploadResponse.statusText}`);
    }
    return `https://${pullZoneUrl}/${path}`;

  } catch (err: any) {
    console.error('Erro ao fazer upload para Bunny Storage:', err);
    throw err;
  }
}


