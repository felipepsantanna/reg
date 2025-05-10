type FieldChange = {
    field: string;
    oldValue: string | null;
    newValue: string | null;
};

/**
 * Compara os dados antigos e novos e retorna as alterações feitas.
 */
export function getUpdatedFields(
    oldData: Record<string, any>,
    newData: Record<string, any>
): FieldChange[] {
    const changes: FieldChange[] = [];

    for (const key in newData) {
        const oldValue = oldData[key];
        const newValue = newData[key];

        // Verifica se houve alteração (considera null e undefined também)
        if (oldValue !== newValue) {
            changes.push({
                field: key,
                oldValue: oldValue !== undefined ? String(oldValue) : null,
                newValue: newValue !== undefined ? String(newValue) : null,
            });
        }
    }

    return changes;
}