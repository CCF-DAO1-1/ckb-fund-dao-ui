import { IoMdInformationCircleOutline } from "react-icons/io";
import useUserInfoStore from "@/store/userInfo";
import { useI18n } from "@/contexts/I18nContext";
import { useTranslation } from "@/utils/i18n";
import { useVoteWeight } from "@/hooks/useVoteWeight";
import { AiOutlineExport } from "react-icons/ai";
import "./UserCenter.css";

export default function UserGovernance() {
  const { userInfo } = useUserInfoStore();
  const { messages } = useI18n();
  const { t } = useTranslation();
  const { voteWeight, isLoading: isLoadingVoteWeight, formatVoteWeight } = useVoteWeight();
  const did = userInfo?.did || messages.userGovernance.notLoggedIn;
  return (
    <section className="my_governance">
      <h3>{messages.userGovernance.title}</h3>
      <div className="wallet_info">
        <h4>{messages.userGovernance.walletAddressDid}</h4>
        <p className="did_address">{did}</p>
      </div>
      <div className="voting_rights">
        <h4>
          {t("wallet.myVotingPower")} <IoMdInformationCircleOutline data-tooltip-id="my-tooltip" data-tooltip-content={t("wallet.votingPowerExplanation")} />
        </h4>
        <h5 className="rights_amount">
          {isLoadingVoteWeight ? t("wallet.loading") : formatVoteWeight(voteWeight)} CKB
        </h5>
      </div>
      <a
        href="https://www.nervdao.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="action-button stake-button"
      >

        {t("wallet.stakeCKB")}
        <AiOutlineExport />

      </a>
      {/* <button className="stake_button">
        {t("wallet.stakeCKB")}
        &nbsp;&nbsp;<AiOutlineExport />

      </button> */}
      {/* <div className="pending_section">
        <h4>{messages.userGovernance.pending}</h4>
        <div className="pending_item">
          <p className="pending_title">{messages.userGovernance.ckbUtxoGameEngine}</p>
          <Tag status={2} size="sm" />
        </div>
      </div> */}
    </section>
  );
}


