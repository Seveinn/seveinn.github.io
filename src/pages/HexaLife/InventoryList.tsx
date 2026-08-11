import { useState } from 'react';
import { ResourceConfig } from './types';

interface InventoryListProps {
  resources: { [key: string]: ResourceConfig };
  inventory: { [key: string]: number };
  expandedResource: string | null;
  onToggleResource: (key: string) => void;
  onSellItem: (key: string, amount: number) => void;
}

export default function InventoryList({
  resources,
  inventory,
  expandedResource,
  onToggleResource,
  onSellItem
}: InventoryListProps) {
  const [sellAmounts, setSellAmounts] = useState<{ [key: string]: number }>({});

  const handleSellAmountChange = (key: string, value: number) => {
    setSellAmounts(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      {Object.keys(resources).map(key => {
        const count = inventory[key];
        const conf = resources[key];
        if (count === 0 && expandedResource !== key) return null;
        
        const isExpanded = expandedResource === key;
        const sellAmount = sellAmounts[key] ?? Math.ceil(count / 2);
        
        return (
          <div key={key} className="inv-item" style={{ display: count === 0 ? 'none' : 'block' }}>
            <div className="inv-header" onClick={() => onToggleResource(key)}>
              <div className="inv-icon">{conf.icon}</div>
              <div className="inv-info">
                <div className="inv-name">{conf.name}</div>
                <div className="inv-price">{conf.price} G</div>
              </div>
              <div className="inv-count">x{count}</div>
            </div>
            {isExpanded && count > 0 && (
              <div className="sell-controls active">
                <div className="range-wrapper">
                  <span style={{ fontSize: '12px', color: '#aaa' }}>0</span>
                  <input
                    type="range"
                    min="1"
                    max={count}
                    value={sellAmount}
                    onChange={(e) => handleSellAmountChange(key, parseInt(e.target.value))}
                  />
                  <span style={{ fontSize: '12px', color: '#aaa' }}>{count}</span>
                </div>
                <div className="sell-actions">
                  <span className="sell-preview">预计: {sellAmount * conf.price} G</span>
                  <button className="btn-sell" onClick={() => onSellItem(key, sellAmount)}>
                    确认出售
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}



