import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { GridObject, GridImage } from '../data/places';
import { GRID_COLUMNS } from '../data/places';

interface PlacesGridProps {
  initialObjects: GridObject[];
  isDev?: boolean;
}

interface CellBounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

// Generate a placeholder color based on string hash
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 40%, 75%)`;
}

const ACCENT_COLORS = [
  '#4a90d9', '#9b59b6', '#27ae60', '#e74c3c', '#3498db',
  '#1abc9c', '#f39c12', '#e91e63', '#ff5722', '#607d8b',
  '#8bc34a', '#00bcd4', '#795548', '#9c27b0', '#673ab7'
];

// Calculate which cells an object occupies
function getObjectCells(obj: GridObject): Set<string> {
  const cells = new Set<string>();
  for (const img of obj.images) {
    const rowSpan = img.rowSpan || 1;
    const colSpan = img.colSpan || 1;
    for (let r = img.row; r < img.row + rowSpan; r++) {
      for (let c = img.col; c < img.col + colSpan; c++) {
        cells.add(`${r},${c}`);
      }
    }
  }
  return cells;
}

// Get bounding box of an object (min/max row/col)
function getObjectBounds(obj: GridObject): { minRow: number; maxRow: number; minCol: number; maxCol: number } {
  let minRow = Infinity, maxRow = 0, minCol = Infinity, maxCol = 0;
  for (const img of obj.images) {
    const rowSpan = img.rowSpan || 1;
    const colSpan = img.colSpan || 1;
    minRow = Math.min(minRow, img.row);
    maxRow = Math.max(maxRow, img.row + rowSpan - 1);
    minCol = Math.min(minCol, img.col);
    maxCol = Math.max(maxCol, img.col + colSpan - 1);
  }
  return { minRow, maxRow, minCol, maxCol };
}

// Move all images in an object by a delta
function moveObject(obj: GridObject, deltaRow: number, deltaCol: number): GridObject {
  return {
    ...obj,
    images: obj.images.map(img => ({
      ...img,
      row: img.row + deltaRow,
      col: img.col + deltaCol,
    }))
  };
}

// Check if two objects overlap
function objectsOverlap(obj1: GridObject, obj2: GridObject): boolean {
  const cells1 = getObjectCells(obj1);
  const cells2 = getObjectCells(obj2);
  for (const cell of cells1) {
    if (cells2.has(cell)) return true;
  }
  return false;
}

// Resolve collisions by pushing objects down/right
function resolveCollisions(objects: GridObject[], movedObjId: string): GridObject[] {
  let result = [...objects];
  let changed = true;
  let iterations = 0;
  const maxIterations = 100;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    const movedObj = result.find(o => o.id === movedObjId);
    if (!movedObj) break;

    for (let i = 0; i < result.length; i++) {
      const obj = result[i];
      if (obj.id === movedObjId) continue;

      if (objectsOverlap(movedObj, obj)) {
        // Push this object down by 1 row
        result[i] = moveObject(obj, 1, 0);
        changed = true;
      }
    }
  }

  // Ensure no object has negative or zero positions
  for (let i = 0; i < result.length; i++) {
    const bounds = getObjectBounds(result[i]);
    if (bounds.minRow < 1) {
      result[i] = moveObject(result[i], 1 - bounds.minRow, 0);
    }
    if (bounds.minCol < 1) {
      result[i] = moveObject(result[i], 0, 1 - bounds.minCol);
    }
  }

  return result;
}

// Calculate perimeter path for a set of grid cells
function calculatePerimeter(
  cells: Set<string>,
  cellBoundsMap: Map<string, CellBounds>,
  wrapperRect: DOMRect,
  padding: number = 3
): string {
  if (cells.size === 0) return '';

  type Edge = { x1: number; y1: number; x2: number; y2: number };
  const edges: Edge[] = [];

  for (const cellKey of cells) {
    const bounds = cellBoundsMap.get(cellKey);
    if (!bounds) continue;

    const [row, col] = cellKey.split(',').map(Number);
    const top = bounds.top - wrapperRect.top - padding;
    const left = bounds.left - wrapperRect.left - padding;
    const right = left + bounds.width + padding * 2;
    const bottom = top + bounds.height + padding * 2;

    if (!cells.has(`${row - 1},${col}`)) {
      edges.push({ x1: left, y1: top, x2: right, y2: top });
    }
    if (!cells.has(`${row + 1},${col}`)) {
      edges.push({ x1: left, y1: bottom, x2: right, y2: bottom });
    }
    if (!cells.has(`${row},${col - 1}`)) {
      edges.push({ x1: left, y1: top, x2: left, y2: bottom });
    }
    if (!cells.has(`${row},${col + 1}`)) {
      edges.push({ x1: right, y1: top, x2: right, y2: bottom });
    }
  }

  if (edges.length === 0) return '';

  const path: { x: number; y: number }[] = [];
  const usedEdges = new Set<number>();

  let currentEdge = edges[0];
  usedEdges.add(0);
  path.push({ x: currentEdge.x1, y: currentEdge.y1 });
  path.push({ x: currentEdge.x2, y: currentEdge.y2 });

  let currentPoint = { x: currentEdge.x2, y: currentEdge.y2 };
  const startPoint = { x: currentEdge.x1, y: currentEdge.y1 };

  let iterations = 0;
  const maxIterations = edges.length * 2;

  while (iterations < maxIterations) {
    iterations++;
    let foundNext = false;

    for (let i = 0; i < edges.length; i++) {
      if (usedEdges.has(i)) continue;

      const edge = edges[i];
      const tolerance = 1;

      if (Math.abs(edge.x1 - currentPoint.x) < tolerance && Math.abs(edge.y1 - currentPoint.y) < tolerance) {
        usedEdges.add(i);
        currentPoint = { x: edge.x2, y: edge.y2 };
        path.push(currentPoint);
        foundNext = true;
        break;
      } else if (Math.abs(edge.x2 - currentPoint.x) < tolerance && Math.abs(edge.y2 - currentPoint.y) < tolerance) {
        usedEdges.add(i);
        currentPoint = { x: edge.x1, y: edge.y1 };
        path.push(currentPoint);
        foundNext = true;
        break;
      }
    }

    if (!foundNext) break;
    if (Math.abs(currentPoint.x - startPoint.x) < 1 && Math.abs(currentPoint.y - startPoint.y) < 1) {
      break;
    }
  }

  if (path.length < 2) return '';

  let d = `M ${path[0].x} ${path[0].y}`;
  for (let i = 1; i < path.length; i++) {
    d += ` L ${path[i].x} ${path[i].y}`;
  }
  d += ' Z';

  return d;
}

export default function PlacesGrid({ initialObjects, isDev = false }: PlacesGridProps) {
  // State
  const [objects, setObjects] = useState<GridObject[]>(initialObjects);
  const [editMode, setEditMode] = useState(false);
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [perimeterPath, setPerimeterPath] = useState<string>('');
  const [perimeterColor, setPerimeterColor] = useState<string>('#222');
  const [gridRows, setGridRows] = useState(4);

  // Drag state
  const [draggingObjId, setDraggingObjId] = useState<string | null>(null);
  const [dragStartCell, setDragStartCell] = useState<{ row: number; col: number } | null>(null);
  const [dragPreviewDelta, setDragPreviewDelta] = useState<{ row: number; col: number } | null>(null);

  // Refs
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingCellRef = useRef<{ row: number; col: number } | null>(null);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    if (isDev && typeof window !== 'undefined') {
      const saved = localStorage.getItem('grid-objects-v2');
      if (saved) {
        try {
          setObjects(JSON.parse(saved));
        } catch { }
      }
    }
  }, [isDev]);

  // Save to localStorage in dev mode
  useEffect(() => {
    if (isDev && editMode && typeof window !== 'undefined') {
      localStorage.setItem('grid-objects-v2', JSON.stringify(objects));
    }
  }, [objects, isDev, editMode]);

  // Calculate max row from data
  const maxDataRow = useMemo(() => {
    let max = 0;
    for (const obj of objects) {
      for (const img of obj.images) {
        max = Math.max(max, img.row + (img.rowSpan || 1) - 1);
      }
    }
    return max;
  }, [objects]);

  useEffect(() => {
    setGridRows(Math.max(maxDataRow + (editMode ? 2 : 0), 4));
  }, [maxDataRow, editMode]);

  // Build maps
  const { imageMap, cellToObject } = useMemo(() => {
    const imgMap = new Map<string, { obj: GridObject; image: GridImage; imageIndex: number }>();
    const cellMap = new Map<string, GridObject>();

    for (const obj of objects) {
      obj.images.forEach((img, idx) => {
        const key = `${img.row},${img.col}`;
        imgMap.set(key, { obj, image: img, imageIndex: idx });

        // Mark all cells this image spans
        const rowSpan = img.rowSpan || 1;
        const colSpan = img.colSpan || 1;
        for (let r = img.row; r < img.row + rowSpan; r++) {
          for (let c = img.col; c < img.col + colSpan; c++) {
            cellMap.set(`${r},${c}`, obj);
          }
        }
      });
    }
    return { imageMap: imgMap, cellToObject: cellMap };
  }, [objects]);

  const selectedObject = objects.find(o => o.id === selectedObjectId);

  // Perimeter calculation
  const updatePerimeter = useCallback(() => {
    const targetId = editMode ? selectedObjectId : hoveredObjectId;
    if (!targetId || !wrapperRef.current) {
      setPerimeterPath('');
      return;
    }

    const obj = objects.find(o => o.id === targetId);
    if (!obj) {
      setPerimeterPath('');
      return;
    }

    const cells = getObjectCells(obj);
    const wrapperRect = wrapperRef.current.getBoundingClientRect();

    const cellBoundsMap = new Map<string, CellBounds>();
    for (const cellKey of cells) {
      const cellEl = cellRefs.current.get(cellKey);
      if (cellEl) {
        const rect = cellEl.getBoundingClientRect();
        cellBoundsMap.set(cellKey, {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    }

    const path = calculatePerimeter(cells, cellBoundsMap, wrapperRect, 3);
    setPerimeterPath(path);
    setPerimeterColor(obj.accentColor || '#222');
  }, [hoveredObjectId, selectedObjectId, objects, editMode]);

  useEffect(() => {
    updatePerimeter();
  }, [updatePerimeter]);

  useEffect(() => {
    const handleResize = () => updatePerimeter();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updatePerimeter]);

  // Get cell from mouse position
  const getCellFromPoint = useCallback((clientX: number, clientY: number): { row: number; col: number } | null => {
    if (!gridRef.current) return null;
    
    const gridRect = gridRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / GRID_COLUMNS;
    const cellHeight = cellWidth; // Square cells
    
    const col = Math.floor((clientX - gridRect.left) / cellWidth) + 1;
    const row = Math.floor((clientY - gridRect.top) / cellHeight) + 1;
    
    if (col < 1 || col > GRID_COLUMNS || row < 1) return null;
    
    return { row, col };
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent, objId: string, startRow: number, startCol: number) => {
    if (!editMode) return;
    e.preventDefault();
    
    setDraggingObjId(objId);
    setDragStartCell({ row: startRow, col: startCol });
    setSelectedObjectId(objId);
  }, [editMode]);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!draggingObjId || !dragStartCell) return;
    
    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    
    const deltaRow = cell.row - dragStartCell.row;
    const deltaCol = cell.col - dragStartCell.col;
    
    if (deltaRow !== dragPreviewDelta?.row || deltaCol !== dragPreviewDelta?.col) {
      setDragPreviewDelta({ row: deltaRow, col: deltaCol });
    }
  }, [draggingObjId, dragStartCell, dragPreviewDelta, getCellFromPoint]);

  const handleDragEnd = useCallback(() => {
    if (!draggingObjId || !dragPreviewDelta) {
      setDraggingObjId(null);
      setDragStartCell(null);
      setDragPreviewDelta(null);
      return;
    }

    const { row: deltaRow, col: deltaCol } = dragPreviewDelta;
    
    if (deltaRow === 0 && deltaCol === 0) {
      setDraggingObjId(null);
      setDragStartCell(null);
      setDragPreviewDelta(null);
      return;
    }

    setObjects(prev => {
      // Move the dragged object
      let newObjects = prev.map(obj => {
        if (obj.id === draggingObjId) {
          const moved = moveObject(obj, deltaRow, deltaCol);
          // Ensure it stays in bounds
          const bounds = getObjectBounds(moved);
          let adjustedDeltaRow = deltaRow;
          let adjustedDeltaCol = deltaCol;
          
          if (bounds.minRow < 1) adjustedDeltaRow -= (bounds.minRow - 1);
          if (bounds.minCol < 1) adjustedDeltaCol -= (bounds.minCol - 1);
          if (bounds.maxCol > GRID_COLUMNS) adjustedDeltaCol -= (bounds.maxCol - GRID_COLUMNS);
          
          return moveObject(obj, adjustedDeltaRow, adjustedDeltaCol);
        }
        return obj;
      });

      // Resolve any collisions
      newObjects = resolveCollisions(newObjects, draggingObjId);
      
      return newObjects;
    });

    setDraggingObjId(null);
    setDragStartCell(null);
    setDragPreviewDelta(null);
  }, [draggingObjId, dragPreviewDelta]);

  // Global mouse events for drag
  useEffect(() => {
    if (!draggingObjId) return;

    const handleMouseMove = (e: MouseEvent) => handleDragMove(e);
    const handleMouseUp = () => handleDragEnd();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingObjId, handleDragMove, handleDragEnd]);

  // Handlers
  const handleCellClick = (row: number, col: number) => {
    if (draggingObjId) return; // Don't handle click if we were dragging

    if (!editMode) {
      const obj = cellToObject.get(`${row},${col}`);
      if (obj?.link) {
        if (obj.link.startsWith('/')) {
          window.location.href = obj.link;
        } else {
          window.open(obj.link, '_blank');
        }
      }
      return;
    }

    // Edit mode
    const obj = cellToObject.get(`${row},${col}`);
    if (obj) {
      setSelectedObjectId(obj.id);
    } else {
      // Empty cell - add image
      pendingCellRef.current = { row, col };
      fileInputRef.current?.click();
    }
  };

  // Find an empty cell adjacent to an object, or the first available empty cell
  const findAvailableCellForObject = useCallback((objId: string): { row: number; col: number } | null => {
    const obj = objects.find(o => o.id === objId);
    if (!obj) return null;

    const occupiedCells = new Set<string>();
    for (const o of objects) {
      for (const cell of getObjectCells(o)) {
        occupiedCells.add(cell);
      }
    }

    // First, try to find a cell adjacent to the object
    const objCells = getObjectCells(obj);
    for (const cellKey of objCells) {
      const [row, col] = cellKey.split(',').map(Number);
      // Check all 4 adjacent cells
      const adjacent = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
      ];
      for (const adj of adjacent) {
        if (adj.row >= 1 && adj.col >= 1 && adj.col <= GRID_COLUMNS) {
          const key = `${adj.row},${adj.col}`;
          if (!occupiedCells.has(key)) {
            return adj;
          }
        }
      }
    }

    // If no adjacent cell, find first available cell in the grid
    for (let row = 1; row <= gridRows + 1; row++) {
      for (let col = 1; col <= GRID_COLUMNS; col++) {
        const key = `${row},${col}`;
        if (!occupiedCells.has(key)) {
          return { row, col };
        }
      }
    }

    // Fallback: add a new row
    return { row: gridRows + 1, col: 1 };
  }, [objects, gridRows]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use pending cell if set, otherwise find an available cell
    let cell = pendingCellRef.current;
    
    if (!cell && selectedObjectId) {
      // Find an adjacent cell for the selected object
      cell = findAvailableCellForObject(selectedObjectId);
    }
    
    if (!cell) {
      // Fallback: find any empty cell
      const occupiedCells = new Set<string>();
      for (const o of objects) {
        for (const c of getObjectCells(o)) {
          occupiedCells.add(c);
        }
      }
      for (let row = 1; row <= gridRows + 1; row++) {
        for (let col = 1; col <= GRID_COLUMNS; col++) {
          const key = `${row},${col}`;
          if (!occupiedCells.has(key)) {
            cell = { row, col };
            break;
          }
        }
        if (cell) break;
      }
    }

    if (!cell) {
      cell = { row: gridRows + 1, col: 1 };
    }

    const targetCell = cell;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;

      if (selectedObjectId) {
        // Add to existing object
        setObjects(prev => {
          let newObjects = prev.map(o => {
            if (o.id === selectedObjectId) {
              return {
                ...o,
                images: [...o.images, { src: dataUrl, row: targetCell.row, col: targetCell.col }]
              };
            }
            return o;
          });
          return resolveCollisions(newObjects, selectedObjectId);
        });
      } else {
        // Create new object
        const newId = `obj-${Date.now()}`;
        const newObj: GridObject = {
          id: newId,
          type: 'project',
          title: 'New Object',
          description: 'Click to edit',
          accentColor: ACCENT_COLORS[objects.length % ACCENT_COLORS.length],
          images: [{ src: dataUrl, row: targetCell.row, col: targetCell.col }]
        };
        setObjects(prev => resolveCollisions([...prev, newObj], newId));
        setSelectedObjectId(newId);
      }
      pendingCellRef.current = null;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUpdateObject = (id: string, updates: Partial<GridObject>) => {
    setObjects(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const handleDeleteObject = (id: string) => {
    setObjects(prev => prev.filter(o => o.id !== id));
    setSelectedObjectId(null);
  };

  const handleResizeImage = (objId: string, imageIndex: number, newRowSpan: number, newColSpan: number) => {
    setObjects(prev => {
      const newObjects = prev.map(o => {
        if (o.id !== objId) return o;
        const newImages = [...o.images];
        const img = newImages[imageIndex];
        
        // Check bounds
        if (img.col + newColSpan - 1 > GRID_COLUMNS) return o;
        
        newImages[imageIndex] = {
          ...img,
          rowSpan: newRowSpan,
          colSpan: newColSpan
        };
        return { ...o, images: newImages };
      });
      return resolveCollisions(newObjects, objId);
    });
  };

  const handleDeleteImage = (objId: string, imageIndex: number) => {
    setObjects(prev => prev.map(o => {
      if (o.id !== objId) return o;
      const newImages = o.images.filter((_, i) => i !== imageIndex);
      return { ...o, images: newImages };
    }).filter(o => o.images.length > 0));
  };

  const copyDataToClipboard = () => {
    const code = `export const gridObjects: GridObject[] = ${JSON.stringify(objects, null, 2)};`;
    navigator.clipboard.writeText(code);
    alert('Data copied to clipboard!');
  };

  const resetData = () => {
    if (confirm('Reset to original data?')) {
      setObjects(initialObjects);
      localStorage.removeItem('grid-objects-v2');
      setSelectedObjectId(null);
    }
  };

  const OUTLINE_PADDING = 6;

  return (
    <div className="places-grid-container">
      {isDev && (
        <div className="edit-controls">
          <button
            className={`edit-mode-btn ${editMode ? 'active' : ''}`}
            onClick={() => {
              setEditMode(!editMode);
              if (editMode) setSelectedObjectId(null);
            }}
          >
            {editMode ? 'Done Editing' : 'Edit Grid'}
          </button>
          {editMode && (
            <>
              <button className="edit-mode-btn secondary" onClick={copyDataToClipboard}>
                Copy Data
              </button>
              <button className="edit-mode-btn secondary" onClick={resetData}>
                Reset
              </button>
            </>
          )}
        </div>
      )}

      <div className="grid-with-panel">
        <div ref={wrapperRef} className="places-grid-wrapper" style={{ padding: OUTLINE_PADDING }}>
          <svg
            className="perimeter-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 10,
              overflow: 'visible',
            }}
          >
            {perimeterPath && (
              <path
                d={perimeterPath}
                fill="none"
                stroke={perimeterColor}
                strokeWidth="3"
                strokeLinejoin="round"
              />
            )}
          </svg>

          <div
            ref={gridRef}
            className={`places-grid ${draggingObjId ? 'dragging' : ''}`}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
              gridAutoRows: '1fr',
              gap: '4px',
            }}
          >
            {/* Render all grid cells */}
            {Array.from({ length: gridRows * GRID_COLUMNS }).map((_, idx) => {
              const row = Math.floor(idx / GRID_COLUMNS) + 1;
              const col = (idx % GRID_COLUMNS) + 1;
              const cellKey = `${row},${col}`;
              const imageData = imageMap.get(cellKey);
              const cellObj = cellToObject.get(cellKey);

              // Skip cells that are covered by a spanning image (but not the origin)
              if (cellObj && !imageData) {
                return null;
              }

              const isHovered = cellObj && hoveredObjectId === cellObj.id;
              const isSelected = cellObj && selectedObjectId === cellObj.id;
              const isDragging = cellObj && draggingObjId === cellObj.id;
              const hasLink = !!cellObj?.link;

              if (imageData) {
                const { obj, image, imageIndex } = imageData;
                const rowSpan = image.rowSpan || 1;
                const colSpan = image.colSpan || 1;

                // Calculate drag preview position
                let displayRow = image.row;
                let displayCol = image.col;
                if (isDragging && dragPreviewDelta) {
                  displayRow += dragPreviewDelta.row;
                  displayCol += dragPreviewDelta.col;
                  // Clamp to bounds
                  if (displayCol < 1) displayCol = 1;
                  if (displayCol + colSpan - 1 > GRID_COLUMNS) displayCol = GRID_COLUMNS - colSpan + 1;
                  if (displayRow < 1) displayRow = 1;
                }

                return (
                  <div
                    key={cellKey}
                    ref={(el) => {
                      if (el) {
                        for (let r = image.row; r < image.row + rowSpan; r++) {
                          for (let c = image.col; c < image.col + colSpan; c++) {
                            cellRefs.current.set(`${r},${c}`, el);
                          }
                        }
                      }
                    }}
                    className={`grid-cell ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging-item' : ''} ${hasLink && !editMode ? 'clickable' : ''}`}
                    style={{
                      gridRow: isDragging && dragPreviewDelta ? `${displayRow} / span ${rowSpan}` : `${image.row} / span ${rowSpan}`,
                      gridColumn: isDragging && dragPreviewDelta ? `${displayCol} / span ${colSpan}` : `${image.col} / span ${colSpan}`,
                      position: 'relative',
                      aspectRatio: colSpan === rowSpan ? '1' : `${colSpan}/${rowSpan}`,
                      overflow: 'hidden',
                      cursor: editMode ? (isDragging ? 'grabbing' : 'grab') : (hasLink ? 'pointer' : 'default'),
                      opacity: isDragging ? 0.8 : 1,
                      zIndex: isDragging ? 100 : undefined,
                      transition: isDragging ? 'none' : 'opacity 0.15s ease',
                    }}
                    onMouseEnter={() => !editMode && setHoveredObjectId(obj.id)}
                    onMouseLeave={() => !editMode && setHoveredObjectId(null)}
                    onMouseDown={(e) => editMode && handleDragStart(e, obj.id, image.row, image.col)}
                    onClick={() => !draggingObjId && handleCellClick(image.row, image.col)}
                  >
                    <img
                      src={image.src}
                      alt={obj.title}
                      draggable={false}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        transition: 'transform 0.2s ease',
                        transform: isHovered && !editMode ? 'scale(1.05)' : 'scale(1)',
                        backgroundColor: stringToColor(obj.id),
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.visibility = 'hidden';
                      }}
                    />

                    {/* Hover info overlay */}
                    {!editMode && image === obj.images[0] && (
                      <div
                        className="info-overlay"
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: '12px',
                          paddingTop: '40px',
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                          color: 'white',
                          zIndex: 5,
                          opacity: isHovered ? 1 : 0,
                          transform: isHovered ? 'translateY(0)' : 'translateY(10px)',
                          transition: 'opacity 0.2s ease, transform 0.2s ease',
                          pointerEvents: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{obj.title}</h3>
                          <span style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase' }}>{obj.type}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9, lineHeight: 1.3 }}>
                          {obj.description}
                        </p>
                        {obj.link && (
                          <span style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '4px', display: 'block' }}>
                            Click to visit
                          </span>
                        )}
                      </div>
                    )}

                    {/* For non-primary images, show title on hover */}
                    {!editMode && image !== obj.images[0] && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          left: '8px',
                          background: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          borderRadius: '2px',
                          opacity: isHovered ? 1 : 0,
                          transition: 'opacity 0.2s ease',
                          pointerEvents: 'none',
                        }}
                      >
                        {obj.title}
                      </div>
                    )}

                    {/* Edit mode: resize handles */}
                    {editMode && isSelected && !isDragging && (
                      <div className="resize-controls" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="size-buttons">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleResizeImage(obj.id, imageIndex, rowSpan, Math.min(3, colSpan + 1)); }}
                            disabled={colSpan >= 3 || image.col + colSpan > GRID_COLUMNS}
                            title="Expand right"
                          >→</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleResizeImage(obj.id, imageIndex, rowSpan, Math.max(1, colSpan - 1)); }}
                            disabled={colSpan <= 1}
                            title="Shrink width"
                          >←</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleResizeImage(obj.id, imageIndex, Math.min(3, rowSpan + 1), colSpan); }}
                            disabled={rowSpan >= 3}
                            title="Expand down"
                          >↓</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleResizeImage(obj.id, imageIndex, Math.max(1, rowSpan - 1), colSpan); }}
                            disabled={rowSpan <= 1}
                            title="Shrink height"
                          >↑</button>
                        </div>
                        <button
                          className="delete-image-btn"
                          onClick={(e) => { e.stopPropagation(); handleDeleteImage(obj.id, imageIndex); }}
                          title="Delete image"
                        >×</button>
                      </div>
                    )}

                    {/* Drag hint */}
                    {editMode && isSelected && !isDragging && (
                      <div className="drag-hint">Drag to move</div>
                    )}
                  </div>
                );
              }

              // Empty cell (only in edit mode, and only if truly empty)
              if (editMode && !cellObj) {
                return (
                  <div
                    key={cellKey}
                    ref={(el) => { if (el) cellRefs.current.set(cellKey, el); }}
                    className={`grid-cell empty ${selectedObjectId ? 'add-to-selected' : ''}`}
                    style={{
                      gridRow: `${row} / span 1`,
                      gridColumn: `${col} / span 1`,
                      aspectRatio: '1',
                    }}
                    onClick={() => handleCellClick(row, col)}
                  >
                    <span className="empty-label">{selectedObjectId ? '+' : '+'}</span>
                    {selectedObjectId && <span className="empty-hint">Add to selected</span>}
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>

        {/* Edit panel */}
        {editMode && selectedObject && (
          <div className="edit-panel">
            <h3>Edit Object</h3>
            <div className="form-group">
              <label>Type</label>
              <select
                value={selectedObject.type}
                onChange={(e) => handleUpdateObject(selectedObject.id, { type: e.target.value as 'place' | 'project' })}
              >
                <option value="place">Place</option>
                <option value="project">Project</option>
              </select>
            </div>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={selectedObject.title}
                onChange={(e) => handleUpdateObject(selectedObject.id, { title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={selectedObject.description}
                onChange={(e) => handleUpdateObject(selectedObject.id, { description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Link (optional)</label>
              <input
                type="text"
                value={selectedObject.link || ''}
                onChange={(e) => handleUpdateObject(selectedObject.id, { link: e.target.value || undefined })}
                placeholder="https://... or /page"
              />
            </div>
            <div className="form-group">
              <label>Accent Color</label>
              <input
                type="color"
                value={selectedObject.accentColor || '#222222'}
                onChange={(e) => handleUpdateObject(selectedObject.id, { accentColor: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Images: {selectedObject.images.length}</label>
              <div className="image-list">
                {selectedObject.images.map((img, idx) => (
                  <div key={idx} className="image-list-item">
                    <span className="image-path" title={img.src}>
                      {img.src.startsWith('data:') ? `[uploaded image ${idx + 1}]` : img.src}
                    </span>
                    <span className="image-pos">({img.row},{img.col})</span>
                  </div>
                ))}
              </div>
              <button 
                className="btn-add-image"
                onClick={() => fileInputRef.current?.click()}
              >
                + Add Image to This Object
              </button>
              <p className="hint">Or click any empty cell (+) in the grid.</p>
            </div>
            <div className="panel-actions">
              <button className="btn-danger" onClick={() => handleDeleteObject(selectedObject.id)}>
                Delete Object
              </button>
              <button className="btn-secondary" onClick={() => setSelectedObjectId(null)}>
                Deselect
              </button>
            </div>
          </div>
        )}

        {editMode && !selectedObject && (
          <div className="edit-panel">
            <h3>Edit Mode</h3>
            <p>Click an image to select its object.</p>
            <p>Drag an image to move the entire object.</p>
            <p>Click an empty cell (+) to add a new image.</p>
            <p className="hint">If an object is selected, the new image will be added to it. Otherwise, a new object is created.</p>
            <p className="hint">Objects will automatically shift to avoid overlapping.</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      <style>{`
        .places-grid-container {
          width: 100%;
        }

        .edit-controls {
          display: flex;
          gap: 8px;
          margin-bottom: 1rem;
        }

        .edit-mode-btn {
          padding: 8px 16px;
          background: #222;
          color: white;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.85rem;
        }

        .edit-mode-btn:hover {
          background: #444;
        }

        .edit-mode-btn.active {
          background: #27ae60;
        }

        .edit-mode-btn.secondary {
          background: #666;
        }

        .grid-with-panel {
          display: flex;
          gap: 20px;
        }

        .places-grid-wrapper {
          position: relative;
          flex: 1;
          max-width: 600px;
        }

        .places-grid {
          position: relative;
        }

        .places-grid.dragging {
          cursor: grabbing;
        }

        .grid-cell {
          transition: box-shadow 0.15s ease;
          min-height: 0;
        }

        .grid-cell.hovered,
        .grid-cell.selected {
          z-index: 5;
        }

        .grid-cell.selected {
          outline: 2px solid #222;
          outline-offset: 2px;
        }

        .grid-cell.dragging-item {
          outline: 2px dashed #27ae60;
          outline-offset: 2px;
        }

        .grid-cell.clickable:hover {
          cursor: pointer;
        }

        .grid-cell.empty {
          border: 2px dashed #ccc;
          background: #fafafa;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .grid-cell.empty:hover {
          background: #f0f0f0;
          border-color: #999;
        }

        .grid-cell.empty.add-to-selected {
          border-color: #27ae60;
          background: rgba(39, 174, 96, 0.1);
        }

        .grid-cell.empty.add-to-selected:hover {
          background: rgba(39, 174, 96, 0.2);
          border-color: #219a52;
        }

        .empty-label {
          font-size: 2rem;
          color: #ccc;
          font-weight: 300;
        }

        .grid-cell.empty:hover .empty-label {
          color: #666;
        }

        .grid-cell.empty.add-to-selected .empty-label {
          color: #27ae60;
        }

        .empty-hint {
          font-size: 0.6rem;
          color: #27ae60;
          margin-top: 4px;
        }

        .resize-controls {
          position: absolute;
          top: 4px;
          right: 4px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 20;
        }

        .size-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
        }

        .size-buttons button {
          width: 24px;
          height: 24px;
          border: none;
          background: rgba(0,0,0,0.7);
          color: white;
          cursor: pointer;
          font-size: 12px;
          border-radius: 2px;
        }

        .size-buttons button:hover:not(:disabled) {
          background: rgba(0,0,0,0.9);
        }

        .size-buttons button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .delete-image-btn {
          width: 100%;
          height: 24px;
          border: none;
          background: #e74c3c;
          color: white;
          cursor: pointer;
          font-size: 16px;
          border-radius: 2px;
        }

        .delete-image-btn:hover {
          background: #c0392b;
        }

        .drag-hint {
          position: absolute;
          bottom: 4px;
          left: 4px;
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 2px 6px;
          font-size: 0.65rem;
          border-radius: 2px;
          pointer-events: none;
        }

        .edit-panel {
          width: 280px;
          padding: 16px;
          background: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
          align-self: flex-start;
        }

        .edit-panel h3 {
          margin: 0 0 16px 0;
          font-size: 1rem;
        }

        .edit-panel p {
          margin: 0 0 8px 0;
          color: #666;
        }

        .form-group {
          margin-bottom: 12px;
        }

        .form-group label {
          display: block;
          font-size: 0.8rem;
          color: #666;
          margin-bottom: 4px;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
          font-size: 0.85rem;
          box-sizing: border-box;
        }

        .form-group input[type="color"] {
          height: 36px;
          padding: 2px;
          cursor: pointer;
        }

        .hint {
          font-size: 0.75rem;
          color: #999;
        }

        .image-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin: 8px 0;
          max-height: 150px;
          overflow-y: auto;
        }

        .image-list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 8px;
          background: #f0f0f0;
          border-radius: 3px;
          font-size: 0.75rem;
        }

        .image-path {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #555;
          font-family: monospace;
        }

        .image-pos {
          color: #999;
          margin-left: 8px;
          flex-shrink: 0;
        }

        .btn-add-image {
          width: 100%;
          padding: 8px;
          margin-top: 8px;
          background: #27ae60;
          color: white;
          border: none;
          cursor: pointer;
          border-radius: 4px;
          font-family: inherit;
          font-size: 0.85rem;
        }

        .btn-add-image:hover {
          background: #219a52;
        }

        .panel-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 16px;
        }

        .btn-danger {
          padding: 8px;
          background: #e74c3c;
          color: white;
          border: none;
          cursor: pointer;
          border-radius: 4px;
          font-family: inherit;
        }

        .btn-secondary {
          padding: 8px;
          background: #eee;
          color: #333;
          border: none;
          cursor: pointer;
          border-radius: 4px;
          font-family: inherit;
        }

        @media (max-width: 800px) {
          .grid-with-panel {
            flex-direction: column;
          }

          .places-grid-wrapper {
            max-width: 100%;
          }

          .edit-panel {
            width: 100%;
          }
        }

        @media (max-width: 600px) {
          .places-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .info-overlay p {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
