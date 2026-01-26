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
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <AppSidebar
        onNewRequest={() => navigate("/quick-request")}
        onSelectRunner={() => setIsSelectModalOpen(true)}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </div>
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
