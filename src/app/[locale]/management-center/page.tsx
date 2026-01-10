"use client";

import ManagementCenter from "@/components/treasury/ManagementCenter";
import "@/components/treasury/management.css";
import "@/components/treasury/task-modal.css";

export default function ManagementCenterPage() {
  return (
    <div className="container">
      <main>
        <ManagementCenter />
      </main>
    </div>
  );
}
