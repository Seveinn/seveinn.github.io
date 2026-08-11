import { useState, useEffect } from 'react';
import { TileConfig } from './types';

interface ControlPanelProps {
  tiles: { [key: string]: TileConfig };
  onUpdateTileConfig: (type: string, property: 'cap' | 'cost', value: number) => void;
}

export default function ControlPanel({ tiles, onUpdateTileConfig }: ControlPanelProps) {
  const [values, setValues] = useState<{ [key: string]: { cap: number; cost: number } }>({});

  useEffect(() => {
    const initialValues: { [key: string]: { cap: number; cost: number } } = {};
    Object.keys(tiles).forEach(type => {
      initialValues[type] = {
        cap: tiles[type].cap,
        cost: tiles[type].cost
      };
    });
    setValues(initialValues);
  }, [tiles]);

  const handleValueChange = (type: string, property: 'cap' | 'cost', value: number) => {
    setValues(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [property]: value
      }
    }));
    onUpdateTileConfig(type, property, value);
  };

  return (
    <>
      {Object.keys(tiles).map(type => {
        const tile = tiles[type];
        const tileValues = values[type] || { cap: tile.cap, cost: tile.cost };
        
        return (
          <div key={type} className="control-item">
            <div className="control-header">
              <div className="control-icon" style={{ background: tile.color }}>
                {tile.name.charAt(0)}
              </div>
              <div className="control-info">
                <div className="control-name">{tile.name}</div>
                <div className="control-desc">{tile.desc}</div>
              </div>
            </div>
            <div className="control-fields">
              <div className="control-field">
                <span className="control-label">产出上限</span>
                <input
                  type="number"
                  className="control-input"
                  value={tileValues.cap}
                  min="1"
                  max="9999"
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    handleValueChange(type, 'cap', val);
                  }}
                />
                <span className="control-value">{tileValues.cap}</span>
              </div>
              <div className="control-field">
                <span className="control-label">购买金额</span>
                <input
                  type="number"
                  className="control-input"
                  value={tileValues.cost}
                  min="1"
                  max="9999"
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    handleValueChange(type, 'cost', val);
                  }}
                />
                <span className="control-value">{tileValues.cost} G</span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}



