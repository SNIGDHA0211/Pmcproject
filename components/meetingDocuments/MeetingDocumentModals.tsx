import React, { useEffect, useState } from 'react';
import { ModalPortal } from '../ModalPortal';
import { Icons } from '../Icons';
import type { Project } from '../../types';
import type {
  MeetingDocumentRecord,
  MeetingDocumentType,
  MeetingDocumentsByProject,
} from '../../types/meetingDocuments';
import {
  MEETING_DOCUMENT_ACCEPT,
  formatMeetingDateTime,
  formatMeetingDisplayDate,
  formatMeetingFileSize,
  validateMeetingDocumentFile,
} from '../../utils/meetingDocuments';
import { getThemeClasses, useTheme } from '../../utils/theme';

export type MeetingDocumentModalMode =
  | 'upload'
  | 'view'
  | 'edit'
  | 'version'
  | 'delete'
  | 'project';

interface MeetingDocumentModalsProps {
  mode: MeetingDocumentModalMode | null;
  document: MeetingDocumentRecord | null;
  projects: Project[];
  projectDocuments: MeetingDocumentsByProject | null;
  projectDocumentsLoading?: boolean;
  isSaving?: boolean;
  uploadProgress?: number;
  error?: string | null;
  onClose: () => void;
  onUpload: (formData: FormData) => Promise<void>;
  onEdit: (payload: {
    title: string;
    description: string;
    meeting_date: string;
    meeting_number: string;
  }) => Promise<void>;
  onUploadVersion: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  onDownload: (doc: MeetingDocumentRecord) => Promise<void>;
}

