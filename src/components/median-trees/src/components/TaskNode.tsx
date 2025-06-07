import { Handle, Position, useNodeConnections, useNodesData, useReactFlow, type Node, type NodeProps} from '@xyflow/react';
import { useState, useEffect } from 'react';
import { timeToCertainty } from '../utils/lognormal';

type TaskNode = Node<
    {title :string;
    description: string;
    hours: number;
    isNew?: boolean
    lastInputtedECT?: number;
    ectDist?: number[];
}
    , 'task'>

const TaskNode = ({ data, selected, id }: NodeProps<TaskNode>) => {
    const { updateNodeData } = useReactFlow();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingHours, setIsEditingHours] = useState(false);
  const childrenConnections = useNodeConnections({id, handleType: 'source'})
  const childrenData = useNodesData<TaskNode>(childrenConnections.map((connection) => connection.target))

    useEffect(() => {
        console.log('triggered children data use effect', childrenData);
        if (childrenData.length > 0) {
            const totalHours = childrenData.reduce((acc, child) => 
                acc + child.data.hours, 0);
            updateNodeData(id, {hours: totalHours});
        } else if (childrenData.length === 0 && data.lastInputtedECT) {
            updateNodeData(id, {hours: data.lastInputtedECT})
        }
    }, [childrenData])

    useEffect(() => {
        if (data.hours) {
            const mean = timeToCertainty(0.7, data.hours).toFixed(1) ;
            const p95 = timeToCertainty(0.95, data.hours).toFixed(1);
            const p99 = timeToCertainty(0.99, data.hours).toFixed(1);
            console.log('disttt')
            console.log(mean, p95, p99);
            updateNodeData(id, {ectDist: [mean, p95, p99]})
        }
    }, [data.hours])

      return (
    <div className={`task-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="task-node-content">
        {isEditingTitle ? (
          <input
            type="text"
            value={data.title}
            onChange={(e) => updateNodeData(id, {title: e.target.value})}
            onBlur={() => setIsEditingTitle(false)}
            placeholder="Task title"
            className="task-input"
            autoFocus // Automatically focus when the input is rendered
          />
        ) : (
          <h3 className="task-title" onClick={() => setIsEditingTitle(true)}>
            {data.title || <span className="placeholder">[Untitled Task]</span>}
          </h3>
        )}

        {isEditingDescription ? (
          <textarea
            value={data.description}
            onChange={(e) => updateNodeData(id, {description: e.target.value})}
            onBlur={() => setIsEditingDescription(false)}
            placeholder="Task description (optional)"
            className="task-input"
            autoFocus // Automatically focus when the input is rendered
          />
        ) : (
          <p className="task-description" onClick={() => setIsEditingDescription(true)}>
            {data.description || <span className="placeholder">[No description]</span>}
          </p>
        )}

        {isEditingHours ? (
          <input
            type="number"
            value={data.hours}
            onChange={(e) => {
                updateNodeData(id, {hours: parseInt(e.target.value), lastInputtedECT: parseInt(e.target.value)});
            }}
            onBlur={() => setIsEditingHours(false)}
            placeholder="Hours"
            min="0"
            step="0.5"
            className="task-input"
            autoFocus // Automatically focus when the input is rendered
          />
        ) : (
          <p className="task-hours" onClick={() => childrenConnections.length === 0 ? setIsEditingHours(true): null}>
            {data.hours || "0"}h | <span style={{color: 'red'}}>{data.ectDist?.[0]}</span> | <span style={{color: 'orange'}}>{data.ectDist?.[1]}</span> | <span style={{color: 'green'}}>{data.ectDist?.[2]}</span>
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default TaskNode; 