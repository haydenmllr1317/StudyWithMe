import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return new NextResponse(null,{status:404});
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") return new NextResponse(null,{status:401});
  const visible = await supabase.rpc("get_visible_reflection_photo",{p_session_id:sessionId});
  if (visible.error || !visible.data) return new NextResponse(null,{status:404});
  const downloaded = await supabase.storage.from("reflection-photos").download(visible.data);
  if (downloaded.error) return new NextResponse(null,{status:404});
  return new NextResponse(downloaded.data,{headers:{"Content-Type":downloaded.data.type||"image/webp","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
