"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finishSessionAction, saveReflectionAction, type SessionActionState } from "@/app/session-actions";
import { Button } from "@/components/ui/button";
import { prepareImage } from "@/lib/image-upload";
import { createClient } from "@/lib/supabase/client";
import type { GroupSummary } from "@/lib/groups";

export function ReflectionForm({ sessionId, initialNotes = "", initialRating = null, initialPhotoPath = null, initialPhotoUrl = null, finishBeforeSave = false, circles = [], showAudience = false, onSaved }: {
  sessionId: string;
  initialNotes?: string;
  initialRating?: number | null;
  initialShared?: boolean;
  initialPhotoPath?: string | null;
  initialPhotoUrl?: string | null;
  finishBeforeSave?: boolean;
  circles?: GroupSummary[];
  showAudience?: boolean;
  onSaved?: (session: NonNullable<SessionActionState["session"]>) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [photoPath, setPhotoPath] = useState(initialPhotoPath);
  const [savedPhotoUrl, setSavedPhotoUrl] = useState(initialPhotoUrl);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<SessionActionState>({ status: "idle" });
  const [rating, setRating] = useState<number | null>(initialRating);
  const [circleId, setCircleId] = useState("");

  const filePreview = useMemo(()=>file?URL.createObjectURL(file):null,[file]);
  useEffect(()=>()=>{if(filePreview)URL.revokeObjectURL(filePreview)},[filePreview]);
  const preview = filePreview ?? savedPhotoUrl;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({ status: "idle" });
    let uploadedPath: string | null = null;
    const supabase = createClient();
    try {
      const formData = new FormData(event.currentTarget);
      if (finishBeforeSave) {
        const finished = await finishSessionAction({ status: "idle" }, formData);
        if (finished.status === "error") {
          setState(finished);
          return;
        }
      }
      let nextPath = removePhoto ? null : photoPath;
      if (file) {
        const prepared = await prepareImage(file, { maxBytes: 25 * 1024 * 1024, maxDimension: 1600 });
        if (prepared.size > 5 * 1024 * 1024) throw new Error("The prepared photo is still too large. Choose a simpler or smaller image.");
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw new Error("Log in again to save this reflection.");
        uploadedPath = `${userData.user.id}/${sessionId}/reflection-${crypto.randomUUID()}.webp`;
        const upload = await supabase.storage.from("reflection-photos").upload(uploadedPath, prepared, { cacheControl: "31536000", contentType: "image/webp", upsert: false });
        if (upload.error) throw new Error("The reflection photo could not be uploaded. Check your connection and try again.");
        nextPath = uploadedPath;
      }
      formData.set("reflectionPhotoPath", nextPath ?? "");
      const result = await saveReflectionAction({ status: "idle" }, formData);
      if (result.status === "error") {
        if (uploadedPath) await supabase.storage.from("reflection-photos").remove([uploadedPath]);
        setState(result);
        return;
      }
      if (photoPath && photoPath !== nextPath) await supabase.storage.from("reflection-photos").remove([photoPath]);
      setPhotoPath(nextPath);
      setSavedPhotoUrl(nextPath ? `/activity/photo/${sessionId}?v=${encodeURIComponent(nextPath)}` : null);
      setFile(null);
      setRemovePhoto(false);
      setState(result);
      if (result.session) onSaved?.(result.session);
      router.refresh();
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("reflection-photos").remove([uploadedPath]);
      setState({ status: "error", message: error instanceof Error ? error.message : "The reflection could not be saved." });
    } finally {
      setPending(false);
      if (input.current) input.current.value = "";
    }
  }

  return <form className="mt-6" onSubmit={submit}>
    <input name="sessionId" type="hidden" value={sessionId} />
    <fieldset><legend className="text-sm font-semibold text-ink">How did it feel? <span className="font-normal text-muted">(optional)</span></legend><input name="rating" type="hidden" value={rating??""}/><div className="mt-2 flex flex-wrap items-center gap-2">{[1,2,3,4,5].map((value)=><button aria-label={`Rate this session ${value} out of 5`} aria-pressed={rating===value} className={`grid size-11 place-items-center rounded-full border text-sm font-semibold ${rating===value?"border-ink bg-ink text-white":"border-line bg-white text-muted hover:border-muted"}`} key={value} onClick={()=>setRating(value)} type="button">{value}</button>)}{rating!==null&&<button className="min-h-11 px-2 text-xs text-muted underline underline-offset-4" onClick={()=>setRating(null)} type="button">Clear</button>}</div></fieldset>
    <label className="mt-5 block text-sm font-semibold text-ink">Reflection <span className="font-normal text-muted">(optional)</span><textarea className="field mt-2 min-h-28 resize-y" defaultValue={initialNotes} maxLength={5000} name="notes" placeholder="What clicked? What will you return to?" /></label>
    <div className="mt-5"><span className="text-sm font-semibold text-ink">Photo <span className="font-normal text-muted">(optional)</span></span>{preview && !removePhoto && <img alt="Reflection preview" className="mt-3 max-h-64 w-full max-w-lg rounded-field object-cover" src={preview}/>}<div className="mt-3 flex flex-wrap gap-4"><button className="min-h-11 text-sm font-semibold text-coral underline underline-offset-4" onClick={()=>input.current?.click()} type="button">{preview && !removePhoto ? "Change photo" : "Add photo"}</button>{preview && !removePhoto && <button className="min-h-11 text-sm text-muted underline underline-offset-4" onClick={()=>{setRemovePhoto(true);setFile(null)}} type="button">Remove photo</button>}</div><input accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" className="sr-only" onChange={(event)=>{const next=event.target.files?.[0]??null;setFile(next);setRemovePhoto(false)}} ref={input} type="file"/></div>
    {showAudience ? <fieldset className="mt-6 border-t border-line pt-5"><legend className="text-sm font-semibold text-ink">Who can see this activity?</legend><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className={`flex min-h-11 cursor-pointer items-center rounded-field border px-3 text-sm font-semibold ${circleId===''?'border-moss bg-moss-soft text-moss-dark':'border-line bg-white text-muted'}`}><input checked={circleId===''} className="sr-only" name="activityCircleId" onChange={()=>setCircleId('')} type="radio" value=""/>Only Me</label>{circles.map(circle=><label className={`flex min-h-11 cursor-pointer items-center rounded-field border px-3 text-sm font-semibold ${circleId===circle.id?'border-moss bg-moss-soft text-moss-dark':'border-line bg-white text-muted'}`} key={circle.id}><input checked={circleId===circle.id} className="sr-only" name="activityCircleId" onChange={()=>setCircleId(circle.id)} type="radio" value={circle.id}/>{circle.name}</label>)}</div>{!circles.length&&<p className="mt-3 text-sm text-muted">Join or create a Circle to share this session. It will stay visible only to you.</p>}<p className="mt-3 text-xs leading-5 text-muted">A session can be private or shared with one Circle.</p></fieldset> : null}
    <div className="mt-6"><Button disabled={pending} type="submit">{pending ? "Finishing…" : finishBeforeSave ? "Finish Session" : "Save reflection"}</Button></div>
    {state.message && <p aria-live="polite" className={`mt-3 text-sm ${state.status==="error"?"text-coral-dark":"text-moss-dark"}`}>{state.message}</p>}
  </form>;
}
