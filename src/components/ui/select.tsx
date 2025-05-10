import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helpText?: string;
  fullWidth?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helpText, className, fullWidth = true, value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    return (
      <div className={`mb-4 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1" htmlFor={props.id}>
            {label}
          </label>
        )}
        <select
          className={twMerge(
            'px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white',
            error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700',
            className
          )}
          ref={ref}
          value={value}
          onChange={handleChange}
          {...props}
        >
          <option value="">Seleccionar...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {helpText && !error && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helpText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select'; 