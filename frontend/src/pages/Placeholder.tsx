import { Construction } from "lucide-react";

export default function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="page">
      <div className="page-head"><h2>{title}</h2></div>
      <div className="card card-pad placeholder">
        <Construction size={26} className="muted" />
        <p className="section-title">{title}</p>
        <p className="muted" style={{ maxWidth: 460, textAlign: "center" }}>{note}</p>
      </div>
    </div>
  );
}
