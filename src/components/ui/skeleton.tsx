import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "circular" | "text" | "rectangular";
  width?: string;
  height?: string;
  color?: "blue" | "green" | "red" | "amber" | "purple" | "gray";
  animated?: boolean;
}

export function Skeleton({
  className,
  variant = "default",
  width,
  height,
  color = "blue",
  animated = true,
  ...props
}: SkeletonProps & React.HTMLAttributes<HTMLDivElement>) {
  
  // Mapeo de colores a clases de gradiente
  const colorGradientMap = {
    blue: "bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 dark:from-blue-900/20 dark:via-blue-800/30 dark:to-blue-900/20",
    green: "bg-gradient-to-r from-green-100 via-green-200 to-green-100 dark:from-green-900/20 dark:via-green-800/30 dark:to-green-900/20",
    red: "bg-gradient-to-r from-red-100 via-red-200 to-red-100 dark:from-red-900/20 dark:via-red-800/30 dark:to-red-900/20",
    amber: "bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 dark:from-amber-900/20 dark:via-amber-800/30 dark:to-amber-900/20",
    purple: "bg-gradient-to-r from-purple-100 via-purple-200 to-purple-100 dark:from-purple-900/20 dark:via-purple-800/30 dark:to-purple-900/20",
    gray: "bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-gray-800/20 dark:via-gray-700/30 dark:to-gray-800/20"
  };
  
  // Mapeo de variantes a clases específicas
  const variantClassMap = {
    default: "",
    circular: "rounded-full",
    text: "h-5 rounded-md",
    rectangular: "rounded-md"
  };
  
  // Clases de animación
  const animationClasses = animated ? "animate-pulse relative overflow-hidden" : "";
  
  // Clases para dimensiones
  const dimensionClasses = {
    width: width || (variant === 'text' ? 'w-24' : 'w-full'),
    height: height || (variant === 'circular' ? 'h-10' : variant === 'text' ? 'h-5' : 'h-10')
  };

  return (
    <div
      className={cn(
        colorGradientMap[color], 
        variantClassMap[variant],
        animationClasses,
        dimensionClasses.width,
        dimensionClasses.height,
        className
      )}
      {...props}
    >
      {animated && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
      )}
    </div>
  );
}

// Componente para un skeleton de tabla de filas
export function TableRowsSkeleton({ 
  rows = 3, 
  columns = 4,
  className,
  color = "blue",
  showAvatar = false,
  avatarSize = "w-10 h-10"
}: { 
  rows?: number; 
  columns?: number;
  className?: string;
  color?: "blue" | "green" | "red" | "amber" | "purple" | "gray";
  showAvatar?: boolean;
  avatarSize?: string;
}) {
  return (
    <div className={cn("divide-y divide-gray-100 dark:divide-gray-800", className)}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4 flex items-center space-x-4">
          {showAvatar && (
            <Skeleton 
              variant="circular" 
              className={avatarSize}
              color={color}
            />
          )}
          <div className="flex-1 space-y-3">
            <div className="flex justify-between">
              <Skeleton variant="text" width="w-1/3" color={color} />
              <Skeleton variant="text" width="w-1/5" color={color} />
            </div>
            <div className="flex space-x-4">
              {Array.from({ length: columns - 1 }).map((_, colIndex) => (
                <Skeleton 
                  key={colIndex} 
                  variant="text" 
                  width={`w-${Math.floor(24 / columns)}/12`} 
                  color={color}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Componente para skeleton de tarjetas
export function CardSkeleton({
  className,
  color = "blue",
  hasHeader = true,
  hasFooter = false,
  contentRows = 3
}: {
  className?: string;
  color?: "blue" | "green" | "red" | "amber" | "purple" | "gray";
  hasHeader?: boolean;
  hasFooter?: boolean;
  contentRows?: number;
}) {
  return (
    <div className={cn("rounded-lg border p-4 space-y-4", className)}>
      {hasHeader && (
        <div className="flex justify-between items-center">
          <Skeleton variant="text" width="w-1/3" color={color} />
          <Skeleton variant="circular" width="w-8" height="h-8" color={color} />
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: contentRows }).map((_, index) => (
          <Skeleton 
            key={index} 
            variant="text" 
            width={`w-${[4, 3, 5, 2][index % 4]}/5`} 
            color={color}
          />
        ))}
      </div>
      
      {hasFooter && (
        <div className="flex justify-between items-center pt-2">
          <Skeleton variant="text" width="w-1/4" color={color} />
          <Skeleton variant="rectangular" width="w-1/4" height="h-8" color={color} />
        </div>
      )}
    </div>
  );
} 