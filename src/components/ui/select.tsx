import React, { SelectHTMLAttributes, forwardRef, useState, useRef, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, Search } from 'lucide-react';
import { Input } from './input';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  endAdornment?: React.ReactNode;
}

export function Select({ 
  label, 
  options, 
  value, 
  onChange, 
  required = false, 
  className,
  endAdornment,
  ...props 
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Encontrar la opción seleccionada
  const selectedOption = options.find(option => option.value === value);

  // Filtrar opciones por término de búsqueda
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Enfocar el input de búsqueda al abrir el dropdown
  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => {
        searchRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Manejar clic fuera del select para cerrarlo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cerrar al hacer escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Ajustar la posición del dropdown
  useEffect(() => {
    if (isOpen && dropdownRef.current && selectRef.current) {
      const selectRect = selectRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Calcular si hay suficiente espacio debajo
      const spaceBelow = viewportHeight - selectRect.bottom;
      const dropdownHeight = Math.min(
        filteredOptions.length * 36 + 60, // altura estimada basada en elementos + buscador
        240 // altura máxima
      );
      
      // Si no hay suficiente espacio abajo, mostrar arriba
      if (spaceBelow < dropdownHeight && selectRect.top > dropdownHeight) {
        dropdownRef.current.style.bottom = '100%';
        dropdownRef.current.style.top = 'auto';
        dropdownRef.current.style.marginBottom = '4px';
        dropdownRef.current.style.marginTop = '0';
      } else {
        dropdownRef.current.style.top = '100%';
        dropdownRef.current.style.bottom = 'auto';
        dropdownRef.current.style.marginTop = '4px';
        dropdownRef.current.style.marginBottom = '0';
      }
      
      // Asegurar que el dropdown no se salga por la derecha
      if (selectRect.right + 20 > viewportWidth) {
        dropdownRef.current.style.right = '0';
        dropdownRef.current.style.left = 'auto';
      } else {
        dropdownRef.current.style.left = '0';
        dropdownRef.current.style.right = 'auto';
      }
    }
  }, [isOpen, filteredOptions.length]);

  return (
    <div className={`relative ${label ? 'mb-4' : ''} ${className}`}>
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative select-dropdown-container" ref={selectRef}>
        <div 
          className={twMerge(
            "relative flex items-center justify-between w-full px-3 py-2 border rounded-md cursor-pointer bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-colors", 
            className
          )}
          onClick={() => setIsOpen(!isOpen)}
          style={{ minHeight: '48px' }}
        >
          <div className="flex-1 mr-2 truncate">
            {selectedOption ? selectedOption.label : 'Seleccionar...'}
          </div>
          <div className="flex items-center">
            {endAdornment}
            <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
          </div>
        </div>
        
        {isOpen && (
          <div 
            ref={dropdownRef}
            className="fixed sm:absolute z-[100] w-full sm:mt-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg"
            style={{ 
              minWidth: '100%', 
              maxWidth: '300px',
              maxHeight: typeof window !== 'undefined' ? window.innerHeight * 0.4 : 300,
              overflow: 'hidden'
            }}
          >
            <div className="p-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  ref={searchRef}
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 py-1.5 h-8 w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: typeof window !== 'undefined' ? window.innerHeight * 0.3 : 200 }}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div 
                    key={option.value} 
                    className={`px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                      option.value === value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(option.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    {option.label}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-gray-500 text-center">
                  No se encontraron opciones
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Select.displayName = 'Select'; 