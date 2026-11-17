import React from 'react';
import { Search, X } from 'lucide-react';

const CONTROL_BASE =
  'w-full rounded-xl border border-[#104E35]/22 bg-[#F4F8F5] px-3.5 py-2.5 text-sm text-[#091911] placeholder:text-[#355243]/65 transition-colors focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2A6F52]/40 dark:bg-[#050A07] dark:text-[#DDF2E7] dark:placeholder:text-[#8EAD9E]/60 dark:focus:border-[#34D399]';

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}

const FieldWrapper: React.FC<FieldWrapperProps> = ({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}) => (
  <div className="space-y-1.5">
    {label && (
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold text-[#466153] dark:text-[#8EAD9E]"
      >
        {label}
        {required && <span className="ml-0.5 text-[#F97362]">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-xs font-medium text-[#F97362]">{error}</p>
    ) : hint ? (
      <p className="text-[11px] text-[#466153]/85 dark:text-[#8EAD9E]/80">{hint}</p>
    ) : null}
  </div>
);

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftIcon, className = '', id, required, ...rest }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    return (
      <FieldWrapper label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#466153] dark:text-[#8EAD9E]">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            required={required}
            className={`${CONTROL_BASE} ${leftIcon ? 'pl-10' : ''} ${error ? 'border-[#F97362]' : ''} ${className}`}
            {...rest}
          />
        </div>
      </FieldWrapper>
    );
  },
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className = '', id, required, ...rest }, ref) => {
    const generatedId = React.useId();
    const areaId = id || generatedId;
    return (
      <FieldWrapper label={label} hint={hint} error={error} required={required} htmlFor={areaId}>
        <textarea
          ref={ref}
          id={areaId}
          required={required}
          className={`${CONTROL_BASE} ${error ? 'border-[#F97362]' : ''} ${className}`}
          {...rest}
        />
      </FieldWrapper>
    );
  },
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, options, className = '', id, required, children, ...rest }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    return (
      <FieldWrapper label={label} hint={hint} error={error} required={required} htmlFor={selectId}>
        <select
          ref={ref}
          id={selectId}
          required={required}
          className={`${CONTROL_BASE} ${error ? 'border-[#F97362]' : ''} ${className}`}
          {...rest}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
      </FieldWrapper>
    );
  },
);
Select.displayName = 'Select';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  ariaLabel = 'Search',
}) => (
  <div className={`relative ${className}`}>
    <Search
      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#059669] dark:text-[#34D399]"
      aria-hidden="true"
    />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={`${CONTROL_BASE} pl-10 pr-9`}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Clear search"
        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-[#466153] hover:bg-[#E8EFEA] dark:text-[#8EAD9E] dark:hover:bg-[#10B981]/15"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, className = '', ...rest }) => (
  <label className={`flex cursor-pointer items-start gap-2.5 text-xs text-[#466153] dark:text-[#8EAD9E] ${className}`}>
    <input
      type="checkbox"
      className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#104E35]/30 accent-[#10B981] focus:ring-2 focus:ring-[#10B981]/40"
      {...rest}
    />
    <span className="leading-relaxed">{label}</span>
  </label>
);

interface RadioGroupProps {
  label?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; description?: string }>;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  name,
  value,
  onChange,
  options,
}) => (
  <div className="space-y-2">
    {label && (
      <div className="text-xs font-semibold text-[#466153] dark:text-[#8EAD9E]">{label}</div>
    )}
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors ${
              active
                ? 'border-[#059669]/60 bg-[#10B981]/10 dark:border-[#34D399]/55 dark:bg-[#10B981]/12'
                : 'border-[#104E35]/18 bg-[#E8F0EB] hover:border-[#059669]/40 dark:border-[#2A6F52]/38 dark:bg-[#050A07]'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={active}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 accent-[#10B981]"
            />
            <div>
              <div className="text-xs font-bold text-[#09140E] dark:text-[#ECFDF5]">{opt.label}</div>
              {opt.description && (
                <div className="mt-0.5 text-[11px] text-[#466153] dark:text-[#8EAD9E]">
                  {opt.description}
                </div>
              )}
            </div>
          </label>
        );
      })}
    </div>
  </div>
);
