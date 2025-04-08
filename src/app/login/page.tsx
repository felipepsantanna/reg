'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        // Simular delay de processamento
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Credenciais fixas para teste
        if (email === 'admin@admin.com' && password === 'admin123') {
            router.push('/dashboard');
        } else {
            setError('Email ou senha incorretos');
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                width: '100%',
                maxWidth: '400px'
            }}>
                <h1 style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    marginBottom: '1.5rem',
                    textAlign: 'center',
                    color: '#1f2937'
                }}>
                    Login
                </h1>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label htmlFor="email" style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#374151',
                            fontSize: '0.875rem'
                        }}>
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #d1d5db',
                                fontSize: '0.875rem'
                            }}
                            placeholder="admin@admin.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#374151',
                            fontSize: '0.875rem'
                        }}>
                            Senha
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            required
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #d1d5db',
                                fontSize: '0.875rem'
                            }}
                            placeholder="admin123"
                        />
                    </div>

                    {error && (
                        <div style={{
                            color: '#dc2626',
                            fontSize: '0.875rem',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    color: '#4b5563'
                }}>
                    <p style={{ marginBottom: '0.5rem' }}>Credenciais de teste:</p>
                    <p>Email: admin@admin.com</p>
                    <p>Senha: admin123</p>
                </div>
            </div>
        </div>
    );
} 