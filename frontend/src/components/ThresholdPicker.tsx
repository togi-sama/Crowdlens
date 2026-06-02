import "./ThresholdPicker.css";

export type Threshold = "None" | "Very Low" | "Low" | "Medium";

const OPTIONS: { value: Threshold; label: string; color: string }[] = [
  { value: "Very Low", label: "Very Low", color: "#84cc16" },
  { value: "Low",      label: "Low",      color: "#30924C" },
  { value: "Medium",   label: "Medium",   color: "#f59e0b" },
  { value: "None",     label: "Off",      color: "#b2bec3" },
];

interface Props {
  value: Threshold;
  onChange: (v: Threshold) => void;
  disabled?: boolean;
}

export default function ThresholdPicker({ value, onChange, disabled }: Props) {
  return (
    <div className="threshold-picker">
      <p className="threshold-label">Alert me when crowd is at or below:</p>
      <div className="threshold-options">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            disabled={disabled}
            className={`threshold-btn ${value === opt.value ? "threshold-btn-active" : ""}`}
            style={value === opt.value ? { background: opt.color, borderColor: opt.color } : { borderColor: opt.color, color: opt.color }}
            onClick={() => onChange(opt.value)}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
