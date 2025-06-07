import type { Node, Edge } from '@xyflow/react';

interface ProjectData {
  nodes: Node[];
  edges: Edge[];
  created_at: string;
  last_updated_at: string;
}

interface Projects {
  [key: string]: ProjectData;
}

const STORAGE_KEY = 'median-tree-projects';

export const saveProject = (projectName: string, nodes: Node[], edges: Edge[]) => {
  const projects = getProjects();
  const now = new Date().toISOString();

  projects[projectName] = {
    nodes,
    edges,
    created_at: projects[projectName]?.created_at || now,
    last_updated_at: now,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

export const getProjects = (): Projects => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
};

export const getLatestProject = (): { name: string; data: ProjectData } | null => {
  const projects = getProjects();
  const projectNames = Object.keys(projects);
  
  if (projectNames.length === 0) return null;

  // Sort by last_updated_at to get the most recent project
  const latestProjectName = projectNames.sort((a, b) => {
    const dateA = new Date(projects[a].last_updated_at).getTime();
    const dateB = new Date(projects[b].last_updated_at).getTime();
    return dateB - dateA;
  })[0];

  return {
    name: latestProjectName,
    data: projects[latestProjectName],
  };
}; 