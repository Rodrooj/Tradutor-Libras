import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LibrasTranslator from './pages/LibrasTranslator';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tradutor" element={<LibrasTranslator />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
