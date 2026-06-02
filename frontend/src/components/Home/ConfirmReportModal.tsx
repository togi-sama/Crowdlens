import { useState } from "react";
import "./ConfirmReportModal.css";

interface ConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (remark: string) => void;
  level: string;
}

export default function ConfirmReportModal({ isOpen, onClose, onConfirm, level }: ConfirmProps) {
  const [remark, setRemark] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(remark.trim());
    setRemark("");
  };

  const handleClose = () => {
    setRemark("");
    onClose();
  };

  return (
    <div className="modal-overlay secondary" onClick={handleClose}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Confirm Report</h3>
        <p>Are you sure the crowd level is <strong>{level}</strong>?</p>

        <textarea
          className="remark-input"
          placeholder="Add a remark (optional) — waiting time, seat availability, comfort…"
          maxLength={280}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
        <span className="remark-count">{remark.length}/280</span>

        <div className="confirm-actions">
          <button className="cancel-btn" onClick={handleClose}>Change</button>
          <button className="confirm-btn" onClick={handleConfirm}>Yes, Submit</button>
        </div>
      </div>
    </div>
  );
}
