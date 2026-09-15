import { useEffect, useRef, useState } from 'react';

const TABLES = [
  'employees',
  'time_entries',
  'attendance_days',
  'shifts',
  'shift_assignments',
  'vacation_requests',
  'overtime_records',
  'timesheet_adjustments',
  'absences',
  'timesheets',
  'notifications',
  'hr_alerts',
  'hr_tasks',
  'hr_task_audit',
  'payroll_runs',
  'payroll_items',
  'integration_jobs',
  'picagens',
];

export function useRealtimeCompany(supabase, companyId, onChange) {
  const callbackRef = useRef(onChange);
  const [status, setStatus] = useState('DISCONNECTED');

  useEffect(() => { callbackRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!companyId) return undefined;

    const channel = supabase.channel(`teconnect-company-${companyId}`);

    TABLES.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `company_id=eq.${companyId}` },
        (payload) => callbackRef.current?.({ table, payload }),
      );
    });

    channel.subscribe((nextStatus) => setStatus(nextStatus));
    return () => { supabase.removeChannel(channel); setStatus('DISCONNECTED'); };
  }, [supabase, companyId]);

  return { status };
}

export const realtimeTables = TABLES;
