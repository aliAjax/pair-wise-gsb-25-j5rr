import { summarizeWeek } from "../logic";
import type { OcclusionEntry, Patient, TherapyPlan } from "../types";
import { EYE_LABELS, STATUS_LABELS } from "../types";
import { WEEKDAY_LABELS } from "../week";

interface Props {
  patients: Patient[];
  plans: TherapyPlan[];
  entries: OcclusionEntry[];
  week: string[];
  rangeLabel: string;
}

export default function WeekProgress({ patients, plans, entries, week, rangeLabel }: Props) {
  return (
    <div>
      <div className="section-heading">
        <div>
          <p>周进度</p>
          <h2>本周完成率（{rangeLabel}）</h2>
        </div>
      </div>
      {patients.length === 0 && <p className="empty-hint">尚未登记患儿。</p>}
      <div className="progress-list">
        {patients.map((patient) => {
          const patientPlans = plans.filter((p) => p.patientId === patient.id);
          return (
            <div className="patient-block" key={patient.id}>
              <h3>
                {patient.name}
                {patient.age && <span className="patient-sub"> · {patient.age}</span>}
              </h3>
              {patientPlans.length === 0 ? (
                <p className="empty-hint">尚未制定遮盖方案，请先在下方「方案与调整记录」中制定。</p>
              ) : (
                patientPlans.map((plan) => {
                  const s = summarizeWeek(entries, plan, week);
                  return (
                    <div className="progress-card" key={plan.eye}>
                      <div className="progress-head">
                        <h3>{EYE_LABELS[plan.eye]}</h3>
                        <span className="targets">
                          方案：每日 {plan.dailyMinutes} 分钟 · 每周 {plan.daysPerWeek} 天
                        </span>
                      </div>
                      <div className="progress-bar">
                        <i style={{ width: `${s.rate}%` }} />
                      </div>
                      <div className="progress-meta">
                        <span>
                          完成率 {s.rate}% · 已计入 {s.countableDays}/{plan.daysPerWeek} 天 · 遮盖{" "}
                          {s.countableMinutes}/{s.targetMinutes} 分钟
                        </span>
                        {s.pendingCount > 0 && (
                          <span className="badge pending">{s.pendingCount} 条待确认，未计入</span>
                        )}
                      </div>
                      <div className="day-strip">
                        {week.map((d, i) => {
                          const st = s.byDate[d] ?? "none";
                          const label = st === "none" ? "无记录" : STATUS_LABELS[st];
                          return (
                            <span key={d} className={`day-cell ${st}`} title={`${d} ${label}`}>
                              {WEEKDAY_LABELS[i]}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
