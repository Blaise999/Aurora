import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db/supabase';
import { notifyNewVisitor } from '@/lib/ntfy';

export async function POST(req) {
  try {
    const body = await req.json();
    const { page_path, referrer, userAgent } = body;

    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || '0.0.0.0';

    let geo = { country: null, region: null, city: null, lat: null, lon: null, isp: null };
    try {
      const geoRes = await fetch('http://ip-api.com/json/' + ip + '?fields=country,regionName,city,lat,lon,isp');
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        geo = {
          country: geoData.country || null,
          region: geoData.regionName || null,
          city: geoData.city || null,
          lat: geoData.lat || null,
          lon: geoData.lon || null,
          isp: geoData.isp || null,
        };
      }
    } catch (e) { /* geo failed */ }

    const sb = getSupabase();
    const { data, error } = await sb.from('visitor_logs').insert({
      ip_address: ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      latitude: geo.lat,
      longitude: geo.lon,
      isp: geo.isp,
      user_agent: userAgent || req.headers.get('user-agent'),
      page_path: page_path || '/',
      referrer: referrer || null,
    }).select().single();
    if (error) throw error;

    await sb.from('admin_notifications').insert({
      type: 'visitor',
      title: 'New Visitor',
      body: 'IP: ' + ip + ' | ' + ([geo.city, geo.country].filter(Boolean).join(', ') || 'Unknown'),
      metadata: { ip, ...geo, page_path },
    });

    await notifyNewVisitor({ ip, city: geo.city, country: geo.country, page: page_path });

    return NextResponse.json({ ok: true, visitor: data });
  } catch (err) {
    console.error('[visitor/track]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
