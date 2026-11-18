import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Registro from './pages/Registro.jsx'
import Verificar from './pages/Verificar.jsx'
import Recuperar from './pages/Recuperar.jsx'
import Explorar from './pages/Explorar.jsx'
import Reclamo from './pages/Reclamo.jsx'
import MisReclamos from './pages/MisReclamos.jsx'
import DetalleReclamo from './pages/DetalleReclamo.jsx'
import Reportar from './pages/Reportar.jsx'
import MisPublicaciones from './pages/MisPublicaciones.jsx'
import EditarPublicacion from './pages/EditarPublicacion.jsx'
import DetalleExtravio from './pages/DetalleExtravio.jsx'
import MiCuenta from './pages/MiCuenta.jsx'
import Vigilancia from './pages/Vigilancia.jsx'

export default function App() {
  const { usuario, cargando, esStaff } = useAuth()
  if (cargando) return <p className="empty">Comprobando sesión…</p>

  return (
    <ToastProvider>
      {usuario ? (
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Explorar />} />
            <Route path="/reclamo/:id" element={<Reclamo />} />
            <Route path="/reclamos" element={<MisReclamos />} />
            <Route path="/reclamos/:id" element={<DetalleReclamo />} />
            <Route path="/reportar" element={<Reportar />} />
            <Route path="/publicaciones" element={<MisPublicaciones />} />
            <Route path="/editar/:tipo/:id" element={<EditarPublicacion />} />
            <Route path="/extravio/:id" element={<DetalleExtravio />} />
            <Route path="/cuenta" element={<MiCuenta />} />
            {esStaff && <Route path="/vigilancia" element={<Vigilancia />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      ) : (
        <Routes>
          <Route path="/registro" element={<Registro />} />
          <Route path="/verificar" element={<Verificar />} />
          <Route path="/recuperar" element={<Recuperar />} />
          <Route path="*" element={<Login />} />
        </Routes>
      )}
    </ToastProvider>
  )
}
