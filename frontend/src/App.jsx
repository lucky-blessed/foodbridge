import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import Discover from './pages/Discover';
import Dashboard from './pages/Dashboard';
import PostFood from './pages/PostFood';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/post" element={<PostFood />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;