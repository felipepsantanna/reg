'use client';

import { useState, useEffect } from 'react';

import { AuditLogsRow } from '@/types/db';


export default function ProfilePage({ params }: { params: { id: string } }) {
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [auditLogs, setAuditLogs] = useState<AuditLogsRow[]>([]);

     if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center">Carregando...</div>
                </div>
            </div>
        );
    }

    if (error || !auditLogs) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center text-red-600">{error || 'Perfil não encontrado'}</div>
                </div>
            </div>
        );
    }

     return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Atualizações do usuário</h1>
            </div>    
        </div>    
            )

}