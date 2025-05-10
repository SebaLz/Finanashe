import React, { InputHTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, className, fullWidth = true, ...props }, ref) => {
    return (
      <div className={`mb-4 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1" htmlFor={props.id}>
            {label}
          </label>
        )}
        <input
          className={twMerge(
            'px-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white',
            error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {helpText && !error && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helpText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input'; 