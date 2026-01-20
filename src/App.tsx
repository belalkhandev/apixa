import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CollectionWorkspace from "./pages/CollectionWorkspace";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/collection/:collectionId" element={<CollectionWorkspace />} />
        <Route path="/quick-request" element={<CollectionWorkspace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

