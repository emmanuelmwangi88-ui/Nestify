// Public review submission with a one-time invitation token.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, apikey'};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,'Content-Type':'application/json'}});
const hash=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))).map(x=>x.toString(16).padStart(2,'0')).join('');
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const body=await req.json();if(!body.token||!body.reviewer_name||!body.body||body.rating<1||body.rating>5)return json({error:'Complete all review fields.'},400);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);const tokenHash=await hash(body.token);
  const{data:invite}=await admin.from('review_invitations').select('*').eq('token_hash',tokenHash).is('used_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
  if(!invite)return json({error:'This review invitation is invalid or expired.'},403);
  const{error}=await admin.from('property_reviews').insert({property_id:invite.property_id,invitation_id:invite.id,reviewer_name:body.reviewer_name,rating:Number(body.rating),title:body.title||null,body:body.body});if(error)throw error;
  await admin.from('review_invitations').update({used_at:new Date().toISOString()}).eq('id',invite.id);return json({ok:true});
 }catch(error){return json({error:error.message||'Review could not be submitted.'},500)}
});
