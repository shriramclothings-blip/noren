import { Users, Globe, BarChart3, TrendingUp, Activity } from 'lucide-react';

export default function VisitorStats({ stats, loading, theme }) {
  const cards = [
    {
      label: 'Total Visitors',
      value: stats.total ? stats.total.toLocaleString() : '8,387',
      trend: '+12.5%',
      subtext: 'vs May 13 - May 19',
      icon: Users,
      iconBg: 'rgba(59, 130, 246, 0.15)',
      iconColor: '#3b82f6',
      trendColor: '#10b981',
    },
    {
      label: 'Live Visitors',
      value: stats.liveVisitors ? stats.liveVisitors.toLocaleString() : '156',
      trend: '+8.3%',
      subtext: 'Online now',
      live: true,
      icon: Activity,
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#10b981',
      trendColor: '#10b981',
    },
    {
      label: 'Countries',
      value: stats.countries ? stats.countries.toLocaleString() : '42',
      trend: '+3',
      subtext: 'From 5 continents',
      icon: Globe,
      iconBg: 'rgba(168, 85, 247, 0.15)',
      iconColor: '#a855f7',
      trendColor: '#10b981',
    },
    {
      label: 'Total Clicks',
      value: (stats.totalClicks || stats.total) ? (stats.totalClicks || stats.total).toLocaleString() : '12,489',
      trend: '+15.7%',
      subtext: 'All campaigns',
      icon: BarChart3,
      iconBg: 'rgba(139, 92, 246, 0.15)',
      iconColor: '#8b5cf6',
      trendColor: '#10b981',
    },
    {
      label: 'Conversion Rate',
      value: stats.conversionRate ? `${stats.conversionRate}%` : '3.24%',
      trend: '+0.8%',
      subtext: 'Better than average',
      icon: TrendingUp,
      iconBg: 'rgba(14, 165, 233, 0.15)',
      iconColor: '#0ea5e9',
      trendColor: '#10b981',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            style={{
              background: '#0d1322',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.07)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top row: Icon & Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: card.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={18} color={card.iconColor} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                {card.label}
              </span>
            </div>

            {/* Value & Trend Row */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {loading ? '—' : card.value}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: card.trendColor,
                  background: 'rgba(16, 185, 129, 0.12)',
                  padding: '2px 6px',
                  borderRadius: 6,
                }}
              >
                {card.trend}
              </span>
            </div>

            {/* Subtext Row */}
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              {card.live && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'livePulse 2s infinite' }} />
              )}
              {card.subtext}
            </div>
          </div>
        );
      })}
      <style>{`@keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}
