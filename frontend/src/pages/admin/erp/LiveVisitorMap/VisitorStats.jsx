import { Users, Globe, BarChart3, TrendingUp, Activity } from 'lucide-react';

export default function VisitorStats({ stats, loading, theme }) {
  const cards = [
    {
      label: 'Total Visitors',
      value: stats.total?.toLocaleString() ?? 0,
      icon: Users,
      color: '#38bdf8',
      bgColor: 'rgba(56,189,248,0.12)',
      subtext: 'Tracked period',
    },
    {
      label: 'Live Visitors',
      value: stats.liveVisitors?.toLocaleString() ?? 0,
      icon: Activity,
      color: '#34d399',
      bgColor: 'rgba(52,211,153,0.12)',
      live: true,
      subtext: 'Active right now',
    },
    {
      label: 'Countries',
      value: stats.countries?.toLocaleString() ?? 0,
      icon: Globe,
      color: '#c084fc',
      bgColor: 'rgba(192,132,252,0.12)',
      subtext: 'Unique origins',
    },
    {
      label: 'Total Clicks',
      value: (stats.totalClicks || stats.total)?.toLocaleString() ?? 0,
      icon: BarChart3,
      color: '#fbbf24',
      bgColor: 'rgba(251,191,36,0.12)',
      subtext: 'UTM link clicks',
    },
    {
      label: 'Conversion Rate',
      value: `${stats.conversionRate ?? 0}%`,
      icon: TrendingUp,
      color: '#f43f5e',
      bgColor: 'rgba(244,63,94,0.12)',
      subtext: 'Goal conversions',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            style={{
              background: theme.panelStrong,
              borderRadius: 18,
              border: `1px solid ${theme.border}`,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              boxShadow: theme.shadow,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: card.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid rgba(148,163,184,0.12)',
              }}
            >
              <Icon size={18} color={card.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                {card.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: theme.text, lineHeight: 1.1 }}>
                  {loading ? '—' : card.value}
                </div>
                {card.live && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#34d399',
                      background: 'rgba(52,211,153,0.12)',
                      padding: '2px 6px',
                      borderRadius: 6,
                      border: '1px solid rgba(52,211,153,0.25)',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'livePulse 2s infinite' }} />
                    Live
                  </div>
                )}
              </div>
              <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 4 }}>
                {card.subtext}
              </div>
            </div>
          </div>
        );
      })}
      <style>{`@keyframes livePulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.2); } }`}</style>
    </div>
  );
}
