export function PageTitle({ title }: { title: string }) {
  return (
    <div className="bg-white border-b border-[#f0f0f0] px-6 py-3 flex-shrink-0">
      <div className="text-base font-semibold text-[#1a1a2e]">{title}</div>
    </div>
  );
}
