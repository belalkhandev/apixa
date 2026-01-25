import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import SelectCollectionModal from "../SelectCollectionModal";
import { api, Collection } from "../../api";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const data = await api.getCollections();
      setCollections(data);
    } catch (error) {
      console.error("Failed to load collections:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar
        onNewRequest={() => navigate("/quick-request")}
        onSelectRunner={() => setIsSelectModalOpen(true)}
      />

      <main className="flex-1 overflow-auto">
        {children}
      </main>

      <SelectCollectionModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        collections={collections}
        onSelect={(id) => navigate(`/runner/${id}`)}
      />
    </div>
  );
}
