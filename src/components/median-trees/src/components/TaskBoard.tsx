import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  addEdge,
  type OnConnect,
  type OnNodesDelete,
  type OnEdgesDelete,
  type NodeChange,
  type EdgeChange,
  type OnNodeDrag,
  type NodeProps,
  type BuiltInNode,
  useNodesData,
  useUpdateNodeInternals,
  useNodes,
  useNodeConnections,
} from '@xyflow/react';
import ProjectModal from './ProjectModal';
import ProjectNode from './ProjectNode';
import TaskNodeComponent from './TaskNode';
import ControlPanel from './ControlPanel';
import HelpModal from './HelpModal';
import { saveProject, getLatestProject } from '../utils/storage';
import { getLayoutedElements } from '../utils/layout';
import { parseJiraCSV } from '../utils/jira';

// Node data types
interface ProjectNodeData {
  title: string;
  description: string;
  [key: string]: unknown;
}

interface TaskNodeData {
  title: string;
  description: string;
  hours: number;
  isNew?: boolean;
  [key: string]: unknown;
}

// Node types
type ProjectNode = Node<ProjectNodeData, 'project'>;
type TaskNode = Node<TaskNodeData, 'task'>;
export type CustomNode = ProjectNode | TaskNode;

// Type guards
function isProjectNode(node: CustomNode): node is ProjectNode {
  return node.type === 'project';
}

function isTaskNode(node: CustomNode): node is TaskNode {
  return node.type === 'task';
}

const TaskBoard = () => {
  // ReactFlow-managed state
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // UI state
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedNodeId, setSelectedNode] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const nodeTypes = useMemo(() => ({ project: ProjectNode, task: TaskNodeComponent }), []);

  // load & save
  useEffect(() => {
    const project = getLatestProject();
    if (project) {
      setNodes(project.data.nodes as unknown as CustomNode[]);
      setEdges(project.data.edges);
      setCurrentProjectName(project.name);
    } else {
      // Show help modal if no project exists
      setShowHelpModal(true);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (currentProjectName && nodes.length) {
      saveProject(currentProjectName, nodes as unknown as Node[], edges);
    }
  }, [currentProjectName, nodes, edges]);

  // graph events
  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onSelectionChange = useCallback(
    ({ nodes }: { nodes: Node[] }) => {
      setSelectedNode(nodes.length ? nodes[0].id : null);
    },
    []
  );

  const onNodesDelete: OnNodesDelete = useCallback(
    (nodesToDelete) => {
      // Remove any edges connected to the deleted nodes
      const nodeIds = nodesToDelete.map((node) => node.id);
      setEdges((eds) => eds.filter((edge) => 
        !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
      ));
    },
    [setEdges]
  );

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (edgesToDelete) => {
      setEdges((eds) => eds.filter((edge) => 
        !edgesToDelete.some((e) => e.id === edge.id)
      ));
    },
    [setEdges]
  );

  // helpers
  const addNewEdge = useCallback(
    (parentId: string, childId: string) => {
      console.log(`adding edge between ${parentId} and ${childId}`);
      
      // Get parent node data
      const parent = nodes.find((n) => n.id === parentId);
      console.log(`looking for parent ${parentId}`);
      if (!parent) {
        console.log(`parent not found`);
        return;
      }

      console.log(`parent: ${JSON.stringify(parent, null, 2)}`);

      // Get parent's children connections
      const parentsChildren = edges.filter((e) => e.source === parentId);
      console.log(`parents children: ${JSON.stringify(parentsChildren, null, 2)}`);

      // If parent has no children, set child's hours to same as parent's
      if (parentsChildren.length === 0 && isTaskNode(parent)) {
        setNodes((nds) => nds.map((n) => 
          n.id === childId 
            ? { ...n, data: { ...n.data, hours: parent.data.hours } } 
            : n
        ));
      }
      
      console.log(`parents children: ${JSON.stringify(parentsChildren, null, 2)}`);
      
      setEdges((es) => [...es, { 
        id: `${parentId}-${childId}`, 
        source: parentId, 
        target: childId, 
        type: 'smoothstep',
      }]);
    },
    [setNodes, setEdges, nodes]
  );

  const addNewNode = useCallback(
    (newNode: CustomNode) => {
      // determine position
      let parent = null;
      if (selectedNodeId) {
        parent = nodes.find((n) => n.id === selectedNodeId);
      }

      if (parent) {
        newNode.position = { 
          x: getNodeMidpoint(parent), 
          y: parent.position.y + 150 
        };
      }

      // add node & edge
      setNodes((nds) => {
        console.log(`nodes after add: ${JSON.stringify([...nds, newNode], null, 2)}`);
        return [...nds, newNode]
    });

      if (parent) {
        addNewEdge(parent.id, newNode.id);
      }
    },
    [nodes, selectedNodeId, addNewEdge, setNodes]
  );

  // project & task handlers
  const handleProjectCreate = useCallback((title: string, description: string) => {
    const projectNode: ProjectNode = { 
      id: '1', 
      type: 'project', 
      position: { x: 0, y: 0 }, 
      data: { 
        title, 
        description
      } 
    };
    setNodes([projectNode]);
    setEdges([]);
    setCurrentProjectName(title);
    setShowProjectModal(false);
  }, [setNodes, setEdges]);

  const handleNewProject = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setCurrentProjectName(null);
    setShowProjectModal(true);
  }, [setNodes, setEdges]);

  const handleNewTask = useCallback(() => {
    const newNode: TaskNode = {
      id: `task-${Date.now()}`,
      type: 'task',
      position: { x: 0, y: 0 },
      data: { 
        title: 'New Task', 
        description: '', 
        hours: 1,
      },
    };
    addNewNode(newNode);
  }, [addNewNode]);

  // keybinding
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'n' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        handleNewTask();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleNewTask]);

  const handleLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes as unknown as Node[],
      edges
    );
    setNodes(layoutedNodes as unknown as CustomNode[]);
    setEdges(layoutedEdges);
  }, [nodes, edges, setNodes, setEdges]);

  const handleJiraImport = useCallback(async (file: File) => {
    const text = await file.text();
    const { nodes: jiraNodes, edges: jiraEdges } = parseJiraCSV(text);
    
    // Set the nodes and edges
    setNodes(jiraNodes);
    setEdges(jiraEdges);
    
    // Apply layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      jiraNodes as unknown as Node[],
      jiraEdges
    );
    setNodes(layoutedNodes as unknown as CustomNode[]);
    setEdges(layoutedEdges);
  }, [setNodes, setEdges]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ControlPanel 
        onNewProject={handleNewProject} 
        onNewTask={handleNewTask} 
        onLayout={handleLayout}
        onJiraImport={handleJiraImport}
      />
      <button 
        className="help-button" 
        onClick={() => setShowHelpModal(true)}
        title="Help"
      >
        ?
      </button>
      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} />
      )}
      <ReactFlow
        nodes={nodes as unknown as Node[]}
        edges={edges}
        onNodesChange={onNodesChange as unknown as (changes: NodeChange[]) => void}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <MiniMap />
        <Background />
        <Controls />
      </ReactFlow>
      {showProjectModal && (
        <ProjectModal 
          onSubmit={handleProjectCreate} 
          onCancel={() => setShowProjectModal(false)} 
        />
      )}

    </div>
  );
};

export default TaskBoard;

function getNodeMidpoint(parent: CustomNode): number {
  const width = parent.measured?.width;
  const pos = parent.position.x;

  if (width && width > 234) {
    return pos + (width / 2) - 117;
  }
  return pos;
}

