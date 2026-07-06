"use client";
import { useRouter } from "next/navigation";

export default function BoutonDeconnexion() {
  const router = useRouter();
  async function deconnecter() {
    await fetch("/api/deconnexion", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button className="lien-discret" onClick={deconnecter} type="button">
      Se déconnecter
    </button>
  );
}