const MeetingDocumentModals: React.FC<MeetingDocumentModalsProps> = ({
  mode,
  document,
  projects,
  projectDocuments,
  projectDocumentsLoading = false,
  isSaving = false,
  uploadProgress = 0,
  error,
  onClose,
  onUpload,
  onEdit,
  onUploadVersion,
  onDelete,
  onDownload,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [project, setProject] = useState('');
  const [meetingType, setMeetingType] = useState<MeetingDocumentType>('MOM');
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingNumber, setMeetingNumber] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!mode) return;
    setLocalError(null);
    if (mode === 'upload') {
      setProject('');
      setMeetingType('MOM');
      setTitle('');
      setMeetingDate('');
      setMeetingNumber('');
      setDescription('');
      setFile(null);
    }
    if ((mode === 'edit' || mode === 'view') && document) {
      setTitle(document.title);
      setDescription(document.description ?? '');
      setMeetingDate(document.meetingDate?.slice(0, 10) ?? '');
      setMeetingNumber(document.meetingNumber ?? '');
    }
    if (mode === 'version') {
      setFile(null);
    }
  }, [mode, document]);

  if (!mode) return null;

  const shellClass = `flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:rounded-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`;
  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 ${themeClasses.input}`;
  const labelClass = `mb-1 block text-[10px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`;

  const submitUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!project.trim()) {
      setLocalError('Project is required.');
      return;
    }
    if (!title.trim()) {
      setLocalError('Title is required.');
      return;
    }
    if (!meetingDate) {
      setLocalError('Meeting date is required.');
      return;
    }
    const fileError = validateMeetingDocumentFile(file);
    if (fileError) {
      setLocalError(fileError);
      return;
    }

    const formData = new FormData();
    formData.append('project_name', project.trim());
    formData.append('meeting_type', meetingType);
    formData.append('title', title.trim());
    formData.append('meeting_date', meetingDate);
    if (meetingNumber.trim()) formData.append('meeting_number', meetingNumber.trim());
    if (description.trim()) formData.append('description', description.trim());
    formData.append('file', file as File);
    await onUpload(formData);
  };

  const submitEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setLocalError('Title is required.');
      return;
    }
    if (!meetingDate) {
      setLocalError('Meeting date is required.');
      return;
    }
    await onEdit({
      title: title.trim(),
      description: description.trim(),
      meeting_date: meetingDate,
      meeting_number: meetingNumber.trim(),
    });
  };

  const submitVersion = async (event: React.FormEvent) => {
    event.preventDefault();
    const fileError = validateMeetingDocumentFile(file);
    if (fileError) {
      setLocalError(fileError);
      return;
    }
    await onUploadVersion(file as File);
  };

  const renderHeader = (heading: string, subtitle: string) => (
    <div className={`shrink-0 border-b px-4 py-3 sm:px-5 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`text-base font-black uppercase tracking-tight sm:text-lg ${themeClasses.textPrimary}`}>
            {heading}
          </h3>
          <p className={`mt-0.5 text-[11px] leading-snug ${themeClasses.textSecondary}`}>{subtitle}</p>
        </div>
        <button type="button" onClick={onClose} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${themeClasses.buttonSecondary}`}>
          Close
        </button>
      </div>
    </div>
  );

  const renderFooter = (primaryLabel: string, danger = false) => (
    <div className={`flex shrink-0 gap-2 border-t px-4 py-3 sm:px-5 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
      <button type="button" onClick={onClose} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold ${themeClasses.buttonSecondary}`}>
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSaving}
        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 ${
          danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
        }`}
      >
        {isSaving ? 'Please wait…' : primaryLabel}
      </button>
    </div>
  );

  const renderProjectGroups = (
    groups: MeetingDocumentsByProject['momDocuments'],
    label: string,
  ) => (
    <div className="space-y-2">
      <h4 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>{label}</h4>
      {groups.length === 0 ? (
        <p className={`text-xs ${themeClasses.textMuted}`}>No {label.toLowerCase()}.</p>
      ) : (
        groups.map((group) => {
          const key = `${group.id}-${group.title}`;
          const expanded = expandedGroups[key] ?? false;
          return (
            <div
              key={key}
              className={`rounded-xl border p-3 ${isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/70'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>{group.title}</p>
                  <p className={`mt-0.5 text-[10px] ${themeClasses.textSecondary}`}>
                    {formatMeetingDisplayDate(group.meetingDate)}
                    {group.meetingNumber ? ` · #${group.meetingNumber}` : ''}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                  v{group.latestVersion.version}
                </span>
              </div>
              <p className={`mt-2 text-[10px] ${themeClasses.textMuted}`}>
                Latest by {group.latestVersion.uploadedBy} · {formatMeetingDateTime(group.latestVersion.uploadedOn)}
              </p>
              {group.previousVersions.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setExpandedGroups((prev) => ({ ...prev, [key]: !expanded }))}
                    className="mt-2 text-[10px] font-bold text-indigo-600 hover:underline dark:text-indigo-300"
                  >
                    {expanded ? 'Hide previous versions' : `Show ${group.previousVersions.length} previous version(s)`}
                  </button>
                  {expanded && (
                    <div className="mt-2 space-y-1.5 border-t pt-2">
                      {group.previousVersions.map((version) => (
                        <div key={version.id} className={`flex justify-between gap-2 text-[10px] ${themeClasses.textSecondary}`}>
                          <span>Version {version.version}</span>
                          <span>{formatMeetingDateTime(version.uploadedOn)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <ModalPortal open>
      <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
        {mode === 'upload' && (
          <form onSubmit={submitUpload} className={shellClass}>
            {renderHeader('Upload Document', 'Upload MOM or EDL meeting documents for your projects.')}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Project *</label>
                  <select value={project} onChange={(e) => setProject(e.target.value)} className={inputClass} required>
                    <option value="">Select project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.title}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Meeting Type *</label>
                  <select value={meetingType} onChange={(e) => setMeetingType(e.target.value as MeetingDocumentType)} className={inputClass}>
                    <option value="MOM">MOM</option>
                    <option value="EDL">EDL</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Meeting Date *</label>
                  <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className={inputClass} required />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Title *</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Meeting Number</label>
                  <input type="text" value={meetingNumber} onChange={(e) => setMeetingNumber(e.target.value)} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Upload File *</label>
                  <input
                    type="file"
                    accept={MEETING_DOCUMENT_ACCEPT}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className={inputClass}
                  />
                  {file && (
                    <p className={`mt-1 text-[10px] ${themeClasses.textSecondary}`}>
                      {file.name} · {formatMeetingFileSize(file.size)}
                    </p>
                  )}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-2">
                      <div className={`h-1.5 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-100'}`}>
                        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <p className={`mt-1 text-[10px] ${themeClasses.textMuted}`}>Uploading… {uploadProgress}%</p>
                    </div>
                  )}
                </div>
              </div>
              {(localError || error) && <p className="text-xs font-bold text-rose-500">{localError || error}</p>}
            </div>
            {renderFooter('Upload')}
          </form>
        )}

        {mode === 'view' && document && (
          <div className={shellClass}>
            {renderHeader('Document Details', document.title)}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
              <div className={`grid grid-cols-2 gap-3 rounded-xl border p-3 text-sm ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
                <div><p className={labelClass}>Project</p><p className="font-semibold">{document.projectName}</p></div>
                <div><p className={labelClass}>Meeting Type</p><p className="font-semibold">{document.meetingType}</p></div>
                <div><p className={labelClass}>Meeting Date</p><p className="font-semibold">{formatMeetingDisplayDate(document.meetingDate)}</p></div>
                <div><p className={labelClass}>Version</p><p className="font-semibold">v{document.version}</p></div>
                <div><p className={labelClass}>Uploaded By</p><p className="font-semibold">{document.uploadedBy}</p></div>
                <div><p className={labelClass}>Uploaded On</p><p className="font-semibold">{formatMeetingDateTime(document.uploadedOn)}</p></div>
              </div>
              {document.description && (
                <div>
                  <p className={labelClass}>Description</p>
                  <p className={`text-sm ${themeClasses.textPrimary}`}>{document.description}</p>
                </div>
              )}
              {document.metadata && Object.keys(document.metadata).length > 0 && (
                <div>
                  <p className={labelClass}>Document Metadata</p>
                  <pre className={`overflow-x-auto rounded-lg border p-3 text-[10px] ${isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'}`}>
                    {JSON.stringify(document.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className={`flex gap-2 border-t px-4 py-3 sm:px-5 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
              <button type="button" onClick={onClose} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold ${themeClasses.buttonSecondary}`}>Close</button>
              <button
                type="button"
                onClick={() => void onDownload(document)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500"
              >
                <Icons.Download size={16} />
                Download
              </button>
            </div>
          </div>
        )}

        {mode === 'edit' && document && (
          <form onSubmit={submitEdit} className={shellClass}>
            {renderHeader('Edit Metadata', document.title)}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
              <div>
                <label className={labelClass}>Title *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Meeting Date *</label>
                  <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Meeting Number</label>
                  <input type="text" value={meetingNumber} onChange={(e) => setMeetingNumber(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
              </div>
              {(localError || error) && <p className="text-xs font-bold text-rose-500">{localError || error}</p>}
            </div>
            {renderFooter('Save Changes')}
          </form>
        )}

        {mode === 'version' && document && (
          <form onSubmit={submitVersion} className={shellClass}>
            {renderHeader('Upload New Version', `${document.title} · current v${document.version}`)}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
              <input type="file" accept={MEETING_DOCUMENT_ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={inputClass} />
              {file && (
                <p className={`text-[10px] ${themeClasses.textSecondary}`}>
                  {file.name} · {formatMeetingFileSize(file.size)}
                </p>
              )}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className={`h-1.5 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-100'}`}>
                  <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
              {(localError || error) && <p className="text-xs font-bold text-rose-500">{localError || error}</p>}
            </div>
            {renderFooter('Upload Version')}
          </form>
        )}

        {mode === 'delete' && document && (
          <div className={shellClass}>
            {renderHeader('Delete Document', 'This action cannot be undone.')}
            <div className="px-4 py-4 sm:px-5">
              <p className={`text-sm ${themeClasses.textPrimary}`}>
                Delete <strong>{document.title}</strong> (v{document.version}) from {document.projectName}?
              </p>
              {error && <p className="mt-2 text-xs font-bold text-rose-500">{error}</p>}
            </div>
            <div className={`flex gap-2 border-t px-4 py-3 sm:px-5 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
              <button type="button" onClick={onClose} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold ${themeClasses.buttonSecondary}`}>Cancel</button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void onDelete()}
                className="flex-1 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {isSaving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}

        {mode === 'project' && (
          <div className={`${shellClass} max-w-2xl`}>
            {renderHeader('Project Documents', projectDocuments?.projectName ?? 'Project')}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
              {projectDocumentsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`h-16 animate-pulse rounded-xl ${isDarkTheme ? 'bg-white/5' : 'bg-slate-100'}`} />
                  ))}
                </div>
              ) : projectDocuments ? (
                <>
                  {renderProjectGroups(projectDocuments.momDocuments, 'MOM Documents')}
                  {renderProjectGroups(projectDocuments.edlDocuments, 'EDL Documents')}
                </>
              ) : (
                <p className={`text-sm ${themeClasses.textMuted}`}>No project documents found.</p>
              )}
            </div>
            <div className={`border-t px-4 py-3 sm:px-5 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
              <button type="button" onClick={onClose} className={`w-full rounded-lg px-4 py-2.5 text-sm font-bold ${themeClasses.buttonSecondary}`}>Close</button>
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  );
};

export default React.memo(MeetingDocumentModals);
