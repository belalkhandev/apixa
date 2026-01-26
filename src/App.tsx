import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Home from "./pages/Home";
import CollectionWorkspace from "./pages/CollectionWorkspace";
import Runner from "./pages/Runner";
import Collections from "./pages/Collections";
import Notes from "./pages/Notes";
import Todos from "./pages/Todos";
import Archive from "./pages/Archive";
import MainLayout from "./components/layout/MainLayout";
import JsonPrettier from "./pages/JsonPrettier";
import DbSchemaPage from "./pages/DbSchema";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster position="bottom-right" richColors />
        <Routes>
          <Route
            path="/"
            element={
              <MainLayout>
                <Home />
              </MainLayout>
            }
          />
          <Route
            path="/collections"
            element={
              <MainLayout>
                <Collections />
              </MainLayout>
            }
          />
          <Route
            path="/notes"
            element={
              <MainLayout>
                <Notes />
              </MainLayout>
            }
          />
          <Route
            path="/todos"
            element={
              <MainLayout>
                <Todos />
              </MainLayout>
            }
          />
          <Route
            path="/todos/archive"
            element={
              <MainLayout>
                <Archive />
              </MainLayout>
            }
          />

          <Route
            path="/json-prettier"
            element={
              <MainLayout>
                <JsonPrettier />
              </MainLayout>
            }
          />

          <Route
            path="/db-schema"
            element={<DbSchemaPage />}
          />

          {/* Quick request with sidebar */}
          <Route
            path="/quick-request"
            element={
              <MainLayout>
                <CollectionWorkspace />
              </MainLayout>
            }
          />

          {/* Full-screen pages (no sidebar) */}
          <Route path="/collection/:collectionId" element={<CollectionWorkspace />} />
          <Route
            path="/runner/:collectionId"
            element={
              <MainLayout>
                <Runner />
              </MainLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
