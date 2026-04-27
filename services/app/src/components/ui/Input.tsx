import React, { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

// On utilise forwardRef pour que react-hook-form puisse "saisir" l'input
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    const inputId = props.id || props.name

    return (
      <div className="flex flex-col w-full group">
        {label && (
          <label
            htmlFor={inputId}
            className={`text-xs mb-1 ml-1 font-bold uppercase tracking-widest transition-colors
              ${error ? 'text-error' : 'text-main opacity-50 group-focus-within:opacity-100'}`}
          >
            {label}
          </label>
        )}

        <input
          {...props}
          ref={ref} // CRUCIAL pour react-hook-form
          id={inputId}
          className={`
            w-full py-2 px-1 bg-transparent
            border-0 border-b-2 
            text-text placeholder:text-sub/40
            focus:ring-0 focus:outline-none 
            transition-all duration-200
            
            /* État normal vs Erreur */
            ${error
              ? 'border-error text-error'
              : 'border-main/30 focus:border-main'}
            
            ${className}
          `}
        />

        {error && (
          <span className="text-error text-[10px] mt-1 italic ml-1 animate-pulse">
            {error}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input' // Bonne pratique pour le debug React
