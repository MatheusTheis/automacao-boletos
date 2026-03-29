import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import PaginaBoletos from './paginas/pagina-boletos';
import PaginaCadastroCemavi from './paginas/pagina-cadastro-cemavi';
import PaginaCadastroMb from './paginas/pagina-cadastro-mb';

function App() {
  const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<PaginaBoletos />} />
        <Route path="/cemavi" element={<PaginaCadastroCemavi />} />
        <Route path="/mb" element={<PaginaCadastroMb />} />
      </Routes>
    </Router>
  );
}

export default App;
