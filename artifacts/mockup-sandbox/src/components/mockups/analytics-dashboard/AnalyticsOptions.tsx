import React from 'react';
import { Scorecard } from './Scorecard';
import { Dashboard } from './Dashboard';
import { Journey } from './Journey';

function OptionLabel({ letter, name, description }: { letter: string; name: string; description: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1e293b', borderRadius: 100, padding: '6px 16px', marginBottom: 8 }}>
        <span style={{ background: '#3b82f6', color: '#fff', fontWeight: 900, fontSize: 12, width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{letter}</span>
        <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>{name}</span>
      </div>
      <div style={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>{description}</div>
    </div>
  );
}

export function AnalyticsOptions() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 40,
      padding: '48px 40px 60px',
      background: '#f8fafc',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center', position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 0 0', color: '#94a3b8', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        LazyTopper — Me Page Redesign · Pick a direction
      </div>

      {/* Option A */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <OptionLabel letter="A" name="Scorecard" description="Dark · Gamified · Competitive" />
        <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
          <Scorecard />
        </div>
      </div>

      {/* Option B */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <OptionLabel letter="B" name="Dashboard" description="Light · Data-Rich · LMS-style" />
        <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
          <Dashboard />
        </div>
      </div>

      {/* Option C */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <OptionLabel letter="C" name="Journey" description="Warm · Motivational · Story-driven" />
        <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
          <Journey />
        </div>
      </div>
    </div>
  );
}
