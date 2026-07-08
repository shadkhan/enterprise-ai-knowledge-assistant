"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { FilePlus2, FolderCog, Upload, Wand2 } from "lucide-react";
import {
  createFolderIngestionJob,
  createIngestionJob,
  createSyntheticJob,
  FileIngestionSettings,
  getFileIngestionSettings,
  IngestionJobStatus,
  uploadIngestionFiles,
} from "../lib/api";
import { AdminShell, ErrorBanner, StatusBadge } from "./admin-shell";

type Mode = "document" | "upload" | "folder" | "synthetic";

export function AdminIngestion() {
  const [mode, setMode] = useState<Mode>("document");
  const [title, setTitle] = useState("New Security Policy");
  const [text, setText] = useState("Security reviews are required before production deployment.");
  const [topic, setTopic] = useState("Access Review Controls");
  const [contentType, setContentType] = useState<"document" | "pdf" | "data" | "json" | "text">("document");
  const [department, setDepartment] = useState("Global");
  const [classification, setClassification] = useState<"public" | "internal" | "restricted">("internal");
  const [tags, setTags] = useState("policy,controls");
  const [count, setCount] = useState(3);
  const [files, setFiles] = useState<File[]>([]);
  const [folderPath, setFolderPath] = useState("");
  const [archiveAfterIngest, setArchiveAfterIngest] = useState(false);
  const [maxFiles, setMaxFiles] = useState(25);
  const [settings, setSettings] = useState<FileIngestionSettings | null>(null);
  const [job, setJob] = useState<IngestionJobStatus | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFileIngestionSettings()
      .then((value) => {
        setSettings(value);
        setFolderPath(value.watch_folder);
      })
      .catch(() => setSettings(null));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setJob(null);
    setUploadedCount(0);
    const tagList = tags.split(",").map((tag) => tag.trim()).filter(Boolean);

    try {
      if (mode === "document") {
        setJob(await createIngestionJob({ title, text, source_type: "manual", department, classification, tags: tagList }));
      } else if (mode === "synthetic") {
        setJob(await createSyntheticJob({ content_type: contentType, topic, department, classification, count, tags: tagList }));
      } else if (mode === "upload") {
        if (!files.length) {
          throw new Error("Choose at least one file to upload.");
        }
        const uploaded = await uploadIngestionFiles(files, { department, classification, tags: tagList });
        setUploadedCount(uploaded.length);
      } else {
        setJob(
          await createFolderIngestionJob({
            folder_path: folderPath || null,
            department,
            classification,
            tags: tagList,
            archive_after_ingest: archiveAfterIngest,
            max_files: maxFiles,
          }),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingestion request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminShell title="Ingestion" eyebrow="Knowledge Operations">
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <section className="rounded border border-slate-200 bg-white p-5">
          <div className="mb-5 flex flex-wrap gap-1 rounded border border-slate-200 bg-slate-50 p-1">
            <ModeButton active={mode === "document"} onClick={() => setMode("document")} icon={<FilePlus2 size={16} aria-hidden="true" />} label="Text" />
            <ModeButton active={mode === "upload"} onClick={() => setMode("upload")} icon={<Upload size={16} aria-hidden="true" />} label="Upload" />
            <ModeButton active={mode === "folder"} onClick={() => setMode("folder")} icon={<FolderCog size={16} aria-hidden="true" />} label="Folder" />
            <ModeButton active={mode === "synthetic"} onClick={() => setMode("synthetic")} icon={<Wand2 size={16} aria-hidden="true" />} label="Synthetic" />
          </div>

          <div className="grid gap-4">
            {mode === "document" && (
              <>
                <Field label="Title" value={title} onChange={setTitle} />
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Text</span>
                  <textarea value={text} onChange={(event) => setText(event.target.value)} rows={10} className="rounded border border-slate-200 p-3 outline-none focus:border-slate-500" />
                </label>
              </>
            )}

            {mode === "upload" && (
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Files</span>
                <input type="file" multiple accept=".txt,.md,.csv,.json" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} className="rounded border border-slate-200 p-3 text-sm" />
                <span className="text-xs text-slate-500">Supported now: TXT, Markdown, CSV, JSON. PDF/DOCX can be added next with parser dependencies.</span>
              </label>
            )}

            {mode === "folder" && (
              <>
                <Field label="Folder Path" value={folderPath} onChange={setFolderPath} />
                <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Docker default maps host <span className="font-mono">data/ingest</span> to container <span className="font-mono">{settings?.watch_folder ?? "/app/watch"}</span>.
                </div>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Max Files</span>
                  <input type="number" min={1} max={200} value={maxFiles} onChange={(event) => setMaxFiles(Number(event.target.value))} className="h-10 rounded border border-slate-200 px-3" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={archiveAfterIngest} onChange={(event) => setArchiveAfterIngest(event.target.checked)} />
                  Archive files after successful ingestion
                </label>
              </>
            )}

            {mode === "synthetic" && (
              <>
                <Field label="Topic" value={topic} onChange={setTopic} />
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Content Type</span>
                  <select value={contentType} onChange={(event) => setContentType(event.target.value as typeof contentType)} className="h-10 rounded border border-slate-200 bg-white px-3">
                    <option value="document">Document</option>
                    <option value="pdf">PDF-like</option>
                    <option value="data">Data</option>
                    <option value="json">JSON</option>
                    <option value="text">Text</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Count</span>
                  <input type="number" min={1} max={25} value={count} onChange={(event) => setCount(Number(event.target.value))} className="h-10 rounded border border-slate-200 px-3" />
                </label>
              </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Department" value={department} onChange={setDepartment} />
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Classification</span>
                <select value={classification} onChange={(event) => setClassification(event.target.value as typeof classification)} className="h-10 rounded border border-slate-200 bg-white px-3">
                  <option value="public">Public</option>
                  <option value="internal">Internal</option>
                  <option value="restricted">Restricted</option>
                </select>
              </label>
            </div>
            <Field label="Tags" value={tags} onChange={setTags} />
          </div>
        </section>

        <aside className="rounded border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Submit</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Text, synthetic, and folder scans create async jobs. File uploads ingest immediately after parsing.</p>
          {settings && (
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="font-medium text-slate-900">Folder configuration</div>
              <div className="mt-2 font-mono">{settings.watch_folder}</div>
              <div className="mt-2">{settings.allowed_extensions.join(", ")}</div>
            </div>
          )}
          {error && <div className="mt-4"><ErrorBanner message={error} /></div>}
          {uploadedCount > 0 && (
            <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Uploaded and ingested {uploadedCount} document{uploadedCount === 1 ? "" : "s"}.
            </div>
          )}
          {job && (
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{job.job_id}</span>
                <StatusBadge value={job.status} />
              </div>
              <div className="mt-2 text-slate-500">{job.job_type} - {new Date(job.created_at).toLocaleString()}</div>
            </div>
          )}
          <button type="submit" disabled={submitting} className="mt-5 inline-flex h-10 w-full items-center justify-center rounded bg-slate-950 px-4 text-sm font-medium text-white disabled:bg-slate-400">
            {submitting ? "Submitting..." : mode === "upload" ? "Upload and ingest" : "Create ingestion job"}
          </button>
        </aside>
      </form>
    </AdminShell>
  );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-medium ${active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>
      {icon}
      {label}
    </button>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded border border-slate-200 px-3 outline-none focus:border-slate-500" />
    </label>
  );
}
