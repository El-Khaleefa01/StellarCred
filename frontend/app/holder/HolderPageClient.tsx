const TransferExportModal = dynamic(
  () => import("@/components/TransferExportModal").then((m) => m.TransferExportModal),
  { ssr: false },
);
const TransferImportModal = dynamic(
  () => import("@/components/TransferImportModal").then((m) => m.TransferImportModal),
  { ssr: false },
);
const ExportDataModal = dynamic(
  () => import("@/components/ExportDataModal").then((m) => m.ExportDataModal),
  { ssr: false },
);
const DisclosurePreviewModal = dynamic(
  () => import("@/components/holder/DisclosurePreviewModal").then((m) => m.DisclosurePreviewModal),
  { ssr: false },
);