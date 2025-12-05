"use client";

import ManagementCenter from "@/components/treasury/ManagementCenter";
import "@/styles/management.css";
import "@/styles/task-modal.css";
import "@/styles/quill-editor.css";

export default function ManagementCenterPage() {
  return (
    <div className="container">
      <main>
        <ManagementCenter />
      </main>
    </div>
  );
}
