// src/components/ReportModal.tsx
import "./ReportModal.css";
import type { ReportModalProps } from "../../types/crowd";
import { Options } from "../../types/crowd";

export default function ReportModal({ isOpen, onClose, locationName, onSubmit }: ReportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>×</button>
        <header className="report-header">
          <h3>Report Crowd Level</h3>
          <p>{locationName}</p>
        </header>

        <div className="report-options">
          {Options.map((opt) => (
            <button 
              key={opt.level} 
              className={`report-option-card ${opt.level.toLowerCase().replace(' ', '-')}`}
              onClick={() => onSubmit(opt.level)}
            >
              <div className="option-info">
                <span className="option-level">{opt.level}</span>
                <span className="option-desc">{opt.desc}</span>
              </div>
              <span className="chevron">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}