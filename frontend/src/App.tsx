import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import AdminPanel from './AdminPanel'; // Importamos el panel
import 'leaflet/dist/leaflet.css';
import Login from './Login';
import ImageGallery from './ImageGallery';

// Coordenadas de Ecatepec
const CENTER_COORDS: [number, number] = [19.5732, -99.0214];
const BASE_IMAGE_URL = "https://storageplazablob.blob.core.windows.net/locales";

interface Floor {
  FloorId: number;
  Name: string;
}

// Interfaz actualizada al Nuevo Modelo
interface LocalProperties {
  id: number;       // Ahora es INT (LocalId)
  code: string;     // Nuevo campo visual (P1_L001)
  nombre: string;
  area: number;
  precio: number;
  estado: string;   // 'disponible' | 'negociacion' | 'ocupado'
  giro: string;
  imagen: string;
}

function App() {

  // 1. ESTADO DE AUTENTICACIÓN
  // Leemos si el usuario quiere entrar al admin
  const isAdminMode = window.location.search === '?admin';
  const [user, setUser] = useState<any>(null); // Guardará los datos del usuario logueado
  

  // 2. LÓGICA DE RUTEO SIMPLE
  if (isAdminMode) {
    // Si quiere ser admin pero NO tiene usuario -> Muestra Login
    if (!user) {
      return <Login onLogin={(u) => setUser(u)} />;
    }
    // Si ya tiene usuario, verifica rol
    if (user.role !== 'admin') {
      return (
        <div className="p-10 text-center">
          <h1 className="text-red-600 text-2xl font-bold">Acceso Denegado</h1>
          <p>Tu usuario no tiene permisos de administrador.</p>
          <button onClick={() => setUser(null)} className="mt-4 text-blue-500 underline">Volver</button>
        </div>
      );
    }
    // Si es admin -> Muestra el Panel
    return <AdminPanel />;
  }
  // Si la URL tiene ?admin, mostramos el panel
  //if (window.location.search === '?admin') {
  //  return <AdminPanel />;
  //}

  const [geoJsonData, setGeoJsonData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [localSeleccionado, setLocalSeleccionado] = useState<LocalProperties | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<number>(1);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    giro: '',
    mensaje: ''
  });

  // 3. Efecto para cargar la LISTA de pisos (solo una vez al inicio)
  useEffect(() => {
    fetch('http://localhost:3000/api/floors')
      .then(res => res.json())
      .then(data => {
        setFloors(data);
        if (data.length > 0) setSelectedFloorId(data[0].FloorId); // Seleccionar el primero por defecto
      })
      .catch(console.error);
  }, []);

  // 4. Modifica el efecto del mapa para que dependa de 'selectedFloorId'
  useEffect(() => {
    setGeoJsonData(null);
    // Usamos la variable de estado selectedFloorId en la URL
    fetch(`http://localhost:3000/api/floors/${selectedFloorId}/geojson`)
      .then(response => response.json())
      .then(data => {
        setGeoJsonData(data);
        setLocalSeleccionado(null); // Limpiamos selección al cambiar de piso
      })
      .catch(error => console.error("Error cargando el mapa:", error));
  }, [selectedFloorId]); // <--- OJO: Esto hace que se recargue cuando cambias el ID



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const enviarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localSeleccionado) return;

    try {
      const response = await fetch('http://localhost:3000/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localId: localSeleccionado.id, // ⚠️ CAMBIO: Ahora enviamos localId numérico
          ...formData
        })
      });

      const resultado = await response.json();

      if (resultado.success) {
        alert("¡Solicitud enviada! El local pasará a estado de negociación.");
        setMostrarFormulario(false);
        setFormData({ nombre: '', email: '', telefono: '', giro: '', mensaje: '' });
        // Recargar página para ver el cambio de color (o recargar mapa)
        window.location.reload();
      } else {
        alert("Error: " + resultado.message);
      }
    } catch (error) {
      console.error("Error enviando solicitud:", error);
      alert("Error de conexión con el servidor.");
    }
  };

  // Función para dar color a los polígonos
  const styleGeoJSON = (feature: any) => {
    // 1. DETECTAR SI ES EL LOCAL SELECCIONADO (AZUL)
    // Comparamos el ID del feature con el ID del estado localSeleccionado
    if (localSeleccionado && feature.properties.id === localSeleccionado.id) {
      return {
        color: "#1e3a8a",       // Borde Azul Oscuro (Navy)
        weight: 4,              // Borde más grueso para resaltar
        fillColor: "#3b82f6",   // Relleno Azul Brillante (Blue-500)
        fillOpacity: 0.7,       // Más sólido
        dashArray: ''           // Línea continua
      };
    }

    // 2. COLORES NORMALES POR ESTADO (Si no está seleccionado)
    const estado = feature.properties.estado;
    let fillColor = "#22c55e"; // Verde (Disponible)
    let borderColor = "#15803d";

    if (estado === 'ocupado') {
      fillColor = "#ef4444"; // Rojo
      borderColor = "#b91c1c";
    } else if (estado === 'negociacion') {
      fillColor = "#eab308"; // Amarillo
      borderColor = "#a16207";
    }

    return {
      color: borderColor,
      weight: 2,
      fillColor: fillColor,
      fillOpacity: 0.4, // Un poco más transparente cuando no está seleccionado
      dashArray: '3'    // Opcional: borde punteado suave para los normales
    };
  };
  const onEachFeature = (feature: any, layer: any) => {
    layer.on({
      click: () => {
        if (feature && feature.properties) {
          setLocalSeleccionado(feature.properties as LocalProperties);
          setMostrarFormulario(false);
        }
      },
    });
  };

  return (

    <div className="flex h-screen w-full flex-col bg-slate-50">
      <header className="bg-blue-900 p-4 text-white text-xl font-bold shadow-md z-10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span>🏢 Gestión de Rentas</span>

          {/* SELECTOR DE PISOS */}
          <select
            className="bg-blue-800 text-white text-sm py-1 px-3 rounded border border-blue-600 focus:outline-none"
            value={selectedFloorId}
            onChange={(e) => setSelectedFloorId(Number(e.target.value))}
          >
            {floors.map(f => (
              <option key={f.FloorId} value={f.FloorId}>{f.Name}</option>
            ))}
          </select>
        </div>

        <a href="/?admin" className="text-sm bg-blue-800 px-3 py-1 rounded hover:bg-blue-700">Ir a Admin</a>
      </header>
      {localSeleccionado && (
        <ImageGallery
          localCode={localSeleccionado.code}
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* PANEL LATERAL */}
        <aside className="w-1/3 min-w-[350px] bg-white p-6 shadow-xl z-20 overflow-y-auto border-r border-gray-200">

          

          {localSeleccionado ? (
            <div className="animate-fade-in space-y-4"> {/* Agregamos un contenedor con espaciado */}

              {/* --- INICIO DEL ENCABEZADO QUE FALTABA --- */}
              <div className="flex justify-between items-start border-b pb-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{localSeleccionado.nombre}</h2>
                  <p className="text-sm text-gray-500 font-mono mt-1">{localSeleccionado.code}</p>
                </div>
                <button
                  onClick={() => setLocalSeleccionado(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* --- FIN DEL ENCABEZADO --- */}
              {/* ... Título y botón cerrar ... */}

              {!mostrarFormulario ? (
                <div className="space-y-4">

                  {/* 4. ZONA DE IMAGEN MODIFICADA (AHORA ES UN BOTÓN) */}
                  <div
                    className="relative h-48 bg-gray-900 rounded-lg overflow-hidden cursor-pointer group shadow-lg"
                    onClick={() => setIsGalleryOpen(true)}
                  >
                    {/* Imagen de Portada (Buscamos la 1.jpg) */}
                    <img
                      src={`${BASE_IMAGE_URL}/${localSeleccionado.code}/1.jpg`}
                      alt={localSeleccionado.nombre}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      // Esto es opcional, porsi la imagen falla cargar una por defecto
                      onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400?text=Sin+Imagen'; }}
                    />

                    {/* Icono de "Ver Más" al pasar el mouse */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-black/50 text-white px-3 py-1 rounded-full text-sm font-bold border border-white">
                        📷 Ver Fotos
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded text-center">
                      <p className="text-xs text-gray-500 uppercase">Área</p>
                      <p className="font-semibold text-blue-900">{localSeleccionado.area} m²</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded text-center">
                      <p className="text-xs text-gray-500 uppercase">Precio</p>
                      <p className="font-semibold text-green-700">${localSeleccionado.precio}</p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-600"><strong>Giro sugerido:</strong> {localSeleccionado.giro}</p>
                    <p className="text-sm text-gray-600 mt-1 capitalize">
                      <strong>Estado:</strong>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs text-white
                        ${localSeleccionado.estado === 'disponible' ? 'bg-green-500' :
                          localSeleccionado.estado === 'ocupado' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                        {localSeleccionado.estado}
                      </span>
                    </p>
                  </div>

                  {localSeleccionado.estado === 'disponible' ? (
                    <button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg"
                      onClick={() => setMostrarFormulario(true)}
                    >
                      📅 Solicitar Renta
                    </button>
                  ) : (
                    <button disabled className="w-full bg-gray-300 text-gray-500 font-bold py-3 px-4 rounded-lg cursor-not-allowed">
                      🔒 No Disponible
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={enviarSolicitud} className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded mb-4 text-sm text-blue-800">
                    Solicitando: <strong>{localSeleccionado.nombre}</strong>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                    <input type="text" name="nombre" required
                      className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm"
                      value={formData.nombre} onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" name="email" required
                      className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm"
                      value={formData.email} onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                    <input type="tel" name="telefono" required
                      className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm"
                      value={formData.telefono} onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Giro</label>
                    <input type="text" name="giro" required
                      className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm"
                      value={formData.giro} onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan de Negocio</label>
                    <textarea name="mensaje" rows={3}
                      className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm"
                      value={formData.mensaje} onChange={handleInputChange}
                    ></textarea>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setMostrarFormulario(false)}
                      className="w-1/3 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300">
                      Cancelar
                    </button>
                    <button type="submit"
                      className="w-2/3 bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold shadow">
                      Envíar
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-20">
              <p className="text-4xl mb-4">👆</p>
              <p className="text-lg">Selecciona un local.</p>
            </div>
          )}
        </aside>

        <main className="flex-1 relative">
          <MapContainer
            center={CENTER_COORDS}
            zoom={19}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {geoJsonData && <GeoJSON key={`${selectedFloorId}-${localSeleccionado?.id || 'nada'}`} data={geoJsonData} style={styleGeoJSON} onEachFeature={onEachFeature} />}
          </MapContainer>
        </main>
      </div>
    </div>
  );
}

export default App;