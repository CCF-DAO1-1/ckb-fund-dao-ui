"use client";

import { useEffect, useState, useCallback } from "react";
import { AiOutlineExport } from "react-icons/ai";
import CopyButton from "@/components/ui/copy/CopyButton";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { useI18n } from "@/contexts/I18nContext";
import { getReceiverAddrList, ReceiverAddrItem } from "@/server/proposal";
import { logger } from "@/lib/logger";
import { getAddressBalance } from "@/utils/ckbUtils";
import Link from "next/link";
import { postUriToHref } from "@/lib/postUriHref";

export type ProjectWallet = {
  id: string; // address as id
  projectName: string;
  balanceCkb: number; // 以 CKB 计
  signers: string[]; // 多签人 DID
  address: string;
  uri?: string;
};

type ProjectWalletsTableProps = {
  pageSize?: number;
};

function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

function truncateMiddle(text: string, head = 20, tail = 20): string {
  if (!text || text.length <= head + tail) return text || "";
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

export default function ProjectWalletsTable({
  pageSize = 5,
}: ProjectWalletsTableProps) {
  const { messages, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // Data state
  const [wallets, setWallets] = useState<ProjectWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getReceiverAddrList({
        page,
        per_page: pageSize,
        q: query || undefined,
      });

      if (response && response.rows) {
        const mappedWallets: ProjectWallet[] = response.rows.map((item: ReceiverAddrItem) => ({
          id: item.receiver_addr,
          projectName: item.record?.data?.title || 'Unknown Project',
          balanceCkb: 0, // Placeholder
          signers: [], // Still placeholder
          address: item.receiver_addr,
          uri: item.uri,
        }));

        setWallets(mappedWallets); // Render immediately
        setTotal(response.total);

        // Fetch balances asynchronously
        Promise.all(mappedWallets.map(async (wallet) => {
          try {
            const balance = await getAddressBalance(wallet.address);
            return { id: wallet.id, balance };
          } catch (e) {
            console.error(`Failed to fetch balance for ${wallet.address}`, e);
            return { id: wallet.id, balance: 0 };
          }
        })).then(results => {
          setWallets(prevWallets => prevWallets.map(w => {
            const res = results.find(r => r.id === w.id);
            return res ? { ...w, balanceCkb: res.balance } : w;
          }));
        });

      } else {
        setWallets([]);
        setTotal(0);
      }
    } catch (error) {
      logger.error("Failed to fetch receiver address list", error);
      setWallets([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, query]);

  // Debounce query change or fetch immediately on page change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="wallets_table_container">

      <div className="wallets_table_toolbar">
        <h4 className="wallets_table_h4">{messages.projectWalletsTable.title} <IoMdInformationCircleOutline data-tooltip-id="my-tooltip" data-tooltip-content={messages.projectWalletsTable.titleTooltip} /></h4>

        {/* <input
          type="search"
          placeholder={messages.projectWalletsTable.searchPlaceholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1); // Reset to first page on search
          }}
        /> */}
      </div>
      <div className="wallets_table">
        <div className="wallets_table_head">
          <div>{messages.projectWalletsTable.project}</div>
          <div style={{ textAlign: 'right' }}>{messages.projectWalletsTable.currentBalance}</div>
          <div>{messages.projectWalletsTable.walletAddress}</div>
        </div>
        <div className="wallets_table_body">
          {loading ? (
            <div className="wallets_row" style={{ justifyContent: 'center', padding: '20px' }}>
              {messages.wallet?.loading || "Loading..."}
            </div>
          ) : wallets.length === 0 ? (
            <div className="wallets_row" style={{ justifyContent: 'center', padding: '20px' }}>
              {messages.management?.noData || "No data"}
            </div>
          ) : (
            wallets.map((w) => (
              <div className="wallets_row" key={w.id}>
                <div className="cell project_name" title={w.projectName}>
                  {w.uri ? (
                    <Link href={`/${locale}/proposal/${postUriToHref(w.uri)}`} className="hover:text-primary hover:underline">
                      {w.projectName}
                    </Link>
                  ) : (
                    w.projectName
                  )}
                </div>
                <div className="cell balance" style={{ textAlign: 'right', justifyContent: 'flex-end' }}>{formatNumber(w.balanceCkb)}</div>

                <div className="cell address">
                  <span title={w.address}>{truncateMiddle(w.address)}</span>
                  <CopyButton
                    text={w.address}
                    ariaLabel="copy-project-wallet-address"
                    className="icon_button"
                  >

                  </CopyButton>
                  <a
                    href={w.address.startsWith('ckt')
                      ? `https://testnet.explorer.nervos.org/address/${w.address}`
                      : `https://explorer.nervos.org/address/${w.address}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="open-explorer-project-wallet-address"
                    className="copy-button-reset icon_button"
                  >
                    <AiOutlineExport />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {totalPages > 1 && (
        <div className="wallets_table_pagination">
          <button
            className="pager_button"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ‹
          </button>
          <span className="page_info">
            {page} / {totalPages}
          </span>
          <button
            className="pager_button"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}


