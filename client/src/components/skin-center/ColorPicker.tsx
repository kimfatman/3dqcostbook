import { useId } from "react";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

/** 颜色选择器：原生取色器 + 十六进制输入框 + 当前色块 */
export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const id = useId();
  return (
    <label className="color-picker-row" htmlFor={id}>
      <span className="color-picker-label">{label}</span>
      <span className="color-picker-control">
        <span className="color-picker-swatch">
          <input
            id={id}
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#0880f7"}
            onChange={(event) => onChange(event.target.value)}
            aria-label={`${label}取色`}
          />
          <i style={{ background: value }} aria-hidden="true" />
        </span>
        <input
          className="color-picker-hex"
          type="text"
          inputMode="text"
          value={value}
          onChange={(event) => {
            const next = event.target.value.trim();
            if (/^#[0-9a-fA-F]{0,6}$/.test(next) || next === "") onChange(next);
          }}
          onBlur={() => {
            if (!/^#[0-9a-fA-F]{6}$/.test(value)) onChange("#0880f7");
          }}
          spellCheck={false}
          aria-label={`${label}十六进制`}
        />
      </span>
    </label>
  );
}
