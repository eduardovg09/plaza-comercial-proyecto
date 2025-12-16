// frontend/src/config.ts

// Vite sabe automáticamente si estás corriendo en tu PC (development) o en la nube (production)
const isProduction = import.meta.env.MODE === 'production';

export const API_URL = isProduction
  ? "https://api-plaza-proyecto-bxdkh2caf0e8bjhr.canadacentral-01.azurewebsites.net" // <--- 🔴 PEGA AQUÍ TU URL DE AZURE (BACKEND)
  : "http://localhost:3000";                           // En tu PC usará esta