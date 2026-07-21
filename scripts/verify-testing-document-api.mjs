/**
 * Verifies frontend parsing for the documented testing-documents API contract.
 * Run: node scripts/verify-testing-document-api.mjs
 */

const SAMPLE_UPLOAD_201 = {
  success: true,
  message: 'Testing document uploaded successfully',
  data: {
    id: 15,
    project: { id: 12, name: 'Satis Thane' },
    title: 'Concrete Cube Test',
    remarks: '28-day strength test',
    document_type: 'pdf',
    file_name: 'cube_test.pdf',
    file_url: 'https://pmcproject.s3.ap-south-1.amazonaws.com/testing/12/2026/07/abcd.pdf',
    file_size: 524123,
    mime_type: 'application/pdf',
    test_date: '2026-07-20',
    month: 7,
    year: 2026,
    uploaded_by: {
      id: 84,
      username: 'pmc_qaqc12',
      role: 'QAQC Site Engineer',
    },
    created_at: '2026-07-20T11:00:00.000000Z',
    updated_at: '2026-07-20T11:00:00.000000Z',
    is_active: true,
  },
};

const SAMPLE_LIST_200 = {
  success: true,
  message: 'Testing documents retrieved successfully',
  data: {
    count: 1,
    next: null,
    previous: null,
    results: [SAMPLE_UPLOAD_201.data],
  },
};

function unwrapApiData(data) {
  if (data && typeof data === 'object' && 'data' in data) return data.data;
  return data;
}

function normalizeTestingDocument(row) {
  const project = row?.project;
  const uploadedBy = row?.uploaded_by ?? row?.uploadedBy;
  return {
    id: Number(row?.id) || 0,
    projectId: Number(typeof project === 'object' ? project?.id : row?.project_id) || 0,
    projectName: String((typeof project === 'object' ? project?.name : '') ?? ''),
    title: String(row?.title ?? ''),
    remarks: String(row?.remarks ?? ''),
    documentType: String(row?.document_type ?? ''),
    fileName: String(row?.file_name ?? ''),
    fileUrl: String(row?.file_url ?? ''),
    fileSize: Number(row?.file_size) || 0,
    mimeType: String(row?.mime_type ?? ''),
    testDate: String(row?.test_date ?? ''),
    month: Number(row?.month) || 0,
    year: Number(row?.year) || 0,
    uploadedByUsername:
      typeof uploadedBy === 'object' ? String(uploadedBy?.username ?? '') : '',
    uploadedByRole: typeof uploadedBy === 'object' ? String(uploadedBy?.role ?? '') : '',
  };
}

function normalizeTestingDocumentResponse(payload) {
  const unwrapped = unwrapApiData(payload) ?? payload;
  if (!unwrapped || typeof unwrapped !== 'object') return null;
  const doc = normalizeTestingDocument(unwrapped);
  return doc.id ? doc : null;
}

function collectTestingDocuments(payload) {
  const unwrapped = unwrapApiData(payload) ?? payload;
  if (!unwrapped || typeof unwrapped !== 'object') return [];
  const results = unwrapped.results ?? unwrapped.data ?? unwrapped;
  if (Array.isArray(results)) {
    return results.map(normalizeTestingDocument).filter((d) => d.id);
  }
  if (results && typeof results === 'object') {
    const nested = results.results;
    if (Array.isArray(nested)) {
      return nested.map(normalizeTestingDocument).filter((d) => d.id);
    }
    const single = normalizeTestingDocument(results);
    return single.id ? [single] : [];
  }
  return [];
}

function parseTestingDocumentMutationResponse(payload) {
  const body = payload && typeof payload === 'object' ? payload : {};
  return {
    document: normalizeTestingDocumentResponse(payload),
    message: String(body.message ?? ''),
    success: body.success === true,
  };
}

const uploadParsed = parseTestingDocumentMutationResponse(SAMPLE_UPLOAD_201);
const listParsed = collectTestingDocuments(SAMPLE_LIST_200);

const checks = [
  ['upload success', uploadParsed.success === true],
  ['upload message', uploadParsed.message === 'Testing document uploaded successfully'],
  ['upload id', uploadParsed.document?.id === 15],
  ['upload projectId', uploadParsed.document?.projectId === 12],
  ['upload projectName', uploadParsed.document?.projectName === 'Satis Thane'],
  ['upload title', uploadParsed.document?.title === 'Concrete Cube Test'],
  ['upload month/year', uploadParsed.document?.month === 7 && uploadParsed.document?.year === 2026],
  ['upload uploader', uploadParsed.document?.uploadedByUsername === 'pmc_qaqc12'],
  ['list count', listParsed.length === 1],
  ['list first id', listParsed[0]?.id === 15],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failed += 1;
}

console.log('\n--- Normalized upload document ---');
console.log(JSON.stringify(uploadParsed.document, null, 2));

console.log('\n--- Expected multipart POST fields ---');
console.log(
  JSON.stringify(
    {
      project: '12',
      title: 'Concrete Cube Test',
      remarks: '28-day strength test',
      test_date: '2026-07-20',
      file: '<binary file: cube_test.pdf>',
    },
    null,
    2,
  ),
);

process.exit(failed ? 1 : 0);
