/**
 * Utilitário para resolução do arquivo de marca d'água de acordo com o sexo do anunciante.
 * 
 * Regras:
 * - Feminino / Mulheres -> watermark-mulheres.png
 * - Masculino / Homens  -> watermark-homens.png
 * - Trans / Transex     -> watermark-transex.png
 * - Se não selecionado ou inválido, lança erro para exigir que o anunciante defina o sexo antes do upload.
 */

export function getWatermarkFileName(sexo?: string | null): string {
    if (!sexo || !sexo.trim()) {
        throw new Error('Por favor, selecione o sexo no seu perfil antes de enviar fotos.');
    }

    const normalized = sexo.trim().toLowerCase();

    if (normalized === 'feminino' || normalized === 'mulher' || normalized === 'mulheres') {
        return 'watermark-mulheres.png';
    }

    if (normalized === 'masculino' || normalized === 'homem' || normalized === 'homens') {
        return 'watermark-homens.png';
    }

    if (normalized === 'trans' || normalized === 'transex' || normalized === 'travesti' || normalized === 'travestis') {
        return 'watermark-transex.png';
    }

    throw new Error(`Sexo inválido ("${sexo}"). Por favor, selecione o sexo no seu perfil antes de enviar fotos.`);
}
