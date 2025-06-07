import { Handle, Position, type NodeProps, type Node, useReactFlow, useNodeConnections, useNodesData } from '@xyflow/react';
import { useEffect } from 'react';
import type TaskNode from './TaskNode';
import { timeToCertainty } from '../utils/lognormal';

type ProjectNodeData = Node<{
  title: string;
  description: string;
  hours: number;
  ectDist?: number[];
}, 'project'>

const ProjectNode = ({ data, id}: NodeProps<ProjectNodeData>) => {
    const { updateNodeData } = useReactFlow();
    const childrenConnections = useNodeConnections({id, handleType: 'source'})
    const childrenData = useNodesData<TaskNode>(childrenConnections.map((connection) => connection.target))

    useEffect(() => {
        if (childrenData.length > 0) {
            const totalHours = childrenData.reduce((acc, child) => 
                acc + child.data.hours, 0);
            updateNodeData(id, {hours: totalHours});
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
    <div className="project-node">
      <div className="project-node-content">
        <h3 className="project-title">{data.title}</h3>
        {data.description && (
          <p className="project-description">{data.description}</p>
        )}
        <p>
          {data.hours}h | <span style={{color: 'red'}}>{data.ectDist?.[0]}</span> | <span style={{color: 'orange'}}>{data.ectDist?.[1]}</span> | <span style={{color: 'green'}}>{data.ectDist?.[2]}</span>
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default ProjectNode; 