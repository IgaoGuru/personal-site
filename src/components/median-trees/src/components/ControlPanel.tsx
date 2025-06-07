interface ControlPanelProps {
  onNewProject: () => void;
  onNewTask: () => void;
  onLayout: () => void;
  onJiraImport: (file: File) => void;
}

const ControlPanel = ({ onNewProject, onNewTask, onLayout, onJiraImport }: ControlPanelProps) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onJiraImport(file);
    }
  };

  return (
    <div className="control-panel">
      <button onClick={onNewProject} className="control-button">
        New Project
      </button>
      <button onClick={onNewTask} className="control-button">
        New Task
      </button>
      <button onClick={onLayout} className="control-button">
        Layout Tree
      </button>
      <label className="control-button">
        Load Jira
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  );
};

export default ControlPanel; 