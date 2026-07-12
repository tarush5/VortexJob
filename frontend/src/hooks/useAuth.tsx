import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, Project } from '../types';
import { authApi, orgApi, projectApi, setToken, clearToken } from '../api';

interface AuthContextValue {
  token: string | null;
  user: User | null;
  projects: Project[];
  selectedProject: Project | null;
  setSelectedProject: (project: Project) => void;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('vortexjob_token'));
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const init = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const meRes = await authApi.me();
      setUser(meRes.data);

      const orgsRes = await orgApi.list();
      let orgList = orgsRes.data;

      if (orgList.length === 0) {
        const newOrg = await orgApi.create('My Organization');
        orgList = [newOrg.data];
      }

      const projRes = await projectApi.list(orgList[0].id);
      let projList = projRes.data;

      if (projList.length === 0) {
        const newProj = await projectApi.create(orgList[0].id, 'Default Project');
        projList = [newProj.data];
      }

      setProjects(projList);
      setSelectedProject(projList[0]);
    } catch {
      clearToken();
      setTokenState(null);
      setUser(null);
      setProjects([]);
      setSelectedProject(null);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    init();
  }, [init]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setToken(res.data.token);
    setTokenState(res.data.token);
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await authApi.register(email, password, name);
    setToken(res.data.token);
    setTokenState(res.data.token);
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    setUser(null);
    setProjects([]);
    setSelectedProject(null);
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      projects,
      selectedProject,
      setSelectedProject,
      loading,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
