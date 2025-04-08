import { useEffect, useState } from 'react';
import { Droppable, DroppableProps, DroppableProvided, DroppableStateSnapshot } from 'react-beautiful-dnd';

type StrictModeDroppableProps = Omit<DroppableProps, 'children'> & {
    children: (provided: DroppableProvided, snapshot: DroppableStateSnapshot) => React.ReactElement;
};

export const StrictModeDroppable = ({
    children,
    droppableId,
    type = 'DEFAULT',
    ...props
}: StrictModeDroppableProps) => {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const animation = requestAnimationFrame(() => setEnabled(true));
        return () => {
            cancelAnimationFrame(animation);
            setEnabled(false);
        };
    }, []);

    if (!enabled) {
        return null;
    }

    return (
        <Droppable droppableId={droppableId} type={type} {...props}>
            {(provided, snapshot) => children(provided, snapshot)}
        </Droppable>
    );
}; 