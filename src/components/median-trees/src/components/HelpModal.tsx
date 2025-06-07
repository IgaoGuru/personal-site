import { useEffect } from 'react';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal = ({ onClose }: HelpModalProps) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Welcome to MedianTrees 🌳</h2>
        <p>
          MedianTrees is a web application for calculating <em>Estimated Completion Times</em> based on a recent 
          <a href="https://thesearesystems.substack.com/p/task-estimation-conquering-hofstadters" target="_blank" rel="noopener noreferrer">
            statistical study on developer time estimates
          </a>.
        </p>

        <h3>How to Use</h3>
        <div className="modal-section">
          <h4>Manual Task Creation</h4>
          <ul>
            <li>Click "New Project" to start a new project</li>
            <li>Click "New Task" to add tasks (or press 'n')</li>
            <li>Connect tasks by dragging from one node's handle to another</li>
            <li>Click "Layout Tree" to automatically arrange the tasks</li>
          </ul>
        </div>

        <div className="modal-section">
          <h4>Jira Import</h4>
          <ul>
            <li>Export your Jira board to CSV with all attributes</li>
            <li>Click "Load Jira" and select your CSV file</li>
            <li>The tasks will be automatically imported and arranged</li>
            <li>Story points will be used as task hours</li>
          </ul>
        </div>
        This project was built by me, <a href="https://falso.net">Igor</a>. You can reach me on <a href="https://x.com/GuruIgao">Twitter</a> too!
        <div className="modal-footer">
          <p>
            Built with ❤️ using 
            <a href="https://reactflow.dev/" target="_blank" rel="noopener noreferrer">ReactFlow</a> and 
            <a href="https://github.com/dagrejs/dagre" target="_blank" rel="noopener noreferrer">DagreJS</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpModal; 