export function FourColorBar({
  pass,
  fail,
  hitl,
  notRun,
  onClickFail,
  onClickHitl,
}: {
  pass: number;
  fail: number;
  hitl: number;
  notRun: number;
  onClickFail?: () => void;
  onClickHitl?: () => void;
}) {
  const total = pass + fail + hitl + notRun || 1;

  return (
    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
      <div className="bg-[#9AB17A] transition-all" style={{ width: `${(pass / total) * 100}%` }} title={`PASS: ${pass}`} />
      <div
        className={`bg-[#FF9A86] transition-all ${onClickFail ? 'cursor-pointer hover:opacity-80' : ''}`}
        style={{ width: `${(fail / total) * 100}%` }}
        onClick={onClickFail}
        title={`FAIL: ${fail}`}
      />
      <div
        className={`bg-[#FFF0BE] transition-all ${onClickHitl ? 'cursor-pointer hover:opacity-80' : ''}`}
        style={{ width: `${(hitl / total) * 100}%` }}
        onClick={onClickHitl}
        title={`HITL: ${hitl}`}
      />
      <div className="bg-[#BFC6C4] transition-all" style={{ width: `${(notRun / total) * 100}%` }} title={`미실행: ${notRun}`} />
    </div>
  );
}
