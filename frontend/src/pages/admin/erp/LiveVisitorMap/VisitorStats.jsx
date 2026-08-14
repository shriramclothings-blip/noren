import { Users, Globe, BarChart3, TrendingUp } from 'lucide-react';

export default function VisitorStats({ stats, loading, theme }) {
  const cards = [
    {
      label: 'Total Visitors',
      value: stats.total,
      icon: Users,
      color: '#8ab4ff',
      bgColor: 'rgba(59,130,246,0.14)',
      trend: '+12.6%',
    },
    {
      label: 'Live Visitors',
      value: 156,
      icon: Users,
      color: '#8ef1d1',
      bgColor: 'rgba(16,185,129,0.12)',
      trend: '+8.3%',
      live: true,
    },
    {
      label: 'Countries',
      value: stats.countries,
      icon: Globe,
      color: '#d4b5ff',
      bgColor: 'rgba(168,85,247,0.12)',
      trend: '+1',
    },
    {
      label: 'Total Clicks',
      value: stats.totalClicks,
      icon: BarChart3,
      color: '#ffd27a',
      bgColor: 'rgba(245,158,11,0.12)',
      trend: '+13.7%',
    },
    {
      label: 'Conversion Rate',
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      color: '#ff8ecf',
      bgColor: 'rgba(236,72,153,0.12)',
      trend: '+0.8%',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            style={{
              background: theme.panelStrong,
              borderRadius: 20,
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
                width: 44,
                height: 44,
                borderRadius: 12,
                background: card.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid rgba(148,163,184,0.14)',
              }}
            >
              <Icon size={18} color={card.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                {card.label}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 26, fontWeight: 800, color: theme.text, lineHeight: 1.1 }}>
                  {loading ? '—' : card.value}
                </div>
                {card.live && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#8ef1d1',
                      background: 'rgba(16,185,129,0.12)',
                      padding: '3px 6px',
                      borderRadius: 6,
                      border: '1px solid rgba(16,185,129,0.18)',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
                    Live
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#7dd3fc', marginTop: 6 }}>
                {card.trend}
              </div>
            </div>
          </div>
        );
      })}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}
