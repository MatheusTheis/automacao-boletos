import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import PaginaBoletos from './paginas/pagina-boletos';
import PaginaCadastro from './paginas/pagina-cadastro';
import PaginaBoasVindas, { CHAVE_ONBOARDING } from './paginas/pagina-boas-vindas';

function RotaInicial() {
  const onboardingConcluido = window.localStorage.getItem(CHAVE_ONBOARDING) === 'true';

  if (!onboardingConcluido) {
    return <Navigate to="/boas-vindas" replace />;
  }

  return <PaginaBoletos />;
}

function RotaBoasVindas() {
  const onboardingConcluido = window.localStorage.getItem(CHAVE_ONBOARDING) === 'true';

  if (onboardingConcluido) {
    return <Navigate to="/" replace />;
  }

  return <PaginaBoasVindas />;
}

function App() {
  const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<RotaInicial />} />
        <Route path="/boas-vindas" element={<RotaBoasVindas />} />
        <Route path="/cadastro" element={<PaginaCadastro />} />
        <Route path="/cemavi" element={<Navigate to="/cadastro" replace />} />
        <Route path="/mb" element={<Navigate to="/cadastro" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
