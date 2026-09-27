import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { Eye, EntryStatus, Patient, Plan, TrainingEntry } from "./types";
import { EYE_LABEL, entryKey } from "./types";
import { describeRules, initialStatus, pendingReasonFor } from "./config/confirmationRules";
import {
  type Archive,
  clearArchive,
  exportArchive,
  loadArchive,
  saveArchive,
  uid,
} from "./services/localArchive";
import { todayStr, weekEnd, weekStart } from "./utils/week";
import { weekStats } from "./utils/stats";

type Tab = "ledger" | "review" | "plan" | "archive";

interface EntryFormState {
  date: string;
  eye: Eye;
  correctedAcuity: string;
  patchMinutes: string;
  weeklySessions: string;
}

const STATUS_META: Record<EntryStatus, { label: string; cls: string }> = {
  normal: { label: "正常 · 计入完成率", cls: "st-ok" },
  pending: { label: "待医生确认", cls: "st-pending" },
  approved: { label: "医生已确认 · 计入", cls: "st-approved" },
  rejected: { label: "医生驳回 · 不计入", cls: "st-rejected" },
};

function StatusBadge({ status }: { status: EntryStatus }) {
  const meta = STATUS_META[status];
  return <span className={`status-badge ${meta.cls}`}>{meta.label}</span>;
}

function emptyForm(patient: Patient): EntryFormState {
  return {
    date: todayStr(),
    eye: patient.plan.patchEye,
    correctedAcuity: "",
    patchMinutes: "",
    weeklySessions: "",
  };
}

