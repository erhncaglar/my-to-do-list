type DashboardHeaderProps = {
  userDisplayName: string;
  now: Date;
  formatNow: (date: Date) => string;
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
}: DashboardHeaderProps) {
  const isMobile = window.innerWidth < 768;

  return (
    <div>
      <div style={welcomeEyebrow}>Günlük Akış</div>

      <h1
        style={{
          margin: 0,
          fontSize: isMobile ? 22 : 30,
          fontWeight: 800,
          lineHeight: 1.1,
        }}
      >
        Merhaba, {userDisplayName}
      </h1>

      <p
        style={{
          margin: "8px 0 0",
          opacity: 0.78,
          fontSize: isMobile ? 14 : 16,
        }}
      >
        {formatNow(now)}
      </p>

      <div
        style={{
          ...summaryWrap,
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr 1fr"
            : "repeat(5, minmax(112px, 1fr))",
          gap: 12,
          width: "100%",
          marginTop: 16,
        }}
      >
        <div
          style={{
            ...metricCard,
            minWidth: "unset",
            padding: isMobile ? 12 : 14,
          }}
        >
          <div style={metricLabel}>Toplam</div>
          <div style={metricValue}>{totalCount}</div>
        </div>

        <div
          style={{
            ...metricCard,
            minWidth: "unset",
            padding: isMobile ? 12 : 14,
          }}
        >
          <div style={metricLabel}>Açık</div>
          <div style={metricValue}>{openTaskCount}</div>
        </div>

        <div
          style={{
            ...metricCard,
            minWidth: "unset",
            padding: isMobile ? 12 : 14,
          }}
        >
          <div style={metricLabel}>Tamamlanan</div>
          <div style={metricValue}>{doneTaskCount}</div>
        </div>

        <div
          style={{
            ...metricCard,
            minWidth: "unset",
            padding: isMobile ? 12 : 14,
          }}
        >
          <div style={metricLabel}>Geciken</div>
          <div style={metricValue}>{overdueCount}</div>
        </div>

        <div
          style={{
            ...metricCard,
            minWidth: "unset",
            padding: isMobile ? 12 : 14,
          }}
        >
          <div style={metricLabel}>Arşiv</div>
          <div style={metricValue}>{archivedCount}</div>
        </div>
      </div>
    </div>
  );
}