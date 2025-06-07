import type { Node, Edge } from '@xyflow/react';
import type { CustomNode } from '../components/TaskBoard';

interface JiraIssue {
  Summary: string;
  'Issue key': string;
  'Issue id': string;
  'Issue Type': string;
  Parent: string;
  'Custom field (Story point estimate)': string;
  'Custom field (story point estimate)': string;
}

interface ParsedIssue {
  id: string;
  summary: string;
  type: string;
  parentId: string | null;
  storyPoints: number;
}

export const parseJiraCSV = (csvContent: string): { nodes: CustomNode[], edges: Edge[] } => {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  
  // Create a map of column indices
  const indices = {
    summary: headers.indexOf('Summary'),
    issueKey: headers.indexOf('Issue key'),
    issueId: headers.indexOf('Issue id'),
    issueType: headers.indexOf('Issue Type'),
    parent: headers.indexOf('Parent'),
    storyPoints: headers.indexOf('Custom field (story point estimate)'),
  };

  // First pass: collect all issues
  const issues: ParsedIssue[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',');
    const storyPointsStr = values[indices.storyPoints];
    const storyPoints = storyPointsStr ? parseFloat(storyPointsStr) : 1;

    issues.push({
      id: values[indices.issueId],
      summary: values[indices.summary],
      type: values[indices.issueType],
      parentId: values[indices.parent] || null,
      storyPoints,
    });
  }

  // Sort issues: tasks first, then subtasks
  issues.sort((a, b) => {
    if (a.type === 'Task' && b.type === 'Subtask') return -1;
    if (a.type === 'Subtask' && b.type === 'Task') return 1;
    return 0;
  });

  const nodes: CustomNode[] = [];
  const edges: Edge[] = [];
  const nodeMap = new Map<string, string>(); // Map of issue ID to node ID

  // Create project node
  const projectNode: CustomNode = {
    id: 'project-1',
    type: 'project',
    position: { x: 0, y: 0 },
    data: {
      title: 'My Project',
      description: '',
    },
  };
  nodes.push(projectNode);

  // Second pass: create nodes and edges in the correct order
  for (const issue of issues) {
    // Create node
    const node: CustomNode = {
      id: `task-${issue.id}`,
      type: 'task',
      position: { x: 0, y: 0 }, // Position will be set by layout
      data: {
        title: issue.summary,
        description: '',
        hours: issue.storyPoints,
      },
    };

    nodes.push(node);
    nodeMap.set(issue.id, node.id);

    // Create edge if there's a parent
    if (issue.parentId) {
      const parentNodeId = nodeMap.get(issue.parentId);
      if (parentNodeId) {
        edges.push({
          id: `${parentNodeId}-${node.id}`,
          source: parentNodeId,
          target: node.id,
          type: 'smoothstep',
        });
      }
    } else {
      // If no parent, connect to project node
      edges.push({
        id: `${projectNode.id}-${node.id}`,
        source: projectNode.id,
        target: node.id,
        type: 'smoothstep',
      });
    }
  }

  return { nodes, edges };
}; 