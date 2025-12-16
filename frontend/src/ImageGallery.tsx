import { useState } from 'react';

interface GalleryProps {
    localCode: string; // Recibimos el código (P1_L01) para saber qué carpeta buscar
    isOpen: boolean;
    onClose: () => void;
}

export default function ImageGallery({ localCode, isOpen, onClose }: GalleryProps) {
    if (!isOpen) return null;

    // Asumimos que cada local tiene 3 fotos. 
    // En un sistema real, esto vendría de la Base de Datos, pero por convención funciona perfecto.
    const BASE_IMAGE_URL = "https://storageplazablob.blob.core.windows.net/locales";
    const images = [
        `${BASE_IMAGE_URL}/${localCode}/1.jpg`,
        `${BASE_IMAGE_URL}/${localCode}/2.jpg`,
        `${BASE_IMAGE_URL}/${localCode}/3.jpg`
    ];

    const [currentIndex, setCurrentIndex] = useState(0);

    const next = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        // Fondo oscuro (Overlay)
        // Cambiamos z-50 por z-[9999]
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-90 flex items-center justify-center p-4" onClick={onClose}>

            {/* Botón Cerrar */}
            <button onClick={onClose} className="absolute top-5 right-5 text-white text-4xl hover:text-gray-300">
                &times;
            </button>

            {/* Contenedor Principal */}
            <div className="relative w-full max-w-4xl h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>

                {/* Imagen Actual */}
                <img
                    src={images[currentIndex]}
                    alt={`Galería ${currentIndex}`}
                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xl animate-fade-in"
                    onError={(e) => {
                        // Si no encuentra la foto 2 o 3, muestra una genérica
                        e.currentTarget.src = 'https://placehold.co/600x400?text=Sin+Foto+Adicional';
                    }}
                />

                {/* Botón Anterior */}
                <button
                    onClick={prev}
                    className="absolute left-2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition-all"
                >
                    &#10094;
                </button>

                {/* Botón Siguiente */}
                <button
                    onClick={next}
                    className="absolute right-2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition-all"
                >
                    &#10095;
                </button>

                {/* Indicadores (Puntitos) */}
                <div className="absolute bottom-4 flex gap-2">
                    {images.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-2 w-2 rounded-full ${idx === currentIndex ? 'bg-white' : 'bg-gray-500'}`}
                        />
                    ))}
                </div>

            </div>
        </div>
    );
}