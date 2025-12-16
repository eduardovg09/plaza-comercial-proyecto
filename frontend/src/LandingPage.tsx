import React from 'react';

interface LandingPageProps {
    onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">

            {/* 1. BARRA DE NAVEGACIÓN (Solo visual) */}
            <nav className="bg-blue-900 text-white p-4 shadow-md">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="font-bold text-xl flex items-center gap-2">
                        🏢 Plaza Comercial Ecatepec
                    </div>
                    <a href="/?admin" className="text-sm bg-blue-800 hover:bg-blue-700 px-4 py-2 rounded transition">
                        Acceso Administrativo
                    </a>
                </div>
            </nav>

            {/* 2. CONTENIDO PRINCIPAL */}
            <main className="flex-1 container mx-auto p-6 flex flex-col md:flex-row items-center gap-12 mt-8">

                {/* Lado Izquierdo: Historia y Texto */}
                <div className="flex-1 space-y-6 animate-fade-in-up">
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        {/* AQUÍ VA TU LOGO (Puedes reemplazar el emoji por una etiqueta <img src="..." />) */}
                        <span className="text-5xl">🏬</span>
                    </div>

                    <h1 className="text-5xl font-extrabold text-blue-900 leading-tight">
                        Bienvenido a tu <br />
                        <span className="text-blue-600">Nuevo Espacio</span>
                    </h1>

                    <div className="prose text-lg text-gray-600 leading-relaxed">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Nuestra Historia</h3>
                        <p>
                            Fundada con la visión de transformar el comercio en la región,
                            nuestra Plaza Comercial se ha convertido en el punto de encuentro
                            favorito de las familias. Desde nuestros inicios, nos hemos dedicado
                            a ofrecer un ambiente seguro, moderno y lleno de oportunidades.
                        </p>
                        <p className="mt-4">
                            Contamos con espacios diseñados estratégicamente para potenciar
                            tu negocio, con áreas verdes, seguridad 24/7 y una ubicación privilegiada
                            que garantiza el flujo constante de clientes.
                        </p>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={onEnter}
                            className="group bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold py-4 px-10 rounded-full shadow-lg transform transition hover:scale-105 flex items-center gap-3"
                        >
                            Explorar Mapa Interactivo
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                        <p className="text-sm text-gray-400 mt-3 ml-2">Haz clic para ver la disponibilidad de locales en tiempo real.</p>
                    </div>
                </div>

                {/* Lado Derecho: Imagen Decorativa */}
                <div className="flex-1 relative hidden md:block">
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                    <div className="absolute -bottom-8 -left-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>

                    <img
                        src="https://images.unsplash.com/photo-1519567241046-7f570eee3c9e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                        alt="Plaza Comercial"
                        className="relative rounded-2xl shadow-2xl border-4 border-white transform rotate-2 hover:rotate-0 transition duration-500"
                    />
                </div>
            </main>

            {/* 3. FOOTER */}
            <footer className="bg-gray-100 py-6 text-center text-gray-500 text-sm border-t border-gray-200">
                © {new Date().getFullYear()} Plaza Comercial Ecatepec. Todos los derechos reservados.
            </footer>
        </div>
    );
};

export default LandingPage;