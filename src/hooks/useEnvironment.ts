import { useState, useEffect, useCallback } from "react";
import { api, Environment } from "../api";

interface UseEnvironmentReturn {
    environments: Environment[];
    selectedEnvId: string | null;
    setSelectedEnvId: (id: string | null) => void;
    handleCreateEnv: (envData: { name: string; variables: { key: string; value: string; enabled: boolean }[] }) => Promise<void>;
    handleUpdateEnv: (envData: { id: string; name: string; variables: { key: string; value: string; enabled: boolean }[] }) => Promise<void>;
    handleDeleteEnv: (envId: string) => Promise<void>;
    handleUpdateVariable: (name: string, newValue: string) => Promise<void>;
    replaceEnvVariables: (text: string) => string;
}

export function useEnvironment(): UseEnvironmentReturn {
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);

    useEffect(() => {
        loadEnvironments();
    }, []);

    const loadEnvironments = async () => {
        try {
            const data = await api.getEnvironments();
            setEnvironments(data);
            if (data.length > 0) {
                setSelectedEnvId(data[0].id);
            }
        } catch (err) {
            console.error("Failed to load environments:", err);
        }
    };

    const handleCreateEnv = useCallback(async (envData: { name: string; variables: { key: string; value: string; enabled: boolean }[] }) => {
        try {
            const newEnv = await api.createEnvironment(envData.name, envData.variables);
            setEnvironments(prev => [...prev, newEnv]);
            setSelectedEnvId(newEnv.id);
        } catch (err) {
            console.error("Failed to create environment:", err);
        }
    }, []);

    const handleUpdateEnv = useCallback(async (envData: { id: string; name: string; variables: { key: string; value: string; enabled: boolean }[] }) => {
        try {
            const updated = await api.updateEnvironment(envData.id, envData.name, envData.variables);
            setEnvironments(prev => prev.map((e) => (e.id === updated.id ? updated : e)));
        } catch (err) {
            console.error("Failed to update environment:", err);
        }
    }, []);

    const handleDeleteEnv = useCallback(async (envId: string) => {
        try {
            await api.deleteEnvironment(envId);
            setEnvironments(prev => prev.filter((e) => e.id !== envId));
            setSelectedEnvId(prev => prev === envId ? null : prev);
        } catch (err) {
            console.error("Failed to delete environment:", err);
        }
    }, []);

    const handleUpdateVariable = useCallback(async (name: string, newValue: string) => {
        if (!selectedEnvId) return;

        const env = environments.find(e => e.id === selectedEnvId);
        if (!env) return;

        const existingVar = env.variables.find(v => v.key === name);
        let updatedVariables;

        if (existingVar) {
            // Update existing variable
            updatedVariables = env.variables.map(v =>
                v.key === name ? { ...v, value: newValue } : v
            );
        } else {
            // Create new variable (API will assign id and environment_id)
            updatedVariables = [
                ...env.variables,
                { key: name, value: newValue, enabled: true }
            ];
        }

        try {
            // Call API and get the updated environment with proper IDs
            const updated = await api.updateEnvironment(env.id, env.name, updatedVariables);
            setEnvironments(prev => prev.map(e => e.id === updated.id ? updated : e));
        } catch (err) {
            console.error("Failed to update variable:", err);
        }
    }, [selectedEnvId, environments]);

    const replaceEnvVariables = useCallback((text: string): string => {
        if (!selectedEnvId || !text) return text;
        const selectedEnv = environments.find((e) => e.id === selectedEnvId);
        if (!selectedEnv) return text;

        let result = text;
        selectedEnv.variables.forEach((v) => {
            if (v.enabled && v.key) {
                result = result.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, "g"), v.value);
            }
        });
        return result;
    }, [selectedEnvId, environments]);

    return {
        environments,
        selectedEnvId,
        setSelectedEnvId,
        handleCreateEnv,
        handleUpdateEnv,
        handleDeleteEnv,
        handleUpdateVariable,
        replaceEnvVariables,
    };
}

export default useEnvironment;
