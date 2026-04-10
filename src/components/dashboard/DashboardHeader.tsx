type Props = {
  userDisplayName: string;
  now: Date;
  formatNow: (d: Date) => string;
  totalCount: number;
  openTaskCount: number;
  doneTaskCount: number;
  overdueCount: number;
  archivedCount: number;
  welcomeEyebrow: React.CSSProperties;
  summaryWrap: React.CSSProperties;
  metricCard: React.CSSProperties;
  metricLabel: React.CSSProperties;
  metricValue: React.CSSProperties;
};

export default function DashboardHeader({
  userDisplayName,
  now,
  formatNow,
  totalCount,
  openTaskCount,
  doneTaskCount,
  overdueCount,
  archivedCount,
  welcomeEyebrow,
  summaryWrap,
  metricCard,
  metricLabel,
  metricValue,
}: Props) {
  return (
    <div>
      <div style={welcomeEyebrow}>Günlük Akış</div>

      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>
        Merhaba, {userDisplayName}
      </h1>

      <p style={{ margin: "8px 0 0", opacity: 0.78 }}>{formatNow(now)}</p>

      <div style={summaryWrap}>
        <div style={metricCard}>
          <div style={metricLabel}>Toplam</div>
          <div style={metricValue}>{totalCount}</div>
        </div>

        <div style={metricCard}>
          <div style={metricLabel}>Açık</div>
          <div style={metricValue}>{openTaskCount}</div>
        </div>

        <div style={metricCard}>
          <div style={metricLabel}>Tamamlanan</div>
          <div style={metricValue}>{doneTaskCount}</div>
        </div>

        <div style={metricCard}>
          <div style={metricLabel}>Geciken</div>
          <div style={metricValue}>{overdueCount}</div>
        </div>

        <div style={metricCard}>
          <div style={metricLabel}>Arşiv</div>
          <div style={metricValue}>{archivedCount}</div>
        </div>
      </div>
    </div>
  );
}