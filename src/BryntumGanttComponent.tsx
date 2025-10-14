import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { BryntumGantt } from '@bryntum/gantt-react';
import { ganttConfig } from './ganttConfig';
import { TaskModel } from '@bryntum/gantt';

interface GanttState {
    tasks: TaskModel[];
}

const BryntumGanttComponent = ({ updateCallback }) => {
    const gantt = useRef(null);
    const [state, setState] = useState<GanttState>({ tasks: [] });

    useEffect(() => {
        updateCallback(setState);
    }, [updateCallback]);

    const GanttComponent = BryntumGantt as any;
    
    return (
        <GanttComponent
            ref={gantt}
            tasks={state.tasks}
            {...ganttConfig}
        />
    );
};

export default BryntumGanttComponent;