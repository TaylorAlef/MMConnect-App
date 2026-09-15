import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })

type Job = {
  id: string
  company_id: string
  provider: 'SAP' | 'PHC' | 'PRIMAVERA' | 'ORACLE' | 'WEBHOOK'
  operation: string
  entity_type: string
  entity_id: string | null
  status: string
  payload: Record<string, unknown>
  attempts: number
}

function endpointFor(provider: Job['provider']) {
  const map: Record<Job['provider'], string | undefined> = {
    SAP: Deno.env.get('SAP_WEBHOOK_URL'),
    PHC: Deno.env.get('PHC_WEBHOOK_URL'),
    PRIMAVERA: Deno.env.get('PRIMAVERA_WEBHOOK_URL'),
    ORACLE: Deno.env.get('ORACLE_WEBHOOK_URL'),
    WEBHOOK: Deno.env.get('DEFAULT_WEBHOOK_URL'),
  }
  return map[provider]
}

function secretFor(provider: Job['provider']) {
  const map: Record<Job['provider'], string | undefined> = {
    SAP: Deno.env.get('SAP_WEBHOOK_SECRET'),
    PHC: Deno.env.get('PHC_WEBHOOK_SECRET'),
    PRIMAVERA: Deno.env.get('PRIMAVERA_WEBHOOK_SECRET'),
    ORACLE: Deno.env.get('ORACLE_WEBHOOK_SECRET'),
    WEBHOOK: Deno.env.get('DEFAULT_WEBHOOK_SECRET'),
  }
  return map[provider]
}

async function claim(job: Job) {
  const { data, error } = await supabase
    .from('integration_jobs')
    .update({ status: 'PROCESSING', attempts: job.attempts + 1 })
    .eq('id', job.id)
    .eq('status', 'PENDING')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

async function processJob(job: Job) {
  const claimed = await claim(job)
  if (!claimed) return { id: job.id, status: 'SKIPPED', reason: 'Already claimed' }

  const endpoint = endpointFor(job.provider)
  if (!endpoint) {
    await supabase.from('integration_jobs').update({ status: 'SKIPPED', last_error: 'Endpoint não configurado para este provider.', processed_at: new Date().toISOString() }).eq('id', job.id)
    return { id: job.id, status: 'SKIPPED', reason: 'Endpoint not configured' }
  }

  const secret = secretFor(job.provider)
  const body = JSON.stringify({
    source: 'teconnect',
    job_id: job.id,
    company_id: job.company_id,
    provider: job.provider,
    operation: job.operation,
    entity_type: job.entity_type,
    entity_id: job.entity_id,
    payload: job.payload,
    sent_at: new Date().toISOString(),
  })

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-teconnect-job-id': job.id,
        ...(secret ? { authorization: `Bearer ${secret}` } : {}),
      },
      body,
    })

    const responseText = await response.text()
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${responseText.slice(0, 500)}`)

    await supabase.from('integration_jobs').update({ status: 'PROCESSED', last_error: null, processed_at: new Date().toISOString() }).eq('id', job.id)
    return { id: job.id, status: 'PROCESSED' }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const nextStatus = job.attempts + 1 >= 5 ? 'FAILED' : 'PENDING'
    await supabase.from('integration_jobs').update({ status: nextStatus, last_error: message }).eq('id', job.id)
    return { id: job.id, status: nextStatus, error: message }
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: { 'content-type': 'application/json' } })

  try {
    const { data: jobs, error } = await supabase
      .from('integration_jobs')
      .select('id,company_id,provider,operation,entity_type,entity_id,status,payload,attempts')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(25)
    if (error) throw error

    const results = []
    for (const job of (jobs ?? []) as Job[]) results.push(await processJob(job))
    return new Response(JSON.stringify({ processed: results.length, results }), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
})
