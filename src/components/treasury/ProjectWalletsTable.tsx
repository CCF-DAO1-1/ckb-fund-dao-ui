"use client";

import { useMemo, useState } from "react";
import { AiOutlineExport } from "react-icons/ai";
import CopyButton from "@/components/ui/copy/CopyButton";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { useI18n } from "@/contexts/I18nContext";

export type ProjectWallet = {
  id: string;
  projectName: string;
  balanceCkb: number; // 以 CKB 计
  signers: string[]; // 多签人 DID
  address: string;
};

type ProjectWalletsTableProps = {
  wallets?: ProjectWallet[];
  pageSize?: number;
};

function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

function truncateMiddle(text: string, head = 12, tail = 6): string {
  if (text.length <= head + tail) return text;
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

export default function ProjectWalletsTable({
  wallets,
  pageSize = 5,
}: ProjectWalletsTableProps) {
  const { messages } = useI18n();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const data: ProjectWallet[] = useMemo(
    () =>
      wallets ?? [
        {
          id: "1",
          projectName: messages.projectWalletsTable.sampleProjectName,
          balanceCkb: 0,
          signers: [
            "did:ckb:Hanssen.xyz",
            "did:ckb:bzhouzhou.xyz",
            "did:ckb:community_obs_1.xyz",
          ],
          address: "ckb1qzda0cr08m...jhxnjffgtqvnjpckb1234567890abcdef",
        },
        {
          id: "2",
          projectName: messages.projectWalletsTable.sampleProjectName,
          balanceCkb: 4_000_000,
          signers: [
            "did:ckb:Hanssen.xyz",
            "did:ckb:bzhouzhou.xyz",
            "did:ckb:community_obs_1.xyz",
          ],
          address: "ckb1qzda0cr08m...jhxnjffgtqvnjpckb1234567890abcde2",
        },
        {
          id: "3",
          projectName: messages.projectWalletsTable.sampleProjectName,
          balanceCkb: 4_000_000,
          signers: [
            "did:ckb:Hanssen.xyz",
            "did:ckb:bzhouzhou.xyz",
            "did:ckb:community_obs_1.xyz",
          ],
          address: "ckb1qzda0cr08m...jhxnjffgtqvnjpckb1234567890abcde3",
        },
        {
          id: "4",
          projectName: messages.projectWalletsTable.sampleProjectName,
          balanceCkb: 4_000_000,
          signers: [
            "did:ckb:Hanssen.xyz",
            "did:ckb:bzhouzhou.xyz",
            "did:ckb:community_obs_1.xyz",
          ],
          address: "ckb1qzda0cr08m...jhxnjffgtqvnjpckb1234567890abcde4",
        },
        {
          id: "5",
          projectName: messages.projectWalletsTable.sampleProjectName,
          balanceCkb: 4_000_000,
          signers: [
            "did:ckb:Hanssen.xyz",
            "did:ckb:bzhouzhou.xyz",
            "did:ckb:community_obs_1.xyz",
          ],
          address: "ckb1qzda0cr08m...jhxnjffgtqvnjpckb1234567890abcde5",
        },
        {
          id: "6",
          projectName: messages.projectWalletsTable.sampleProjectName,
          balanceCkb: 4_000_000,
          signers: [
            "did:ckb:Hanssen.xyz",
            "did:ckb:bzhouzhou.xyz",
            "did:ckb:community_obs_1.xyz",
          ],
          address: "ckb1qzda0cr08m...jhxnjffgtqvnjpckb1234567890abcde6",
        },
      ],
    [wallets, messages.projectWalletsTable.sampleProjectName]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((w) =>
      [w.projectName, w.address, ...w.signers].some((t) =>
        t.toLowerCase().includes(q)
      )
    );
  }, [data, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);


  return (
    <div className="wallets_table_container">

      <div className="wallets_table_toolbar">
      <h4 className="wallets_table_h4">{messages.projectWalletsTable.title} <IoMdInformationCircleOutline data-tooltip-id="my-tooltip" data-tooltip-content={messages.projectWalletsTable.titleTooltip} /></h4>

        <input
          type="search"
          placeholder={messages.projectWalletsTable.searchPlaceholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="wallets_table">
        <div className="wallets_table_head">
          <div>{messages.projectWalletsTable.project}</div>
          <div>{messages.projectWalletsTable.currentBalance}</div>
          <div>{messages.projectWalletsTable.multisigSigners}</div>
          <div>{messages.projectWalletsTable.walletAddress}</div>
        </div>
        <div className="wallets_table_body">
          {visible.map((w) => (
            <div className="wallets_row" key={w.id}>
              <div className="cell project_name" title={w.projectName}>
                {w.projectName}
              </div>
              <div className="cell balance">{formatNumber(w.balanceCkb)}</div>
              <div className="cell signers">
                {w.signers.map((s, i) => (
                  <div key={i}>{s}</div>
                ))}
              </div>
              <div className="cell address">
                <span title={w.address}>{truncateMiddle(w.address)}</span>
                <CopyButton
                  text={w.address}
                  ariaLabel="copy-project-wallet-address"
                >
                 
                </CopyButton>
                <a
                  href="#"
                  aria-label="open-explorer-project-wallet-address"
                >
                  <AiOutlineExport />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="wallets_table_pagination">
        <button
          className="pager_button"
          disabled={currentPage === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          ‹
        </button>
        <span className="page_info">
          {currentPage} / {totalPages}
        </span>
        <button
          className="pager_button"
          disabled={currentPage === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          ›
        </button>
      </div>
    </div>
  );
}


