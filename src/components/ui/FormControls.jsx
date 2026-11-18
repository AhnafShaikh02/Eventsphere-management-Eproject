import React from 'react';
import { Search, X } from 'lucide-react';

const CONTROL_BASE =
  'w-full rounded-xl border border-[#272732]/22 bg-[#F5F6F9] px-3.5 py-2.5 text-sm text-[#0B0B0E] placeholder:text-[#3E404D]/65 transition-colors focus:border-[#8A621C] focus:outline-none focus:ring-2 focus:ring-[#D4AF63]/25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2D2D3A]/40 dark:bg-[#0E0E13] dark:text-[#F2F3F7] dark:placeholder:text-[#9497A6]/60 dark:focus:border-[#E8C987]';

const FieldWrapper = ({
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
        className="block text-xs font-semibold text-[#525463] dark:text-[#9497A6]"
      >
        {label}
        {required && <span className="ml-0.5 text-[#F97362]">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-xs font-medium text-[#F97362]">{error}</p>
    ) : hint ? (
      <p className="text-[11px] text-[#525463]/85 dark:text-[#9497A6]/80">{hint}</p>
    ) : null}
  </div>
);

export const Input = React.forwardRef(
  ({ label, hint, error, leftIcon, className = '', id, required, ...rest }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    return (
      <FieldWrapper label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#525463] dark:text-[#9497A6]">
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

export const Textarea = React.forwardRef(
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

export const Select = React.forwardRef(
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

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  ariaLabel = 'Search',
}) => (
  <div className={`relative ${className}`}>
    <Search
      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#8A621C] dark:text-[#E8C987]"
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
        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-[#525463] hover:bg-[#ECEEF3] dark:text-[#9497A6] dark:hover:bg-[#E8C987]/15"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

export const Checkbox = ({ label, className = '', ...rest }) => (
  <label className={`flex cursor-pointer items-start gap-2.5 text-xs text-[#525463] dark:text-[#9497A6] ${className}`}>
    <input
      type="checkbox"
      className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#272732]/30 accent-[#D4AF63] focus:ring-2 focus:ring-[#D4AF63]/40"
      {...rest}
    />
    <span className="leading-relaxed">{label}</span>
  </label>
);

export const RadioGroup = ({
  label,
  name,
  value,
  onChange,
  options,
}) => (
  <div className="space-y-2">
    {label && (
      <div className="text-xs font-semibold text-[#525463] dark:text-[#9497A6]">{label}</div>
    )}
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors ${
              active
                ? 'border-[#8A621C]/60 bg-[#D4AF63]/10 dark:border-[#E8C987]/55 dark:bg-[#E8C987]/12'
                : 'border-[#272732]/18 bg-[#F1F2F6] hover:border-[#8A621C]/40 dark:border-[#2D2D3A]/38 dark:bg-[#0E0E13]'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={active}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 accent-[#D4AF63]"
            />
            <div>
              <div className="text-xs font-bold text-[#0B0B0E] dark:text-[#F8F9FC]">{opt.label}</div>
              {opt.description && (
                <div className="mt-0.5 text-[11px] text-[#525463] dark:text-[#9497A6]">
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
