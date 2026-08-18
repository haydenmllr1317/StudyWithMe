"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createManualSessionAction, saveReflectionAction, type SessionActionState } from "@/app/session-actions";
import { Button } from "@/components/ui/button";
import { prepareImage } from "@/lib/image-upload";
import { createClient } from "@/lib/supabase/client";
import type { GroupSummary } from "@/lib/groups";

type Option={id:string;name:string};
const idle:SessionActionState={status:"idle"};

export function ManualSessionForm({goals,circles,defaultDate,defaultTime}:{goals:Option[];circles:GroupSummary[];defaultDate:string;defaultTime:string}){
  const router=useRouter(); const formRef=useRef<HTMLFormElement>(null);
  const [pending,setPending]=useState(false); const [state,setState]=useState<SessionActionState>(idle); const [rating,setRating]=useState<number|null>(null);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault(); setPending(true); setState(idle);
    const formData=new FormData(event.currentTarget); const file=formData.get("photo"); formData.delete("photo");
    const created=await createManualSessionAction(idle,formData);
    if(created.status==="error"||!created.session){setState(created);setPending(false);return;}
    let message=created.message;
    if(file instanceof File&&file.size>0){
      try{
        const prepared=await prepareImage(file,{maxBytes:25*1024*1024,maxDimension:1600});
        if(prepared.size>5*1024*1024)throw new Error("The prepared photo is still too large.");
        const supabase=createClient(); const user=await supabase.auth.getUser();
        if(user.error||!user.data.user)throw new Error("Sign in again before adding a photo.");
        const path=`${user.data.user.id}/${created.session.id}/reflection-${crypto.randomUUID()}.webp`;
        const upload=await supabase.storage.from("reflection-photos").upload(path,prepared,{cacheControl:"31536000",contentType:"image/webp",upsert:false});
        if(upload.error)throw new Error("The session was saved, but its photo could not be uploaded.");
        const reflection=new FormData(); reflection.set("sessionId",created.session.id); reflection.set("notes",String(formData.get("notes")??"")); reflection.set("rating",String(formData.get("rating")??"")); reflection.set("reflectionPhotoPath",path); reflection.set("activityCircleId",String(formData.get("activityCircleId")??""));
        const updated=await saveReflectionAction(idle,reflection);
        if(updated.status==="error"){await supabase.storage.from("reflection-photos").remove([path]);throw new Error("The session was saved, but its photo could not be attached.");}
      }catch(error){message=error instanceof Error?error.message:"The session was saved without its photo.";}
    }
    setState({status:"success",message}); setPending(false); formRef.current?.reset(); setRating(null); router.refresh();
  }
  return <details className="mt-6 border-b border-line pb-6"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink marker:content-none"><span>Log a past study session</span><span aria-hidden="true" className="text-lg font-normal text-muted">＋</span></summary><form className="mt-5" onSubmit={submit} ref={formRef}><div className="grid gap-5 sm:grid-cols-3"><label className="text-sm font-semibold text-ink">Date<input className="field mt-2" defaultValue={defaultDate} max={defaultDate} name="date" required type="date"/></label><label className="text-sm font-semibold text-ink">Start time<input className="field mt-2" defaultValue={defaultTime} name="startTime" required type="time"/></label><label className="text-sm font-semibold text-ink">Duration (minutes)<input className="field mt-2" inputMode="numeric" max={1440} min={1} name="durationMinutes" placeholder="60" required type="number"/></label></div><div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-ink">Study goal<select className="field mt-2" name="goalId" required>{goals.map(goal=><option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></label><label className="text-sm font-semibold text-ink">Visibility<select className="field mt-2" name="activityCircleId"><option value="">Only Me</option>{circles.map(circle=><option key={circle.id} value={circle.id}>{circle.name}</option>)}</select></label></div><fieldset className="mt-5"><legend className="text-sm font-semibold text-ink">Session rating <span className="font-normal text-muted">(optional)</span></legend><input name="rating" type="hidden" value={rating??""}/><div className="mt-2 flex flex-wrap gap-2">{[1,2,3,4,5].map(value=><button aria-label={`Rate this session ${value} out of 5`} aria-pressed={rating===value} className={`grid size-11 place-items-center rounded-full border text-sm font-semibold ${rating===value?"border-ink bg-ink text-white":"border-line bg-white text-muted"}`} key={value} onClick={()=>setRating(value)} type="button">{value}</button>)}</div></fieldset><label className="mt-5 block text-sm font-semibold text-ink">Notes <span className="font-normal text-muted">(optional)</span><textarea className="field mt-2 min-h-24 resize-y" maxLength={5000} name="notes" placeholder="What did you work on?"/></label><label className="mt-5 block text-sm font-semibold text-ink">Photo <span className="font-normal text-muted">(optional)</span><input accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" className="field mt-2 file:mr-3 file:border-0 file:bg-transparent file:font-semibold" name="photo" type="file"/></label><p className="mt-4 text-xs leading-5 text-muted">The date and time use your profile timezone. This session will count in that historical day’s totals.</p><div className="mt-5"><Button disabled={pending} type="submit">{pending?"Saving…":"Add Past Session"}</Button></div>{state.message&&<p aria-live="polite" className={`mt-3 text-sm ${state.status==="error"?"text-coral-dark":"text-moss-dark"}`}>{state.message}</p>}</form></details>;
}
