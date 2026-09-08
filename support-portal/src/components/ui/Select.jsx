import React from 'react';
import { cn } from '../../lib/utils';

export function Select({ label, value, onChange, options = [], placeholder, className, disabled, required }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={cn('input', className)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
