import { useState } from "react";
import type { Patient } from "../types";

interface Props {
  patients: Patient[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: (input: { name: string; age: string; note: string }) => void;
}

export default function PatientPanel({ patients, selectedId, onSelect, onAdd }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (!name.trim()) {
      setError("请填写患儿姓名");
      return;
    }
    onAdd({ name: name.trim(), age: age.trim(), note: note.trim() });
    setName("");
    setAge("");
    setNote("");
    setError("");
    setShowForm(false);
  }

  return (
    <div>
      <div className="panel-title-row">
        <h2>患儿资料</h2>
        <button type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "收起" : "新增患儿"}
        </button>
      </div>
      {showForm && (
        <div className="mini-form">
          <label>
            <span>姓名</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="患儿姓名" />
          </label>
          <label>
            <span>年龄</span>
            <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="如 6岁" />
          </label>
          <label>
            <span>诊断备注</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="如 左眼弱视，遮盖右眼"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="primary-action" onClick={submit}>
            保存患儿
          </button>
        </div>
      )}
      <div className="patient-list">
        {patients.map((p) => (
          <button
            key={p.id}
            type="button"
            className={"patient-item" + (p.id === selectedId ? " active" : "")}
            onClick={() => onSelect(p.id)}
          >
            <strong>{p.name}</strong>
            <span>
              {p.age}
              {p.age && p.note ? " · " : ""}
              {p.note}
            </span>
          </button>
        ))}
        {patients.length === 0 && <p className="empty-hint">尚未登记患儿</p>}
      </div>
    </div>
  );
}
