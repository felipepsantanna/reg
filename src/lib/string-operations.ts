export async function stringToSlug(str: string) {
    if (!str) {
        return '';
    }

    // Remove caracteres especiais e acentos, converte para minúsculo
    const normalizedStr = str
        .normalize('NFD') // Decompõe caracteres acentuados em base + combining diacritic
        .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritics
        .toLowerCase();

    // Substitui espaços e outros caracteres indesejados por hífens
    const slug = normalizedStr
        .replace(/\s+/g, '-') // Substitui espaços por hífens
        .replace(/[^\w-]+/g, '') // Remove caracteres não alfanuméricos (exceto hífens)
        .replace(/^-+|-+$/g, ''); // Remove hífens no início e no final

    return slug;
}