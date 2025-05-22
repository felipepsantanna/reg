interface FieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

// Função auxiliar para comparar valores, incluindo arrays e objetos por conteúdo
function areValuesEqual(val1: any, val2: any): boolean {
  // Tratar null e undefined como equivalentes para "ausência de valor"
  // Se um é null e o outro undefined, consideramos que não houve mudança.
  if ((val1 === null && val2 === undefined) || (val1 === undefined && val2 === null)) {
    return true;
  }

  // Se os tipos são diferentes (e não é o caso null/undefined acima), são diferentes.
  // Ex: número 5 vs string "5" serão considerados diferentes.
  // Ex: Date object vs string de data serão considerados diferentes.
  // Se os campos de data (created_at, updated_at) não fossem pulados,
  // e viessem com tipos diferentes (Date vs string), seriam marcados como alterados.
  if (typeof val1 !== typeof val2) {
    return false;
  }

  // Se ambos são objetos (o que inclui arrays em JS/TS) e não são null
  if (typeof val1 === 'object' && val1 !== null) {
    // Se um é array e o outro não, são diferentes
    if (Array.isArray(val1) !== Array.isArray(val2)) {
        return false;
    }
    // Compara a representação JSON stringificada.
    // Isso funciona bem para arrays e objetos simples compatíveis com JSON.
    // Cuidado: a ordem das chaves em objetos pode afetar JSON.stringify,
    // mas para a maioria dos casos e engines JS modernos, há uma normalização.
    // Outra limitação: `undefined` dentro de objetos é removido, e em arrays vira `null`.
    try {
      return JSON.stringify(val1) === JSON.stringify(val2);
    } catch (e) {
      // Em caso de erro na stringificação (ex: referências circulares), considera diferente.
      return false;
    }
  }

  // Comparação para tipos primitivos (string, number, boolean)
  // e também quando ambos são null ou ambos são undefined.
  return val1 === val2;
}

export function getUpdatedFields(
  oldData: Record<string, any>,
  newData: Record<string, any>
): FieldChange[] {
  const changes: FieldChange[] = [];

  // Usar um Set com todas as chaves de ambos os objetos garante
  // que campos adicionados ou removidos também sejam capturados.
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    // Pula os campos que você não quer rastrear
    if (key === 'created_at' || key === 'updated_at' || key === 'status') {
      continue;
    }

    const oldValue = oldData[key];
    const newValue = newData[key];

    // Usa a nova função para verificar se os valores são realmente diferentes
    if (!areValuesEqual(oldValue, newValue)) {
      changes.push({
        field: key,
        // Para o log, usa JSON.stringify para objetos/arrays,
        // e String() para primitivos. Trata null/undefined.
        oldValue: (oldValue !== undefined && oldValue !== null)
          ? (typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue))
          : null,
        newValue: (newValue !== undefined && newValue !== null)
          ? (typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue))
          : null,
      });
    }
  }

  return changes;
}