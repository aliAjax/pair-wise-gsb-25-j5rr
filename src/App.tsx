import { useMemo, useState } from "react";
import "./styles.css";
import EntryForm, { type SaveEntryInput } from "./components/EntryForm";
import PatientPanel from "./components/PatientPanel";
import PendingQueue from "./components/PendingQueue";
import PlanPanel from "./components/PlanPanel";
import SettingsPanel from "./components/SettingsPanel";
import WeekEntries from "./components/WeekEntries";
import WeekProgress from "./components/WeekProgress";
import { evaluateMinutes, summarizeWeek } from "./logic";
import { buildSeed } from "./seed";
import { STORAGE_KEYS, usePersistentState } from "./storage";
import type {
  ConfirmSettings,
  EntryStatus,
  EyeSide,
  OcclusionEntry,
  Patient,
  PlanChange,
  TherapyPlan,
} from "./types";
import { nowIso, uid, weekDates, weekRangeLabel } from "./week";

const seed = buildSeed();

const statusColors = ["status-ok", "status-watch", "status-danger"];

function MetricCard({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={statusColors[index % statusColors.length]} />
    </article>
  );
}

function App() {
  // 本地留档：五类数据各自独立存放
  const [patients, setPatients] = usePersistentState<Patient[]>(
    STORAGE_KEYS.patients,
    () => seed.patients
  );
  const [entries, setEntries] = usePersistentState<OcclusionEntry[]>(
    STORAGE_KEYS.entries,
    () => seed.entries
  );
  const [plans, setPlans] = usePersistentState<TherapyPlan[]>(
    STORAGE_KEYS.plans,
    () => seed.plans
  );
  const [changes, setChanges] = usePersistentState<PlanChange[]>(
    STORAGE_KEYS.planChanges,
    () => seed.planChanges
  );
  const [settings, setSettings] = usePersistentState<ConfirmSettings>(
    STORAGE_KEYS.settings,
    () => seed.settings
  );
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    () => patients[0]?.id ?? ""
  );

  const week = useMemo(() => weekDates(), []);
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? patients[0];

  const pendingEntries = useMemo(
    () =>
      entries
        .filter((e) => e.status === "pending")
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [entries]
  );

  const weekEntries = useMemo(() => entries.filter((e) => week.includes(e.date)), [entries, week]);

  const selectedWeekEntries = useMemo(
    () =>
      selectedPatient
        ? weekEntries
            .filter((e) => e.patientId === selectedPatient.id)
            .sort((a, b) =>
              a.date === b.date ? (a.eye < b.eye ? -1 : 1) : a.date < b.date ? -1 : 1
            )
        : [],
    [weekEntries, selectedPatient]
  );

  const avgRate = useMemo(() => {
    if (plans.length === 0) return 0;
    const total = plans.reduce((sum, plan) => sum + summarizeWeek(entries, plan, week).rate, 0);
    return Math.round(total / plans.length);
  }, [plans, entries, week]);

  function addPatient(input: { name: string; age: string; note: string }) {
    const patient: Patient = { id: uid(), createdAt: nowIso(), ...input };
    setPatients((prev) => [...prev, patient]);
    setSelectedPatientId(patient.id);
  }

  /** 同一天同一眼仅保存一次：按 患儿|日期|眼别 覆盖，并按确认条件重新判定状态 */
  function saveEntry(input: SaveEntryInput): EntryStatus {
    const { status, reason } = evaluateMinutes(input.patchMinutes, settings);
    const id = `${input.patientId}|${input.date}|${input.eye}`;
    setEntries((prev) => {
      const old = prev.find((e) => e.id === id);
      const next: OcclusionEntry = {
        ...input,
        id,
        status,
        statusReason: reason,
        createdAt: old?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      };
      return [...prev.filter((e) => e.id !== id), next];
    });
    return status;
  }

  function reviewEntry(id: string, action: "confirmed" | "rejected") {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: action, reviewedAt: nowIso() } : e))
    );
  }

  /** 方案变化：更新当前方案，同时留痕旧值与原因 */
  function changePlan(input: {
    patientId: string;
    eye: EyeSide;
    dailyMinutes: number;
    daysPerWeek: number;
    reason: string;
  }) {
    const current = plans.find((p) => p.patientId === input.patientId && p.eye === input.eye);
    const now = nowIso();
    setPlans((prev) => [
      ...prev.filter((p) => !(p.patientId === input.patientId && p.eye === input.eye)),
      {
        patientId: input.patientId,
        eye: input.eye,
        dailyMinutes: input.dailyMinutes,
        daysPerWeek: input.daysPerWeek,
        updatedAt: now,
      },
    ]);
    setChanges((prev) => [
      {
        id: uid(),
        patientId: input.patientId,
        eye: input.eye,
        oldDailyMinutes: current?.dailyMinutes ?? 0,
        oldDaysPerWeek: current?.daysPerWeek ?? 0,
        newDailyMinutes: input.dailyMinutes,
        newDaysPerWeek: input.daysPerWeek,
        reason: input.reason,
        changedAt: now,
      },
      ...prev,
    ]);
  }

  function saveSettings(next: { minMinutes: number; maxMinutes: number }) {
    setSettings({ ...next, updatedAt: nowIso() });
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-11 · 眼科弱视门诊 · 本地留档</p>
          <h1>遮盖训练台账</h1>
          <p className="subtitle">
            按左右眼登记矫正视力、每日遮盖分钟与本周训练次数，同一天同一眼仅保留一条；遮盖不足{" "}
            {settings.minMinutes} 分钟或超过 {settings.maxMinutes}{" "}
            分钟的记录先留待医生确认，确认后才计入本周完成率。本周 {weekRangeLabel(week)}。
          </p>
        </div>
        <div className="stack-card">
          <span>本地留档</span>
          <strong>
            患儿资料、遮盖记录、治疗方案、调整记录与确认条件分别存放于本机浏览器，关闭页面后再次打开仍可查看周进度与调整记录。
          </strong>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard label="在册患儿" value={String(patients.length)} index={0} />
        <MetricCard label="本周记录" value={String(weekEntries.length)} index={1} />
        <MetricCard label="待确认" value={String(pendingEntries.length)} index={2} />
        <MetricCard label="本周平均完成率" value={`${avgRate}%`} index={3} />
      </section>

      <section className="workspace">
        <aside className="panel narrow">
          <div className="aside-block">
            <PatientPanel
              patients={patients}
              selectedId={selectedPatient?.id ?? ""}
              onSelect={setSelectedPatientId}
              onAdd={addPatient}
            />
          </div>
          <div className="aside-block">
            <SettingsPanel settings={settings} onSave={saveSettings} />
          </div>
        </aside>

        <section className="panel">
          <EntryForm
            patient={selectedPatient}
            settings={settings}
            entries={entries}
            onSave={saveEntry}
          />
          <WeekEntries patient={selectedPatient} entries={selectedWeekEntries} />
        </section>
      </section>

      <section className="panel">
        <PendingQueue pending={pendingEntries} patients={patients} onReview={reviewEntry} />
      </section>

      <section className="panel">
        <WeekProgress
          patients={patients}
          plans={plans}
          entries={entries}
          week={week}
          rangeLabel={weekRangeLabel(week)}
        />
      </section>

      <section className="panel">
        <PlanPanel patient={selectedPatient} plans={plans} changes={changes} onChange={changePlan} />
      </section>

      <p className="footer-note">
        数据仅保存在本机浏览器 localStorage（键名 hxwl11.occlusion.*，五类留档各自独立）；清除浏览器数据会删除留档。
      </p>
    </main>
  );
}

export default App;
