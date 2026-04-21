"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  type Project,
  type ProjectStatus,
  getProjects,
  createProject as apiCreate,
  updateProject as apiUpdate,
  completeProject as apiComplete,
  archiveProject as apiArchive,
} from "@/lib/projects";

const LS_KEY = "mhp-active-project";

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (p: Project | null) => void;
  create: (payload: Partial<Project>) => Promise<Project>;
  update: (id: string, payload: Partial<Project>) => Promise<void>;
  complete: (id: string) => Promise<void>;
  archive: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  loading: boolean;
}

const ProjectCtx = createContext<ProjectContextValue>({
  projects: [],
  activeProject: null,
  setActiveProject: () => {},
  create: async () => ({} as Project),
  update: async () => {},
  complete: async () => {},
  archive: async () => {},
  refresh: async () => {},
  loading: true,
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data);

      // Restore active from localStorage
      const savedId = localStorage.getItem(LS_KEY);
      if (savedId) {
        const found = data.find((p) => p.id === savedId);
        setActiveState(found ?? null);
        if (!found) localStorage.removeItem(LS_KEY);
      }
    } catch {
      // silently fail — user may not have table yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const setActiveProject = useCallback(
    (p: Project | null) => {
      setActiveState(p);
      if (p) {
        localStorage.setItem(LS_KEY, p.id);
      } else {
        localStorage.removeItem(LS_KEY);
      }
    },
    []
  );

  const create = useCallback(
    async (payload: Partial<Project>) => {
      const created = await apiCreate(payload);
      await fetchProjects();
      return created;
    },
    [fetchProjects]
  );

  const update = useCallback(
    async (id: string, payload: Partial<Project>) => {
      await apiUpdate(id, payload);
      await fetchProjects();
    },
    [fetchProjects]
  );

  const complete = useCallback(
    async (id: string) => {
      await apiComplete(id);
      // If completing the active project, clear it
      if (activeProject?.id === id) setActiveProject(null);
      await fetchProjects();
    },
    [fetchProjects, activeProject, setActiveProject]
  );

  const archive = useCallback(
    async (id: string) => {
      await apiArchive(id);
      if (activeProject?.id === id) setActiveProject(null);
      await fetchProjects();
    },
    [fetchProjects, activeProject, setActiveProject]
  );

  return (
    <ProjectCtx.Provider
      value={{
        projects,
        activeProject,
        setActiveProject,
        create,
        update,
        complete,
        archive,
        refresh: fetchProjects,
        loading,
      }}
    >
      {children}
    </ProjectCtx.Provider>
  );
}

export function useProjects() {
  return useContext(ProjectCtx);
}
