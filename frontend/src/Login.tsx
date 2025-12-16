import { useState } from 'react';
import { API_URL } from './config';
// Forzando actualización de desplie

interface LoginProps {
    onLogin: (userData: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            // CORRECCIÓN AQUÍ: El paréntesis de cierre va AL FINAL, no después de la URL
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (data.success) {
                // Guardamos el token
                localStorage.setItem('token', data.token);
                // Avisamos a App que ya entramos
                onLogin(data.user);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-200">
            <div className="bg-white p-8 rounded-lg shadow-xl w-96">
                <h2 className="text-2xl font-bold mb-6 text-center text-blue-900">Acceso Administrativo</h2>

                {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Correo</label>
                        <input
                            type="email"
                            className="w-full border p-2 rounded focus:outline-blue-500"
                            value={email} onChange={e => setEmail(e.target.value)} required
                            placeholder="admin@plaza.com"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Contraseña</label>
                        <input
                            type="password"
                            className="w-full border p-2 rounded focus:outline-blue-500"
                            value={password} onChange={e => setPassword(e.target.value)} required
                            placeholder="••••••"
                        />
                    </div>

                    <button type="submit" className="w-full bg-blue-900 text-white font-bold py-2 rounded hover:bg-blue-800 transition">
                        Iniciar Sesión
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <a href="/" className="text-sm text-gray-500 hover:text-blue-500">← Regresar al Mapa Público</a>
                </div>
            </div>
        </div>
    );
}