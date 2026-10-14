// Supabase Edge Function: mpesa-stk
// Secrets required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE,
// MPESA_PASSKEY, MPESA_CALLBACK_URL, MPESA_ENV (sandbox|production)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
const plans={starter:{amount:2500,limit:3},growth:{amount:6500,limit:12},elite:{amount:15000,limit:40}} as const;
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const stamp=()=>new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
const normalizePhone=(v:string)=>{const n=v.replace(/\D/g,'');if(n.startsWith('0'))return '254'+n.slice(1);if(n.startsWith('254'))return n;throw new Error('Use a valid Kenyan phone number.');};

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const url=new URL(req.url);
 try{
  // Safaricom callback. Keep this exact URL private to the configured application.
  if(url.pathname.endsWith('/callback')){
   const payload=await req.json();const cb=payload?.Body?.stkCallback;const checkout=cb?.CheckoutRequestID;
   if(!checkout)return json({ok:false},400);
   const success=cb.ResultCode===0;const items=cb.CallbackMetadata?.Item||[];
   const receipt=items.find((x:any)=>x.Name==='MpesaReceiptNumber')?.Value||null;
   const update:any={status:success?'paid':'failed',mpesa_receipt_number:receipt};
   if(success){update.starts_at=new Date().toISOString();const end=new Date();end.setMonth(end.getMonth()+1);update.ends_at=end.toISOString();}
   await admin.from('agent_subscriptions').update(update).eq('mpesa_checkout_request_id',checkout);
   return json({ResultCode:0,ResultDesc:'Accepted'});
  }

  const auth=req.headers.get('Authorization');if(!auth)return json({error:'Authentication required'},401);
  const token=auth.replace('Bearer ','');const{data:{user}}=await admin.auth.getUser(token);if(!user)return json({error:'Invalid session'},401);
  const body=await req.json();
  if(body.action==='status'){
   const{data}=await admin.from('agent_subscriptions').select('*').eq('agent_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();return json({subscription:data});
  }
  const plan=plans[body.plan as keyof typeof plans];if(!plan)return json({error:'Unknown plan'},400);
  const phone=normalizePhone(body.phone||'');
  const{data:agreement}=await admin.from('agent_agreements').select('id').eq('agent_id',user.id).eq('agreement_version','2026-10-09').maybeSingle();
  if(!agreement)return json({error:'Accept the current agent agreement first.'},403);
  const base=Deno.env.get('MPESA_ENV')==='production'?'https://api.safaricom.co.ke':'https://sandbox.safaricom.co.ke';
  const key=Deno.env.get('MPESA_CONSUMER_KEY')!,secret=Deno.env.get('MPESA_CONSUMER_SECRET')!;
  const basic=btoa(`${key}:${secret}`);const access=await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`,{headers:{Authorization:`Basic ${basic}`}}).then(r=>r.json());
  if(!access.access_token)throw new Error('M-Pesa authentication failed.');
  const timestamp=stamp(),shortcode=Deno.env.get('MPESA_SHORTCODE')!,password=btoa(shortcode+Deno.env.get('MPESA_PASSKEY')!+timestamp);
  const stk=await fetch(`${base}/mpesa/stkpush/v1/processrequest`,{method:'POST',headers:{Authorization:`Bearer ${access.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({BusinessShortCode:shortcode,Password:password,Timestamp:timestamp,TransactionType:'CustomerPayBillOnline',Amount:plan.amount,PartyA:phone,PartyB:shortcode,PhoneNumber:phone,CallBackURL:Deno.env.get('MPESA_CALLBACK_URL'),AccountReference:`Nestify-${body.plan}`,TransactionDesc:`Nestify ${body.plan} subscription`})}).then(r=>r.json());
  if(!stk.CheckoutRequestID)return json({error:stk.errorMessage||'STK request failed'},400);
  const{error}=await admin.from('agent_subscriptions').insert({agent_id:user.id,plan:body.plan,status:'pending',amount_kes:plan.amount,listing_limit:plan.limit,phone,mpesa_checkout_request_id:stk.CheckoutRequestID});if(error)throw error;
  return json({ok:true,checkoutRequestId:stk.CheckoutRequestID,message:'Check your phone and enter your M-Pesa PIN.'});
 }catch(error){console.error(error);return json({error:error.message||'Unexpected payment error'},500)}
});