function App() {
  const [archive, setArchive] = useState<Archive>(() => loadArchive());
  const [selectedId, setSelectedId] = useState<string>(() => archive.patients[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>("ledger");
  const [form, setForm] = useState<EntryFormState>(() => emptyForm(archive.patients[0]));
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saveHint, setSaveHint] = useState<string>("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  // 关闭页面再打开仍可查看：任意变更即时写入本地留档
  useEffect(() => {
    saveArchive(archive);
  }, [archive]);

  const patient = archive.patients.find((p) => p.id === selectedId) ?? archive.patients[0];

  useEffect(() => {
    if (patient) setForm(emptyForm(patient));
    setFormErrors([]);
    setSaveHint("");
    // 切换患儿时重置录入表单
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const entries = useMemo(
    () => archive.entries.filter((e) => e.patientId === patient?.id),
    [archive.entries, patient?.id]
  );

  const stats = useMemo(
    () => (patient ? weekStats(patient, archive.entries, todayStr()) : null),
    [patient, archive.entries]
  );

  const allPending = useMemo(
    () =>
      archive.entries
        .filter((e) => e.status === "pending")
        .sort((a, b) => a.date.localeCompare(b.date)),
    [archive.entries]
  );

  function mutate(mut: (draft: Archive) => void) {
    setArchive((prev) => {
      const draft: Archive = {
        ...prev,
        patients: prev.patients.map((p) => ({ ...p, planHistory: [...p.planHistory] })),
        entries: prev.entries.map((e) => ({ ...e })),
      };
      mut(draft);
      return draft;
    });
  }

  // ---- 台账录入：同一天同一眼保存一次（重复保存为覆盖） ----
  function saveEntry(ev: React.FormEvent) {
    ev.preventDefault();
    if (!patient) return;
    const acuity = Number(form.correctedAcuity);
    const minutes = Number(form.patchMinutes);
    const sessions = Number(form.weeklySessions);
    const errors: string[] = [];
    if (!form.date) errors.push("请选择日期");
    if (!form.correctedAcuity || Number.isNaN(acuity) || acuity <= 0 || acuity > 2.5)
      errors.push("矫正视力需填写 0~2.5 之间的小数（如 0.6）");
    if (form.patchMinutes === "" || Number.isNaN(minutes) || minutes < 0 || minutes > 24 * 60)
      errors.push("遮盖分钟需为 0~1440 之间的整数");
    if (form.weeklySessions === "" || Number.isNaN(sessions) || sessions < 0 || sessions > 7)
      errors.push("本周训练次数需为 0~7 之间的整数");
    setFormErrors(errors);
    if (errors.length) return;

    const key = entryKey(patient.id, form.date, form.eye);
    const existing = archive.entries.find(
      (e) => entryKey(e.patientId, e.date, e.eye) === key
    );
    const isPlanEye = form.eye === patient.plan.patchEye;
    const reason = isPlanEye ? pendingReasonFor(minutes) : null;

    const nextEntry: TrainingEntry = {
      id: existing?.id ?? uid("ent"),
      patientId: patient.id,
      date: form.date,
      eye: form.eye,
      correctedAcuity: acuity,
      patchMinutes: minutes,
      weeklySessions: sessions,
      // 非方案遮盖眼仅作视力留档；遮盖眼按确认条件判定
      status: isPlanEye ? initialStatus(minutes) : "normal",
      ...(reason ? { pendingReason: reason } : {}),
    };

    mutate((draft) => {
      draft.entries = existing
        ? draft.entries.map((e) => (e.id === existing.id ? nextEntry : e))
        : [...draft.entries, nextEntry];
    });

    if (isPlanEye && reason) {
      setSaveHint(`${existing ? "已覆盖" : "已保存"}：${reason}，确认前不计入本周完成率。`);
    } else if (existing) {
      setSaveHint("已覆盖今日同眼记录（同一天同一眼只保留一次）。");
    } else {
      setSaveHint("已保存，计入本周台账。");
    }
    setFormErrors([]);
  }

  function loadEntry(e: TrainingEntry) {
    setForm({
      date: e.date,
      eye: e.eye,
      correctedAcuity: String(e.correctedAcuity),
      patchMinutes: String(e.patchMinutes),
      weeklySessions: String(e.weeklySessions),
    });
    setSaveHint("已载入该记录，再次保存将覆盖（同一天同一眼只保留一次）。");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteEntry(id: string) {
    mutate((draft) => {
      draft.entries = draft.entries.filter((e) => e.id !== id);
    });
  }

  // ---- 医生确认 / 驳回 ----
  function review(id: string, decision: "approved" | "rejected") {
    mutate((draft) => {
      draft.entries = draft.entries.map((e) =>
        e.id === id
          ? {
              ...e,
              status: decision,
              reviewedAt: todayStr(),
              reviewNote: reviewNotes[id]?.trim() || (decision === "approved" ? "医生确认计入" : "医生驳回"),
            }
          : e
      );
    });
    setReviewNotes((prev) => ({ ...prev, [id]: "" }));
  }

  // ---- 方案调整：必填原因，保留旧值 ----
  const [planForm, setPlanForm] = useState<Plan>(patient.plan);
  const [planReason, setPlanReason] = useState("");
  const [planError, setPlanError] = useState("");

  useEffect(() => {
    if (patient) {
      setPlanForm(patient.plan);
      setPlanReason("");
      setPlanError("");
    }
  }, [patient]); // eslint-disable-line react-hooks/exhaustive-deps

  function submitPlan(ev: React.FormEvent) {
    ev.preventDefault();
    if (!patient) return;
    const reason = planReason.trim();
    const changed =
      planForm.patchEye !== patient.plan.patchEye ||
      planForm.dailyMinutes !== patient.plan.dailyMinutes ||
      planForm.weeklySessions !== patient.plan.weeklySessions;
    if (!reason) {
      setPlanError("请写明调整原因。");
      return;
    }
    if (!changed) {
      setPlanError("新方案与当前方案一致，无需调整。");
      return;
    }
    if (planForm.dailyMinutes <= 0 || planForm.weeklySessions <= 0) {
      setPlanError("每日遮盖分钟与每周训练次数需大于 0。");
      return;
    }
    mutate((draft) => {
      const target = draft.patients.find((p) => p.id === patient.id)!;
      target.planHistory = [
        ...target.planHistory,
        {
          id: uid("chg"),
          changedAt: todayStr(),
          reason,
          oldPlan: { ...patient.plan },
          newPlan: { ...planForm },
        },
      ];
      target.plan = { ...planForm };
    });
    setPlanReason("");
    setPlanError("");
    setTab("plan");
  }

  if (!patient || !stats) return null;

  const sortedEntries = [...entries].sort((a, b) =>
    b.date === a.date ? b.eye.localeCompare(a.eye) : b.date.localeCompare(a.date)
  );
  const ws = weekStart(todayStr());
  const weekEntries = sortedEntries.filter((e) => e.date >= ws && e.date <= weekEnd(todayStr()));
  const pastEntries = sortedEntries.filter((e) => e.date < ws);
  const duplicate = archive.entries.find(
    (e) =>
      e.patientId === patient.id &&
      e.date === form.date &&
      e.eye === form.eye
  );
  const ratePct = Math.round(stats.completionRate * 100);
  const barPct = Math.min(100, ratePct);

  function downloadJson() {
    const blob = new Blob([exportArchive()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `遮盖训练台账-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-11 · 弱视遮盖训练台账 · port 5111</p>
          <h1>遮盖训练台账</h1>
          <p className="subtitle">
            按左右眼记录矫正视力、每日遮盖分钟与本周训练次数；异常时长留待医生确认后才计入完成率，方案调整留痕。
          </p>
        </div>
        <div className="stack-card">
          <span>确认条件（config 独立维护）</span>
          <strong>{describeRules()}</strong>
        </div>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <span>本周遮盖完成率</span>
          <strong>{ratePct}%</strong>
          <i className="status-ok" />
        </article>
        <article className="metric-card">
          <span>已计入遮盖分钟</span>
          <strong>
            {stats.countedMinutes}
            <em> / {stats.targetMinutes} 分</em>
          </strong>
          <i className="status-watch" />
        </article>
        <article className="metric-card">
          <span>本周训练次数（最新自报）</span>
          <strong>
            {stats.latestSessions}
            <em> / {patient.plan.weeklySessions} 次</em>
          </strong>
          <i className="status-ok" />
        </article>
        <article className="metric-card">
          <span>待医生确认记录</span>
          <strong>{allPending.length}</strong>
          <i className="status-danger" />
        </article>
      </section>

      <div className="progress-bar-wrap">
        <div className="progress-bar" style={{ width: `${barPct}%` }} />
        <span>
          {ws} ~ {weekEnd(todayStr())} · 已计入 {stats.countedDays} 天 / 登记 {stats.recordedDays} 天
          {stats.pendingCount > 0 && ` · ${stats.pendingCount} 条待确认`}
        </span>
      </div>

      <section className="workspace">
        <aside className="panel narrow">
          <h2>患儿资料</h2>
          <div className="patient-list">
            {archive.patients.map((p) => (
              <button
                key={p.id}
                className={`patient-item ${p.id === patient.id ? "active" : ""}`}
                onClick={() => setSelectedId(p.id)}
              >
                <strong>{p.name}</strong>
                <span>{p.id} · {p.age} 岁</span>
                <small>{p.diagnosis}</small>
                <small className="plan-line">
                  遮{EYE_LABEL[p.plan.patchEye]} · {p.plan.dailyMinutes} 分/天 · {p.plan.weeklySessions} 次/周
                </small>
              </button>
            ))}
          </div>

          <h2>本周视力（遮{EYE_LABEL[patient.plan.patchEye]}）</h2>
          <div className="acuity-row">
            {stats.acuitySeries.length === 0 && <span className="muted">暂无记录</span>}
            {stats.acuitySeries.map((s) => (
              <span key={s.date} className="acuity-chip" title={s.date}>
                {s.acuity.toFixed(1)}
              </span>
            ))}
          </div>
        </aside>

        <section className="panel">
          <nav className="tabs">
            <button className={tab === "ledger" ? "active" : ""} onClick={() => setTab("ledger")}>
              训练台账
            </button>
            <button className={tab === "review" ? "active" : ""} onClick={() => setTab("review")}>
              医生确认{allPending.length > 0 ? `（${allPending.length}）` : ""}
            </button>
            <button className={tab === "plan" ? "active" : ""} onClick={() => setTab("plan")}>
              方案调整{patient.planHistory.length > 0 ? `（${patient.planHistory.length}）` : ""}
            </button>
            <button className={tab === "archive" ? "active" : ""} onClick={() => setTab("archive")}>
              本地留档
            </button>
          </nav>

          {tab === "ledger" && (
            <div className="tab-body">
              <div className="section-heading">
                <div>
                  <p>每日记录</p>
                  <h2>{patient.name} · 遮盖训练录入</h2>
                </div>
              </div>

              <form className="entry-form" onSubmit={saveEntry}>
                <label>
                  <span>日期</span>
                  <input
                    type="date"
                    value={form.date}
                    max={todayStr()}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </label>
                <label>
                  <span>眼别（按左右眼各记一条）</span>
                  <select
                    value={form.eye}
                    onChange={(e) => setForm({ ...form, eye: e.target.value as Eye })}
                  >
                    <option value="OD">右眼（OD）</option>
                    <option value="OS">左眼（OS）</option>
                  </select>
                </label>
                <label>
                  <span>矫正视力（小数）</span>
                  <input
                    inputMode="decimal"
                    list="acuity-options"
                    placeholder="如 0.6"
                    value={form.correctedAcuity}
                    onChange={(e) => setForm({ ...form, correctedAcuity: e.target.value })}
                  />
                  <datalist id="acuity-options">
                    {["0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.8", "1.0", "1.2", "1.5", "2.0"].map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </label>
                <label>
                  <span>每日遮盖分钟</span>
                  <input
                    type="number"
                    min={0}
                    max={1440}
                    placeholder="如 240"
                    value={form.patchMinutes}
                    onChange={(e) => setForm({ ...form, patchMinutes: e.target.value })}
                  />
                </label>
                <label>
                  <span>本周训练次数</span>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    placeholder="0~7"
                    value={form.weeklySessions}
                    onChange={(e) => setForm({ ...form, weeklySessions: e.target.value })}
                  />
                </label>
                <div className="form-action">
                  <button type="submit" className="primary-action">
                    {duplicate ? "覆盖保存（同眼今日已有记录）" : "保存记录"}
                  </button>
                  <button type="button" onClick={() => setForm(emptyForm(patient))}>
                    清空
                  </button>
                </div>
              </form>

              {form.eye !== patient.plan.patchEye && (
                <p className="form-hint info">
                  当前方案遮盖的是{EYE_LABEL[patient.plan.patchEye]}；{EYE_LABEL[form.eye]}记录仅作视力留档，不参与完成率与确认判定。
                </p>
              )}
              {duplicate && (
                <p className="form-hint warn">
                  {form.date} {EYE_LABEL[form.eye]}已有记录（
                  {duplicate.patchMinutes} 分钟，{STATUS_META[duplicate.status].label}），保存将覆盖，且需重新经确认流程。
                </p>
              )}
              {formErrors.length > 0 && (
                <ul className="form-hint warn errors">
                  {formErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}
              {saveHint && <p className="form-hint ok">{saveHint}</p>}

              <h3 className="table-title">本周台账（{weekEntries.length} 条）</h3>
              <EntryTable
                entries={weekEntries}
                planEye={patient.plan.patchEye}
                onLoad={loadEntry}
                onDelete={deleteEntry}
                empty="本周还没有记录，先为患儿保存一条。"
              />

              {pastEntries.length > 0 && (
                <>
                  <h3 className="table-title">历史留档（{pastEntries.length} 条）</h3>
                  <EntryTable
                    entries={pastEntries}
                    planEye={patient.plan.patchEye}
                    onLoad={loadEntry}
                    onDelete={deleteEntry}
                    empty=""
                  />
                </>
              )}
            </div>
          )}

          {tab === "review" && (
            <div className="tab-body">
              <div className="section-heading">
                <div>
                  <p>复诊确认</p>
                  <h2>待确认遮盖记录</h2>
                </div>
              </div>
              <p className="form-hint info">{describeRules()}。确认后计入完成率；驳回则不计入。</p>
              {allPending.length === 0 && (
                <p className="form-hint ok">当前没有待确认记录，所有异常时长均已处理。</p>
              )}
              <div className="review-list">
                {allPending.map((e) => {
                  const owner = archive.patients.find((p) => p.id === e.patientId);
                  return (
                    <article key={e.id} className="review-card">
                      <div className="review-main">
                        <strong>
                          {owner?.name} · {e.date} · {EYE_LABEL[e.eye]}
                        </strong>
                        <span>{e.pendingReason}</span>
                        <small>
                          自报遮盖 {e.patchMinutes} 分钟，矫正视力 {e.correctedAcuity}，本周训练 {e.weeklySessions} 次
                        </small>
                      </div>
                      <input
                        placeholder="医生确认意见（可选）"
                        value={reviewNotes[e.id] ?? ""}
                        onChange={(ev) =>
                          setReviewNotes((prev) => ({ ...prev, [e.id]: ev.target.value }))
                        }
                      />
                      <div className="review-actions">
                        <button className="btn-approve" onClick={() => review(e.id, "approved")}>
                          确认计入
                        </button>
                        <button className="btn-reject" onClick={() => review(e.id, "rejected")}>
                          驳回
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <h3 className="table-title">已处理记录</h3>
              <ReviewResultTable
                entries={archive.entries.filter(
                  (e) => e.status === "approved" || e.status === "rejected"
                )}
                patients={archive.patients}
              />
            </div>
          )}

          {tab === "plan" && (
            <div className="tab-body">
              <div className="section-heading">
                <div>
                  <p>治疗方案</p>
                  <h2>遮盖方案与调整记录</h2>
                </div>
              </div>

              <form className="plan-form" onSubmit={submitPlan}>
                <div className="plan-current">
                  当前方案：遮{EYE_LABEL[patient.plan.patchEye]} · 每日 {patient.plan.dailyMinutes} 分钟 · 每周{" "}
                  {patient.plan.weeklySessions} 次
                </div>
                <label>
                  <span>调整后遮盖眼</span>
                  <select
                    value={planForm.patchEye}
                    onChange={(e) => setPlanForm({ ...planForm, patchEye: e.target.value as Eye })}
                  >
                    <option value="OD">右眼（OD）</option>
                    <option value="OS">左眼（OS）</option>
                  </select>
                </label>
                <label>
                  <span>每日遮盖分钟</span>
                  <input
                    type="number"
                    min={1}
                    max={840}
                    value={planForm.dailyMinutes}
                    onChange={(e) => setPlanForm({ ...planForm, dailyMinutes: Number(e.target.value) })}
                  />
                </label>
                <label>
                  <span>每周训练次数</span>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={planForm.weeklySessions}
                    onChange={(e) => setPlanForm({ ...planForm, weeklySessions: Number(e.target.value) })}
                  />
                </label>
                <label className="full">
                  <span>调整原因（必填，随旧值一并留档）</span>
                  <textarea
                    rows={2}
                    placeholder="如：连续两周视力无提升，延长遮盖时长"
                    value={planReason}
                    onChange={(e) => setPlanReason(e.target.value)}
                  />
                </label>
                {planError && <p className="form-hint warn full">{planError}</p>}
                <div className="form-action full">
                  <button type="submit" className="primary-action">
                    保存调整（保留旧值与原因）
                  </button>
                </div>
              </form>

              <h3 className="table-title">调整记录</h3>
              {patient.planHistory.length === 0 && <p className="form-hint info">暂无方案调整。</p>}
              <div className="timeline">
                {patient.planHistory.map((c) => (
                  <article key={c.id} className="timeline-item">
                    <div className="timeline-date">{c.changedAt}</div>
                    <div>
                      <p className="timeline-reason">{c.reason}</p>
                      <p className="timeline-values">
                        旧：遮{EYE_LABEL[c.oldPlan.patchEye]} · {c.oldPlan.dailyMinutes} 分/天 ·{" "}
                        {c.oldPlan.weeklySessions} 次/周
                        <span className="arrow">→</span>
                        新：遮{EYE_LABEL[c.newPlan.patchEye]} · {c.newPlan.dailyMinutes} 分/天 ·{" "}
                        {c.newPlan.weeklySessions} 次/周
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {tab === "archive" && (
            <div className="tab-body">
              <div className="section-heading">
                <div>
                  <p>本机留档（services 单独放置）</p>
                  <h2>本地存档</h2>
                </div>
              </div>
              <ul className="archive-meta">
                <li>存储位置：浏览器 localStorage，键名 <code>hxwl-11.occlusion-ledger.v1</code></li>
                <li>患儿档案：{archive.patients.length} 份</li>
                <li>台账记录：{archive.entries.length} 条</li>
                <li>方案调整记录：{archive.patients.reduce((n, p) => n + p.planHistory.length, 0)} 条</li>
                <li>最近保存：{archive.savedAt}（关闭页面再打开仍可查看周进度与调整记录）</li>
              </ul>
              <div className="form-action">
                <button onClick={downloadJson}>导出 JSON 留档</button>
                <button
                  className="btn-danger"
                  onClick={() => {
                    if (window.confirm("将清空本机全部台账并恢复演示数据，确定？")) {
                      setArchive(clearArchive());
                      setSaveHint("");
                    }
                  }}
                >
                  清空并恢复演示数据
                </button>
              </div>
              <p className="form-hint info">
                数据仅保存在当前浏览器，不上传服务器；换设备或清除浏览器数据会丢失，请定期导出 JSON 留档。
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function EntryTable({
  entries,
  planEye,
  onLoad,
  onDelete,
  empty,
}: {
  entries: TrainingEntry[];
  planEye: Eye;
  onLoad: (e: TrainingEntry) => void;
  onDelete: (id: string) => void;
  empty: string;
}) {
  if (entries.length === 0) return <p className="form-hint info">{empty}</p>;
  return (
    <div className="table-wrap">
      <table className="ledger-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>眼别</th>
            <th>矫正视力</th>
            <th>遮盖分钟</th>
            <th>本周次数</th>
            <th>状态</th>
            <th>说明</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{e.date}</td>
              <td>{EYE_LABEL[e.eye]}</td>
              <td>{e.correctedAcuity}</td>
              <td>{e.patchMinutes}</td>
              <td>{e.weeklySessions}</td>
              <td>
                {e.eye === planEye ? (
                  <StatusBadge status={e.status} />
                ) : (
                  <span className="status-badge st-ref">非遮盖眼 · 参考</span>
                )}
              </td>
              <td className="note-cell">{e.reviewNote ?? e.pendingReason ?? ""}</td>
              <td className="row-actions">
                <button onClick={() => onLoad(e)}>载入</button>{" "}
                <button className="btn-danger" onClick={() => onDelete(e.id)}>
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewResultTable({
  entries,
  patients,
}: {
  entries: TrainingEntry[];
  patients: Patient[];
}) {
  const sorted = [...entries].sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""));
  return (
    <div className="table-wrap">
      <table className="ledger-table">
        <thead>
          <tr>
            <th>患儿</th>
            <th>日期</th>
            <th>眼别</th>
            <th>遮盖分钟</th>
            <th>状态</th>
            <th>确认时间 / 意见</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => (
            <tr key={e.id}>
              <td>{patients.find((p) => p.id === e.patientId)?.name ?? e.patientId}</td>
              <td>{e.date}</td>
              <td>{EYE_LABEL[e.eye]}</td>
              <td>{e.patchMinutes}</td>
              <td>
                <StatusBadge status={e.status} />
              </td>
              <td className="note-cell">
                {e.reviewedAt} · {e.reviewNote}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
