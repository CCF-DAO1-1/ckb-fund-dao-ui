"use client";

import Image from "next/image";
import "react-tooltip/dist/react-tooltip.css";
import Link from "next/link";
import { useTranslation } from "@/utils/i18n";

export default function Management() {
  const { t } = useTranslation();

  return (
    <div className="container management-page">
      <main>
        <div className="block_container">
          <h3>{t("managementPage.title")}</h3>
          <p>
            {t("managementPage.description")}
          </p>
          <p>
            {t("managementPage.futureDescription")}
          </p>
          <div className="team_list">
            <div className="team_item">
              <Image src="/avatar/manager-0.svg" alt="avatar" width={40} height={40} />
              <div className="name">
                <h3>zz_tovarishch</h3>
                <h4>{t("managementPage.daoManager")}</h4>
                <p>did:ckb:gmoxmkybdlp25f4serelfjsigiw2ypjr</p>
                <p>
                  X:
                  <Link href="https://x.com/c_hongzhou" target="_blank" rel="noopener noreferrer">
                    @c_hongzhou
                  </Link>
                </p>
              </div>
            </div>
            <div className="team_item">
              <Image src="/avatar/manager-1.svg" alt="avatar" width={40} height={40} />
              <div className="name">
                <h3>NightLantern</h3>
                <h4>{t("managementPage.daoManager")}</h4>
                <p>did:ckb:s6hh4xa32blzhvwg6x5hypvpohktunm7</p>
                <p>
                  X:
                  <Link href="https://x.com/nightlantern87" target="_blank" rel="noopener noreferrer">
                    @nightlantern87
                  </Link>
                </p>
              </div>
            </div>
            <div className="team_item">
              <Image src="/avatar/manager-2.svg" alt="avatar" width={40} height={40} />
              <div className="name">
                <h3>Magicsheep</h3>
                <h4>{t("managementPage.daoManager")}</h4>
                <p>did:ckb:k5it2gk4zexb5ekexcviiaqb7locsa4z</p>
                <p>
                  X:
                  <Link href="https://x.com/MagicS86643" target="_blank" rel="noopener noreferrer">
                    @MagicS86643
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="block_container">
          <h3>{t("managementPage.positionMission")}</h3>
          <p>
            {t("managementPage.positionMissionDesc")}
          </p>
          <div className="dash_line"></div>
          <h3>{t("managementPage.coreResponsibilities")}</h3>
          <p>{t("managementPage.coreResponsibilitiesDesc")}</p>
          <dl>
            <dt>{t("managementPage.proposalLifecycle")}</dt>
            <dd>
              <ul>
                <li>
                  {t("managementPage.proposalGuidance")}
                </li>
                <li>
                  {t("managementPage.communityInquiry")}
                </li>
              </ul>
            </dd>
            <dt>{t("managementPage.supervisionReporting")}</dt>
            <dd>
              <ul>
                <li>
                  {t("managementPage.milestoneVerification")}
                </li>
                <li>
                  {t("managementPage.verificationReport")}
                </li>
              </ul>
            </dd>
            <dt>{t("managementPage.transparencyCommunication")}</dt>
            <dd>
              <ul>
                <li>
                  {t("managementPage.treasuryTransparency")}
                </li>
                <li>{t("managementPage.informationReach")}</li>
              </ul>
            </dd>
          </dl>
          <div className="dash_line"></div>
          <h3>{t("managementPage.powerBoundaries")}</h3>
          <p>
            {t("managementPage.powerBoundariesDesc")}
          </p>
          <ul>
            <li>
              <strong>{t("managementPage.noDecisionRightsTitle")}</strong>
              {t("managementPage.noDecisionRightsContent")}
            </li>
            <li>
              <strong>{t("managementPage.noInterpretationRightsTitle")}</strong>
              {t("managementPage.noInterpretationRightsContent")}
            </li>
            <li>
              <strong>{t("managementPage.fundResponsibilitiesTitle")}</strong>
              {t("managementPage.fundResponsibilitiesContent")}
              <ul>
                <li>
                  {t("managementPage.budgetAllocation")}
                </li>
                <li>
                  {t("managementPage.milestonePayment")}
                </li>
              </ul>
            </li>
            <li>
              <strong>{t("managementPage.votingRightsTitle")}</strong>
              {t("managementPage.votingRightsContent")}
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
