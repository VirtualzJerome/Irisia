"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DecisionAdmin({ utilisateurId }) {
  const router = useRouter();
  const [occupe, setOccupe] = useState(false);

  async function decider(decision) {
    setOccupe(true);
    await fetch("/api/admin/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ utilisateurId, decision }),
    });
    router.refresh();
  }

  return (
    <div className="admin-actions">
      <button className="bouton" onClick={() => decider("VERIFIE")} disabled={occupe}>
        ✓ Vérifier
      </button>
      <button className="bouton refus" onClick={() => decider("REFUSE")} disabled={occupe}>
        ✕ Refuser
      </button>
    </div>
  );
}
