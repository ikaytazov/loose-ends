"use client";

// Inline form to add a teammate. Used on Review (with the tasks from the notes) and on Team (no tasks).
// Nothing is emailed from here: the new person gets the normal 8 a.m. Pacific email.
import { useId, useState, type FormEvent } from "react";
import { ApiError, errorText } from "@/components/api";
import { addMember, isEmail, type AddMemberResponse } from "@/components/team/add-member";
import { Button, Field, Notice, inputClass } from "@/components/ui";

export function AddMemberForm({
  initialName,
  taskIds,
  addedBy,
  onAdded,
  onCancel,
}: {
  initialName: string;
  taskIds: string[];
  addedBy: string | null;
  onAdded: (res: AddMemberResponse) => void;
  onCancel: () => void;
}) {
  const ids = useId();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState("");
  const [assign, setAssign] = useState(taskIds.length > 0);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const typed = name.trim();
  const first = typed.split(" ")[0];
  const who = first || "They";
  const count = taskIds.length;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setNameError(name.trim() ? null : "Enter a name.");
    setEmailError(isEmail(email) ? null : "Enter an email like name@company.com.");
    setSubmitError(null);
    if (!name.trim() || !isEmail(email)) return;

    setSaving(true);
    try {
      const res = await addMember({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: "member",
        assign_task_ids: assign ? taskIds : [],
        added_by: addedBy,
      });
      onAdded(res);
    } catch (err) {
      // Keep what was typed so the user can correct it and try again.
      const message = err instanceof ApiError && err.status === 429 ? "Daily limit for new teammates reached. Try again tomorrow." : errorText(err);
      setSubmitError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
      noValidate
      aria-labelledby={`${ids}-title`}
      className="space-y-4 rounded-card border border-line bg-paper p-5"
    >
      <h3 id={`${ids}-title`} className="font-serif text-[22px]">
        Add a teammate
      </h3>

      {submitError && <Notice tone="danger" title="Could not add them">{submitError}</Notice>}

      <Field label="Name" error={nameError ?? undefined}>
        <input id={`${ids}-name`} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" autoFocus={!initialName} />
      </Field>

      <Field label="Email" error={emailError ?? undefined}>
        <input
          id={`${ids}-email`}
          className={inputClass}
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          placeholder="name@company.com"
        />
      </Field>

      {count > 0 && (
        <label className="flex min-h-11 items-start gap-3 text-[15px]">
          <input type="checkbox" className="mt-1 size-5 accent-forest" checked={assign} onChange={(e) => setAssign(e.target.checked)} />
          <span>
            Give {who} the {count} {count === 1 ? "task" : "tasks"} from these notes
          </span>
        </label>
      )}

      <p className="text-[14px] text-muted">
        {who} will get a short email at 8 a.m. Pacific from signalridgeco@gmail.com with only {first ? `${first}’s` : "their"} own tasks, and can reply to update them.
      </p>

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? "Adding…" : first ? `Add ${first}` : "Add teammate"}
        </Button>
      </div>
    </form>
  );
}
