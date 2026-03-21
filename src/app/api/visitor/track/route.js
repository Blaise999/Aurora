import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db/supabase';
import { notifyNewVisitor } from '@/lib/ntfy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '0.0.0.0';
}

async function getGeo(ip) {
  const fallback = {
    country: null,
    region: null,
    city: null,
    lat: null,
    lon: null,
    isp: null,
  };

  if (!ip || ip === '0.0.0.0' || ip === '::1' || ip === '127.0.0.1') {
    return fallback;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    // keep this simple for now; geo must never block visitor logging
    const geoRes = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=country,regionName,city,lat,lon,isp`,
      {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      }
    );

    if (!geoRes.ok) return fallback;

    const geoData = await geoRes.json();

    return {
      country: geoData.country || null,
      region: geoData.regionName || null,
      city: geoData.city || null,
      lat: geoData.lat || null,
      lon: geoData.lon || null,
      isp: geoData.isp || null,
    };
  } catch (e) {
    console.error('[visitor/track] geo lookup failed:', e?.message || e);
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { page_path, referrer, userAgent } = body || {};

    const ip = getClientIp(req);
    const geo = await getGeo(ip);

    const sb = getSupabase();

    const { data, error } = await sb
      .from('visitor_logs')
      .insert({
        ip_address: ip,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        latitude: geo.lat,
        longitude: geo.lon,
        isp: geo.isp,
        user_agent: userAgent || req.headers.get('user-agent') || null,
        page_path: page_path || '/',
        referrer: referrer || null,
      })
      .select()
      .single();

    if (error) throw error;

    const { error: adminNotifError } = await sb.from('admin_notifications').insert({
      type: 'visitor',
      title: 'New Visitor',
      body: `IP: ${ip} | ${[geo.city, geo.country].filter(Boolean).join(', ') || 'Unknown'}`,
      metadata: { ip, ...geo, page_path: page_path || '/' },
    });

    if (adminNotifError) {
      console.error('[visitor/track] admin_notifications insert failed:', adminNotifError);
    }

    let ntfyResult = null;

    try {
      ntfyResult = await notifyNewVisitor({
        ip,
        city: geo.city,
        country: geo.country,
        page: page_path || '/',
      });

      console.log('[visitor/track] ntfy result:', ntfyResult);
    } catch (notifyErr) {
      console.error('[visitor/track] notifyNewVisitor crashed:', notifyErr);
    }

    return NextResponse.json({
      ok: true,
      visitor: data,
      ntfy: ntfyResult, // keep temporarily for debugging
    });
  } catch (err) {
    console.error('[visitor/track] fatal:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to track visitor' },
      { status: 500 }
    );
  }
}