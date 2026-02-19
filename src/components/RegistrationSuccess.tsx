'use client';
import { FaWhatsapp, FaRocket } from 'react-icons/fa';



export const RegistrationSuccess = ({ userName }: { userName: string }) => {
    const phoneNumber = "556183049971"; // Recomendo usar env: process.env.NEXT_PUBLIC_WHATSAPP
    const message = `Olá! Estou finalizando meu cadastro agora e gostaria de agilizar minha aprovação. User: ${userName}`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    return (
        <div className="w-full max-w-sm p-6 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 text-amber-500 mb-3">
                <FaRocket size={18} />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Dica de Agilidade
                </span>
            </div>

            <h3 className="text-lg font-bold text-gray-800 mb-2">
                Acelere sua Ativação ⚡
            </h3>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Assim que você clicar em <span className="font-semibold text-gray-800">"Finalizar Cadastro"</span>,
                avise nosso time pelo WhatsApp para priorizarmos sua análise.
            </p>

            <div className="space-y-4">
                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 px-4 rounded-xl transition-all hover:scale-[1.02] shadow-md group"
                >
                    <FaWhatsapp size={22} className="group-hover:rotate-12 transition-transform" />
                    AVISAR NO WHATSAPP
                </a>

            </div>

        </div>
    );
};