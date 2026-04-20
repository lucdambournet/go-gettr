import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { invitationId } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: invite, error } = await supabaseAdmin
      .from('family_invitations')
      .select('*, families(name)')
      .eq('id', invitationId)
      .single();

    if (error || !invite) {
      return new Response(JSON.stringify({ error: 'Invitation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const inviteLink = `${Deno.env.get('SITE_URL') ?? 'http://localhost:5173'}/invite?token=${invite.token}`;
    const familyName = (invite.families as { name: string })?.name ?? 'your family';

    // TODO: integrate an email provider (e.g. Resend, SendGrid) here
    // Example with Resend:
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'raphael.dambournet@gmail.com',
        to: invite.email,
        subject: `You've been invited to join ${familyName} on go-gettr`,
        html: `
          <p>You've been invited to join <strong>${familyName}</strong> as a <strong>${invite.role}</strong>.</p>
          <p><a href="${inviteLink}">Click here to accept your invitation</a></p>
          <p>This link expires in 7 days.</p>
        `,
      }),
    });

    console.log(`[send-invitation] Would send email to ${invite.email} with link: ${inviteLink}`);

    return new Response(JSON.stringify({ success: true, inviteLink }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
