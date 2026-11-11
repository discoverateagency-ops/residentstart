const STYLES: Record<string, string> = {
  funding: "text-[#B54708] bg-[#FEF0C7]",
  funded: "text-[#027A48] bg-[#D1FADF]",
  in_construction: "text-[#175CD3] bg-[#D1E9FF]",
  completed: "text-[#344054] bg-[#F2F4F7]",
  paid: "text-[#027A48] bg-[#D1FADF]",
  verified: "text-[#027A48] bg-[#D1FADF]",
  approved: "text-[#027A48] bg-[#D1FADF]",
  active: "text-[#027A48] bg-[#D1FADF]",
  open: "text-[#B54708] bg-[#FEF0C7]",
  pending: "text-[#B54708] bg-[#FEF0C7]",
  due: "text-[#B54708] bg-[#FEF0C7]",
  "not verified": "text-[#B54708] bg-[#FEF0C7]",
  expired: "text-[#B42318] bg-[#FEE4E2]",
  failed: "text-[#B42318] bg-[#FEE4E2]",
  rejected: "text-[#B42318] bg-[#FEE4E2]",
  cancelled: "text-[#B42318] bg-[#FEE4E2]",
};
const LABEL: Record<string, string> = { in_construction: "in construction" };

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>
      {LABEL[status] ?? status}
    </span>
  );
}
