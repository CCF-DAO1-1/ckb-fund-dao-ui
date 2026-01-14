"use client";

import { useTranslation } from "../../../utils/i18n";
import { useI18n } from "@/contexts/I18nContext";
import "react-tooltip/dist/react-tooltip.css";
import Link from "next/link";
import { AiOutlineExport } from "react-icons/ai";
import CopyButton from "@/components/ui/copy/CopyButton";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

import ProjectWalletsTable from "@/components/treasury/ProjectWalletsTable";

// 截取地址：显示前5后5
function truncateAddress(address: string, head = 7, tail = 7): string {
  if (!address || address.length <= head + tail) return address;
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

export default function Treasury() {
  useTranslation();
  const { messages } = useI18n();
  const address = "ckb1qpw9q60tppt7l3j7r09qcp7lxnp3vcanvgha8pmvsa3jplykxn32sqf352eynr4y9zl66sdxjcef3a6z9uqhkncsaanyg";

  // 检测是否为移动端
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 根据设备类型显示不同格式的地址
  const displayAddress = isMobile ? truncateAddress(address) : address;

  // 动态加载图表以避免 SSR 问题
  const TotalAssetsChart = dynamic(() => import("../../../components/ui/TotalAssetsChart"), {
    ssr: false,
  });


  return (
    <div className="container">
      <main>
        <div className="block_container">
          <h3>{messages.treasuryPage.treasuryInfo}</h3>
          <div className="treasury_wallet">
            <div className="treasury_wallet_address">
              <label>{messages.treasuryPage.mainTreasuryAddress}</label>
              <p title={address}>{displayAddress}</p>
            </div>

            <CopyButton
              className="button-copy"
              text={address}
              ariaLabel="copy-treasury-address"
              title={address}
            >

            </CopyButton>
            <Link href="https://explorer.nervos.org/address/ckb1qpw9q60tppt7l3j7r09qcp7lxnp3vcanvgha8pmvsa3jplykxn32sqf352eynr4y9zl66sdxjcef3a6z9uqhkncsaanyg" target="_blank" aria-label="export-treasury-address">
              <AiOutlineExport />
            </Link>
          </div>
          {/* <div className="dash_line"></div>
          <h4>{messages.treasuryPage.multisigSigners}</h4>
          <ol className="treasury_list">
            <li>
              <span className="treasury_list_did">did::ckb:Daniel.xyz</span>
              <span>ckb1qyqwtz3x2z7g8g7q2hdasmm5m4enr0v40s8k0q8x2v</span>
              <CopyButton text={"ckb1qyqwtz3x2z7g8g7q2hdasmm5m4enr0v40s8k0q8x2v"} ariaLabel="copy-treasury-address">
              </CopyButton>
              <Link href="#" aria-label="export-treasury-address">
                <AiOutlineExport />
              </Link>
            </li>
            <li>
              <span className="treasury_list_did">did::ckb:Daniel.xyz</span>
              <span>ckb1qyqwtz3x2z7g8g7q2hdasmm5m4enr0v40s8k0q8x2v</span>
              <CopyButton text={"ckb1qyqwtz3x2z7g8g7q2hdasmm5m4enr0v40s8k0q8x2v"} ariaLabel="copy-treasury-address">
              </CopyButton>
              <Link href="#" aria-label="export-treasury-address">
                <AiOutlineExport />
              </Link>
            </li>
            <li>
              <span className="treasury_list_did">did::ckb:Daniel.xyz</span>
              <span>ckb1qyqwtz3x2z7g8g7q2hdasmm5m4enr0v40s8k0q8x2v</span>
              <CopyButton text={"ckb1qyqwtz3x2z7g8g7q2hdasmm5m4enr0v40s8k0q8x2v"} ariaLabel="copy-treasury-address">
              </CopyButton>
              <Link href="#" aria-label="export-treasury-address">
                <AiOutlineExport />
              </Link>
            </li>
          </ol> */}
        </div>
        <div className="block_container">
          <h3>{messages.treasuryPage.treasuryAssets}</h3>
          <div className="treasury_assets">
            <div className="small_block">
              <h4>{messages.treasuryPage.totalAssets}</h4>
              <p>276,000,000</p>
            </div>
            <div className="small_block">
              <h4>{messages.treasuryPage.allocatedFunds}</h4>
              <p>31513537.57951078</p>
            </div>
            <div className="small_block">
              <h4>{messages.treasuryPage.availableFunds}</h4>
              <p>244,486,462.42048922</p>
            </div>
          </div>
          <h4>{messages.treasuryPage.totalAssetsStatistics}</h4>
          <TotalAssetsChart height={320} />
        </div>
        <div className="block_container">
          <ProjectWalletsTable />
        </div>
      </main>

    </div>
  );
}
