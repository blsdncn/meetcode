import { Suspense } from "react";
import VideoChatClient from "./VideoChatClient";
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VideoChatClient />
    </Suspense>
  );
}
