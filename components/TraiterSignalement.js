"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TraiterSignalement({ id, cibleId, cibleBannie }) {
  const router = useRouter();
  const [occupe, setOccupe] = useState(false);

  async function agir(action) {
    setOccupe(true);
    await fetch("/api/admin/signalements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, cibleId }),
    });
    router.refresh();
  }

  return (
    <div className="admin-actions" style={{ marginTop: "12px" }}>
      {!cibleBannie && (
        <button className="bouton refus" onClick={() => agir("bannir")} disabled={occupe}>
          🔨 Bannir ce membre
        </button>
      )}
      <button className="lien-discret" onClick={() => agir("traiter")} disabled={occupe}>
        Marquer traité{cibleBannie ? "" : " sans bannir"}
      </button>
    </div>
  );
}
